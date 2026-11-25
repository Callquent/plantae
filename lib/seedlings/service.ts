import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { descending, isIsoDate, newestFirst, nowISO, pastOrToday, todayISO } from "@/lib/dates";
import { prisma, ready } from "@/lib/db/client";
import { withLock } from "@/lib/lock";
import { cleanNote } from "@/lib/photo-constants";
import { createPlant } from "@/lib/plants/service";
import { removePhotoFile, savePhotos } from "@/lib/uploads";
import { parseStatus, type Seedling, type SeedlingInput, type SeedlingPhoto } from "./types";

const lock = <A extends unknown[], R>(task: (...args: A) => Promise<R>) => withLock("seedlings", task);

type SeedlingRow = Prisma.SeedlingGetPayload<{ include: { photos: true } }>;
const WITH_PHOTOS = { photos: { orderBy: { position: "asc" } } } satisfies Prisma.SeedlingInclude;

function fromRow(r: SeedlingRow): Seedling {
  return {
    id: r.id,
    name: r.name,
    species: r.species,
    sownOn: r.sownOn,
    quantity: r.quantity,
    germinationDays: r.germinationDays,
    location: r.location,
    notes: r.notes,
    status: parseStatus(r.status),
    germinatedOn: r.germinatedOn ?? undefined,
    germinatedCount: r.germinatedCount ?? undefined,
    plantId: r.plantId ?? undefined,
    photos: newestFirst(r.photos.map((p) => ({ id: p.id, file: p.file, date: p.date, note: p.note }))),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    deletedAt: r.deletedAt ?? undefined,
  };
}

/** Champs à écrire : une valeur absente devient NULL (sinon Prisma la laisserait inchangée). */
const toData = (s: Seedling) => ({
  name: s.name,
  species: s.species,
  sownOn: s.sownOn,
  quantity: s.quantity,
  germinationDays: s.germinationDays,
  location: s.location,
  notes: s.notes,
  status: s.status,
  germinatedOn: s.germinatedOn ?? null,
  germinatedCount: s.germinatedCount ?? null,
  plantId: s.plantId ?? null,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  deletedAt: s.deletedAt ?? null,
});

/** Écrit un semis entier (champs et photos) : tout ou rien. */
async function saveSeedling(tx: Prisma.TransactionClient, s: Seedling) {
  const data = toData(s);
  await tx.seedling.upsert({ where: { id: s.id }, create: { id: s.id, ...data }, update: data });
  await tx.seedlingPhoto.deleteMany({ where: { seedlingId: s.id } });
  if (s.photos.length > 0) {
    await tx.seedlingPhoto.createMany({
      data: s.photos.map((p, position) => ({
        id: p.id,
        seedlingId: s.id,
        position,
        file: p.file,
        date: p.date,
        note: p.note,
      })),
    });
  }
}

async function saveOne(s: Seedling) {
  await ready;
  await prisma.$transaction((tx) => saveSeedling(tx, s));
}

/** Date de semis : toute date valide, passée ou future (on peut planifier un semis), sinon aujourd'hui. */
function cleanSowDate(date: string | undefined): string {
  return isIsoDate(date) && !Number.isNaN(Date.parse(date)) ? date : todayISO();
}

/** Les semis vivants (non supprimés), les plus récents d'abord. */
export async function listSeedlings(): Promise<Seedling[]> {
  await ready;
  const rows = await prisma.seedling.findMany({ where: { deletedAt: null }, include: WITH_PHOTOS });
  return rows.map(fromRow).sort((a, b) => descending(a.sownOn, b.sownOn));
}

/** Un semis vivant (non supprimé), ou undefined. */
export async function getSeedling(id: string): Promise<Seedling | undefined> {
  await ready;
  const row = await prisma.seedling.findFirst({ where: { id, deletedAt: null }, include: WITH_PHOTOS });
  return row ? fromRow(row) : undefined;
}

