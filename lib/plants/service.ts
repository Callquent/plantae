import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { isIsoDate, newestFirst, nowISO, pastOrToday, todayISO } from "@/lib/dates";
import { prisma, ready } from "@/lib/db/client";
import { withLock } from "@/lib/lock";
import { cleanNote } from "@/lib/photo-constants";
import { removePhotoFile, savePhotos } from "@/lib/uploads";
import { nextWateringISO } from "./status";
import { parseHealth, parseLight, type Plant, type PlantInput, type PlantPhoto } from "./types";

const CLIENT_ID = /^[A-Za-z0-9-]{8,64}$/;

const lock = <A extends unknown[], R>(task: (...args: A) => Promise<R>) => withLock("plants", task);

/** Historique propre : dates valides, sans doublon, du plus récent au plus ancien. */
function normalizeHistory(dates: string[]): string[] {
  return [...new Set(dates.filter(isIsoDate))].sort().reverse();
}

type PlantRow = Prisma.PlantGetPayload<{ include: { photos: true; waterings: true } }>;
const WITH_CHILDREN = {
  photos: { orderBy: { position: "asc" } },
  waterings: true,
} satisfies Prisma.PlantInclude;

function fromRow(r: PlantRow): Plant {
  return {
    id: r.id,
    name: r.name,
    species: r.species,
    location: r.location,
    light: parseLight(r.light),
    wateringEveryDays: r.wateringEveryDays,
    lastWatered: r.lastWatered,
    waterings: normalizeHistory(r.waterings.map((w) => w.date)),
    photos: newestFirst(
      r.photos.map((ph) => ({
        id: ph.id,
        file: ph.file,
        date: ph.date,
        health: parseHealth(ph.health),
        note: ph.note,
        clientId: ph.clientId ?? undefined,
      })),
    ),
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt ?? undefined,
  };
}

/** Écrit une fiche entière (champs, photos, arrosages) : tout ou rien. */
async function savePlant(tx: Prisma.TransactionClient, p: Plant) {
  const data = {
    name: p.name,
    species: p.species,
    location: p.location,
    light: p.light,
    wateringEveryDays: p.wateringEveryDays,
    lastWatered: p.lastWatered,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt ?? null,
  };
  await tx.plant.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: data });
  await tx.photo.deleteMany({ where: { plantId: p.id } });
  await tx.watering.deleteMany({ where: { plantId: p.id } });
  if (p.photos.length > 0) {
    await tx.photo.createMany({
      data: p.photos.map((ph, position) => ({
        id: ph.id,
        plantId: p.id,
        position,
        file: ph.file,
        date: ph.date,
        health: ph.health ?? null,
        note: ph.note,
        clientId: ph.clientId ?? null,
      })),
    });
  }
  const dates = [...new Set(p.waterings)];
  if (dates.length > 0) await tx.watering.createMany({ data: dates.map((date) => ({ plantId: p.id, date })) });
}

async function saveOne(plant: Plant) {
  await ready;
  await prisma.$transaction((tx) => savePlant(tx, plant));
}

/** Les plantes vivantes (non supprimées), les plus urgentes à arroser d'abord. */
export async function listPlants(): Promise<Plant[]> {
  await ready;
  const rows = await prisma.plant.findMany({ where: { deletedAt: null }, include: WITH_CHILDREN });
  return rows.map(fromRow).sort((a, b) => nextWateringISO(a).localeCompare(nextWateringISO(b)));
}

/** Une fiche vivante (non supprimée), ou undefined. */
export async function getPlant(id: string): Promise<Plant | undefined> {
  await ready;
  const row = await prisma.plant.findFirst({ where: { id, deletedAt: null }, include: WITH_CHILDREN });
  return row ? fromRow(row) : undefined;
}

export const createPlant = lock(async (input: PlantInput, photoFiles: string[] = []): Promise<Plant> => {
  const at = nowISO();
  const plant: Plant = {
    ...input,
    waterings: [input.lastWatered],
    photos: photoFiles.map((file) => ({ id: randomUUID(), file, date: todayISO(), note: "" })),
    id: randomUUID(),
    createdAt: at,
    updatedAt: at,
  };
  await saveOne(plant);
  return plant;
});

export const updatePlant = lock(async (id: string, input: PlantInput): Promise<void> => {
  const current = await getPlant(id);
  if (!current) return;
  // Une date saisie dans le formulaire rejoint l'historique ; le dernier arrosage reste le plus récent.
  const waterings = normalizeHistory([...current.waterings, input.lastWatered]);
  await saveOne({ ...current, ...input, waterings, lastWatered: waterings[0], updatedAt: nowISO() });
});