export const createSeedling = lock(async (input: SeedlingInput, photoFiles: string[] = []): Promise<Seedling> => {
  const at = nowISO();
  const seedling: Seedling = {
    ...input,
    sownOn: cleanSowDate(input.sownOn),
    status: "seme",
    photos: photoFiles.map((file) => ({ id: randomUUID(), file, date: todayISO(), note: "" })),
    id: randomUUID(),
    createdAt: at,
    updatedAt: at,
  };
  await saveOne(seedling);
  return seedling;
});

export const updateSeedling = lock(async (id: string, input: SeedlingInput): Promise<void> => {
  const current = await getSeedling(id);
  if (!current) return;
  await saveOne({ ...current, ...input, sownOn: cleanSowDate(input.sownOn), updatedAt: nowISO() });
});

export const deleteSeedling = lock(async (id: string): Promise<void> => {
  const current = await getSeedling(id);
  if (!current) return;
  const at = nowISO();
  for (const p of current.photos) await removePhotoFile(p.file);
  await saveOne({ ...current, photos: [], deletedAt: at, updatedAt: at });
});

/** Ajoute des photos à un semis. Renvoie le nombre de photos réellement enregistrées. */
export const addSeedlingPhotos = lock(
  async (id: string, files: File[], meta: { date?: string; note?: string }): Promise<number> => {
    const s = await getSeedling(id);
    if (!s) return 0;
    const date = pastOrToday(meta.date);
    const note = cleanNote(meta.note);
    const names = await savePhotos(files);
    const entries: SeedlingPhoto[] = names.map((file) => ({ id: randomUUID(), file, date, note }));
    s.photos = newestFirst([...entries, ...s.photos]);
    s.updatedAt = nowISO();
    await saveOne(s);
    return entries.length;
  },
);

export const removeSeedlingPhoto = lock(async (id: string, photoId: string): Promise<void> => {
  const s = await getSeedling(id);
  const photo = s?.photos.find((p) => p.id === photoId);
  if (!s || !photo) return;
  s.photos = s.photos.filter((p) => p.id !== photoId);
  s.updatedAt = nowISO();
  await saveOne(s);
  await removePhotoFile(photo.file);
});

/** Marque le semis comme levé. La date ne peut pas précéder le semis ; le nombre est borné à la quantité semée. */
export const markGerminated = lock(async (id: string, date?: string, count?: number): Promise<void> => {
  const s = await getSeedling(id);
  if (!s || s.sownOn > todayISO()) return; // un semis encore à faire ne peut pas lever
  const day = pastOrToday(date);
  const n = Number.isFinite(count) && count! > 0 ? Math.round(count!) : s.quantity;
  s.updatedAt = nowISO();
  s.status = "leve";
  s.germinatedOn = day < s.sownOn ? s.sownOn : day;
  s.germinatedCount = Math.min(n, s.quantity);
  await saveOne(s);
});

export const markFailed = lock(async (id: string): Promise<void> => {
  const s = await getSeedling(id);
  if (!s) return;
  s.updatedAt = nowISO();
  s.status = "echec";
  await saveOne(s);
});

/** Remet un semis à l'état « semé » (correction d'une erreur de saisie). */
export const resetSeedling = lock(async (id: string): Promise<void> => {
  const s = await getSeedling(id);
  if (!s || s.status === "transplante") return;
  s.updatedAt = nowISO();
  s.status = "seme";
  delete s.germinatedOn;
  delete s.germinatedCount;
  await saveOne(s);
});

/** Crée une plante à partir du semis levé et la rattache. Renvoie l'id de la plante, ou undefined. */
export const transplant = lock(async (id: string): Promise<string | undefined> => {
  const s = await getSeedling(id);
  if (!s || s.status !== "leve") return undefined;
  const plant = await createPlant({
    name: s.name,
    species: s.species,
    location: s.location,
    light: "moyenne",
    wateringEveryDays: 7,
    lastWatered: todayISO(),
    notes: [s.notes, `Issu d'un semis du ${s.sownOn}.`].filter(Boolean).join("\n"),
  });
  s.status = "transplante";
  s.plantId = plant.id;
  s.updatedAt = nowISO();
  await saveOne(s);
  return plant.id;
});