export const deletePlant = lock(async (id: string): Promise<void> => {
  const current = await getPlant(id);
  if (!current) return;
  const at = nowISO();
  for (const ph of current.photos) await removePhotoFile(ph.file);
  // On garde un « tombeau » : la fiche reste en base, marquée supprimée, mais n'apparaît plus.
  await saveOne({ ...current, photos: [], waterings: [], deletedAt: at, updatedAt: at });
});

/** Ajoute des photos au journal d'une plante. Renvoie le nombre de photos réellement enregistrées. */
export const addPhotos = lock(
  async (id: string, files: File[], meta: { date?: string; health?: string; note?: string }): Promise<number> => {
    const plant = await getPlant(id);
    if (!plant) return 0;
    const date = pastOrToday(meta.date);
    const health = parseHealth(meta.health);
    const note = cleanNote(meta.note);
    const names = await savePhotos(files);
    const entries: PlantPhoto[] = names.map((file) => ({ id: randomUUID(), file, date, health, note }));
    plant.photos = newestFirst([...entries, ...plant.photos]);
    plant.updatedAt = nowISO();
    await saveOne(plant);
    return entries.length;
  },
);

export const removePhoto = lock(async (id: string, photoId: string): Promise<void> => {
  const plant = await getPlant(id);
  const photo = plant?.photos.find((ph) => ph.id === photoId);
  if (!plant || !photo) return;
  plant.photos = plant.photos.filter((ph) => ph.id !== photoId);
  plant.updatedAt = nowISO();
  await saveOne(plant);
  await removePhotoFile(photo.file);
});

/** Modifie l'état de santé et l'observation d'une photo du journal (la date de prise de vue reste inchangée). */
export const updatePhoto = lock(
  async (id: string, photoId: string, meta: { health?: string; note?: string }): Promise<void> => {
    const plant = await getPlant(id);
    const photo = plant?.photos.find((ph) => ph.id === photoId);
    if (!plant || !photo) return;
    photo.health = parseHealth(meta.health);
    photo.note = cleanNote(meta.note);
    plant.updatedAt = nowISO();
    await saveOne(plant);
  },
);

/** Ajoute un arrosage à l'historique (aujourd'hui par défaut). Ignore les dates invalides ou futures. */
export const addWatering = lock(async (id: string, date: string = todayISO()): Promise<void> => {
  if (!isIsoDate(date) || date > todayISO()) return;
  const plant = await getPlant(id);
  if (!plant) return;
  plant.waterings = normalizeHistory([...plant.waterings, date]);
  plant.lastWatered = plant.waterings[0];
  plant.updatedAt = nowISO();
  await saveOne(plant);
});

export const removeWatering = lock(async (id: string, date: string): Promise<void> => {
  const plant = await getPlant(id);
  if (!plant) return;
  plant.waterings = plant.waterings.filter((d) => d !== date);
  // Sans historique, on repart de la date d'ajout de la plante.
  plant.lastWatered = plant.waterings[0] ?? plant.createdAt.slice(0, 10);
  plant.updatedAt = nowISO();
  await saveOne(plant);
});

export const markWatered = (id: string) => addWatering(id, todayISO());

export type DevicePhotoResult = "saved" | "duplicate" | "invalid" | "not-found";

/**
 * Photo envoyée par le téléphone. Si `clientId` est déjà connu pour cette plante (renvoi après une
 * réponse perdue), la photo n'est pas enregistrée une seconde fois : résultat « duplicate ».
 */
export const addDevicePhoto = lock(
  async (
    id: string,
    file: File,
    meta: { clientId?: string; date?: string; health?: string; note?: string },
  ): Promise<DevicePhotoResult> => {
    const plant = await getPlant(id);
    if (!plant) return "not-found";
    const clientId = meta.clientId && CLIENT_ID.test(meta.clientId) ? meta.clientId : undefined;
    if (clientId && plant.photos.some((ph) => ph.clientId === clientId)) return "duplicate";
    const [name] = await savePhotos([file]);
    if (!name) return "invalid";
    const entry: PlantPhoto = {
      id: randomUUID(),
      file: name,
      date: pastOrToday(meta.date),
      health: parseHealth(meta.health),
      note: cleanNote(meta.note),
      clientId,
    };
    plant.photos = newestFirst([entry, ...plant.photos]);
    plant.updatedAt = nowISO();
    await saveOne(plant);
    return "saved";
  },
);
