import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { DATA_DIR, prisma, ready } from "./db";
import { serialize } from "./lock";

export type Light = "faible" | "moyenne" | "forte";
export type Health = "bonne" | "moyenne" | "mauvaise";

export const HEALTH_LABELS: Record<Health, string> = {
  bonne: "En forme",
  moyenne: "Moyenne",
  mauvaise: "Souffrante",
};

export type PlantPhoto = {
  id: string;
  file: string; // nom du fichier dans data/uploads
  date: string; // date de la prise de vue (YYYY-MM-DD)
  health?: Health; // état de santé constaté ce jour-là
  note: string;
  clientId?: string; // identifiant donné par le téléphone : un renvoi ne crée jamais de doublon
};

export type Plant = {
  id: string;
  name: string;
  species: string;
  location: string;
  light: Light;
  wateringEveryDays: number;
  lastWatered: string; // ISO date (YYYY-MM-DD), toujours = arrosage le plus récent de l'historique
  waterings: string[]; // historique des arrosages (YYYY-MM-DD), du plus récent au plus ancien
  photos: PlantPhoto[]; // journal photo, de la plus récente à la plus ancienne
  notes: string;
  createdAt: string;
  updatedAt: string; // dernière modification (ISO)
  deletedAt?: string; // plante supprimée (la fiche reste en base mais n'apparaît plus)
};

export type PlantInput = Omit<Plant, "id" | "createdAt" | "photos" | "waterings" | "updatedAt" | "deletedAt">;

// Les fiches vivent dans la base SQLite (lib/db.ts) ; seuls les fichiers photo restent sur le disque.
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 10;
export const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLIENT_ID = /^[A-Za-z0-9-]{8,64}$/;

const serialized = <T,>(task: () => Promise<T>) => serialize("plants", task);

const nowISO = () => new Date().toISOString();

/** Historique propre : dates valides, sans doublon, du plus récent au plus ancien. */
function normalizeHistory(dates: string[]): string[] {
  return [...new Set(dates.filter((d) => ISO_DATE.test(d)))].sort().reverse();
}

/** Tri du journal : date la plus récente d'abord (le tri est stable, les ajouts du jour restent en tête). */
function sortPhotos(photos: PlantPhoto[]): PlantPhoto[] {
  return [...photos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
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
    light: r.light === "faible" || r.light === "forte" ? r.light : "moyenne",
    wateringEveryDays: r.wateringEveryDays,
    lastWatered: r.lastWatered,
    waterings: normalizeHistory(r.waterings.map((w) => w.date)),
    photos: sortPhotos(
      r.photos.map((ph) => ({
        id: ph.id,
        file: ph.file,
        date: ph.date,
        health: (Object.keys(HEALTH_LABELS) as Health[]).find((h) => h === ph.health),
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

/** Toutes les fiches, y compris les « tombeaux » des plantes supprimées. */
async function readAll(): Promise<Plant[]> {
  await ready;
  return (await prisma.plant.findMany({ include: WITH_CHILDREN })).map(fromRow);
}

/** Une fiche vivante (non supprimée), ou undefined. */
async function readLive(id: string): Promise<Plant | undefined> {
  await ready;
  const row = await prisma.plant.findFirst({ where: { id, deletedAt: null }, include: WITH_CHILDREN });
  return row ? fromRow(row) : undefined;
}

async function saveOne(plant: Plant) {
  await ready;
  await prisma.$transaction((tx) => savePlant(tx, plant));
}

/** Enregistre une image envoyée par formulaire. Renvoie le nom de fichier, ou undefined si invalide/absente. */
async function savePhoto(file: File): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const ext = PHOTO_TYPES[file.type];
  if (!ext || file.size > MAX_PHOTO_BYTES) return undefined;
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(UPLOADS_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

/** Enregistre plusieurs images ; ignore silencieusement celles qui sont invalides ou trop lourdes. */
export async function savePhotos(files: File[]): Promise<string[]> {
  const saved: string[] = [];
  for (const f of files.slice(0, MAX_PHOTOS_PER_UPLOAD)) {
    const name = await savePhoto(f);
    if (name) saved.push(name);
  }
  return saved;
}

async function removePhotoFile(name?: string) {
  if (!name) return;
  await fs.rm(path.join(UPLOADS_DIR, path.basename(name)), { force: true });
}

export async function listPlants(): Promise<Plant[]> {
  const plants = (await readAll()).filter((p) => !p.deletedAt);
  return plants.sort((a, b) => nextWateringDate(a).getTime() - nextWateringDate(b).getTime());
}

export async function getPlant(id: string): Promise<Plant | undefined> {
  return readLive(id);
}

async function createPlantUnsafe(input: PlantInput, photoFiles: string[] = []): Promise<Plant> {
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
}

async function updatePlantUnsafe(id: string, input: PlantInput): Promise<void> {
  const current = await readLive(id);
  if (!current) return;
  const at = nowISO();
  // Une date saisie dans le formulaire rejoint l'historique ; le dernier arrosage reste le plus récent.
  const isNewDate = ISO_DATE.test(input.lastWatered) && !current.waterings.includes(input.lastWatered);
  const waterings = normalizeHistory([...current.waterings, input.lastWatered]);
  const plant: Plant = { ...current, ...input, waterings, lastWatered: waterings[0], updatedAt: at };
  await saveOne(plant);
}

async function deletePlantUnsafe(id: string): Promise<void> {
  const current = await readLive(id);
  if (!current) return;
  const at = nowISO();
  for (const ph of current.photos) await removePhotoFile(ph.file);
  // On garde un « tombeau » : c'est lui qui apprend à l'autre ordinateur que la plante a été supprimée.
  await saveOne({ ...current, photos: [], waterings: [], deletedAt: at, updatedAt: at });
}

/** Ajoute des photos au journal d'une plante. Renvoie le nombre de photos réellement enregistrées. */
async function addPhotosUnsafe(
  id: string,
  files: File[],
  meta: { date?: string; health?: string; note?: string },
): Promise<number> {
  const plant = await readLive(id);
  if (!plant) return 0;
  const today = todayISO();
  const date = meta.date && ISO_DATE.test(meta.date) && meta.date <= today ? meta.date : today;
  const health = (Object.keys(HEALTH_LABELS) as Health[]).find((h) => h === meta.health);
  const names = await savePhotos(files);
  const entries: PlantPhoto[] = names.map((file) => ({
    id: randomUUID(),
    file,
    date,
    health,
    note: (meta.note ?? "").trim(),
  }));
  plant.photos = sortPhotos([...entries, ...plant.photos]);
  const at = nowISO();
  plant.updatedAt = at;
  await saveOne(plant);
  return entries.length;
}

async function removePhotoUnsafe(id: string, photoId: string): Promise<void> {
  const plant = await readLive(id);
  if (!plant) return;
  const photo = plant.photos.find((ph) => ph.id === photoId);
  if (!photo) return;
  plant.photos = plant.photos.filter((ph) => ph.id !== photoId);
  plant.updatedAt = nowISO();
  await saveOne(plant);
  await removePhotoFile(photo.file);
}

/** Modifie l'état de santé et l'observation d'une photo du journal (la date de prise de vue reste inchangée). */
async function updatePhotoUnsafe(
  id: string,
  photoId: string,
  meta: { health?: string; note?: string },
): Promise<void> {
  const plant = await readLive(id);
  const photo = plant?.photos.find((ph) => ph.id === photoId);
  if (!plant || !photo) return;
  photo.health = (Object.keys(HEALTH_LABELS) as Health[]).find((h) => h === meta.health);
  photo.note = (meta.note ?? "").trim().slice(0, 500);
  // La fiche devient « la plus récente » : sa version de la photo l'emporte à la prochaine synchronisation.
  plant.updatedAt = nowISO();
  await saveOne(plant);
}

export function updatePhoto(...args: Parameters<typeof updatePhotoUnsafe>): ReturnType<typeof updatePhotoUnsafe> {
  return serialized(() => updatePhotoUnsafe(...args));
}

export function createPlant(...args: Parameters<typeof createPlantUnsafe>): ReturnType<typeof createPlantUnsafe> {
  return serialized(() => createPlantUnsafe(...args));
}

export function updatePlant(...args: Parameters<typeof updatePlantUnsafe>): ReturnType<typeof updatePlantUnsafe> {
  return serialized(() => updatePlantUnsafe(...args));
}

export function deletePlant(...args: Parameters<typeof deletePlantUnsafe>): ReturnType<typeof deletePlantUnsafe> {
  return serialized(() => deletePlantUnsafe(...args));
}

export function addPhotos(...args: Parameters<typeof addPhotosUnsafe>): ReturnType<typeof addPhotosUnsafe> {
  return serialized(() => addPhotosUnsafe(...args));
}

export function removePhoto(...args: Parameters<typeof removePhotoUnsafe>): ReturnType<typeof removePhotoUnsafe> {
  return serialized(() => removePhotoUnsafe(...args));
}

export function addWatering(...args: Parameters<typeof addWateringUnsafe>): ReturnType<typeof addWateringUnsafe> {
  return serialized(() => addWateringUnsafe(...args));
}

export function removeWatering(...args: Parameters<typeof removeWateringUnsafe>): ReturnType<typeof removeWateringUnsafe> {
  return serialized(() => removeWateringUnsafe(...args));
}

/** Photo de couverture : la plus récente du journal. */
export function coverPhoto(plant: Plant): PlantPhoto | undefined {
  return plant.photos[0];
}

/** Dernier état de santé renseigné dans le journal. */
export function latestHealth(plant: Plant): { health: Health; date: string } | undefined {
  const p = plant.photos.find((ph) => ph.health);
  return p?.health ? { health: p.health, date: p.date } : undefined;
}

/** Ajoute un arrosage à l'historique (aujourd'hui par défaut). Ignore les dates invalides ou futures. */
async function addWateringUnsafe(id: string, date: string = todayISO()): Promise<void> {
  if (!ISO_DATE.test(date) || date > todayISO()) return;
  const plant = await readLive(id);
  if (!plant) return;
  plant.waterings = normalizeHistory([...plant.waterings, date]);
  plant.lastWatered = plant.waterings[0];
  plant.updatedAt = nowISO();
  await saveOne(plant);
}

async function removeWateringUnsafe(id: string, date: string): Promise<void> {
  const plant = await readLive(id);
  if (!plant) return;
  plant.waterings = plant.waterings.filter((d) => d !== date);
  // Sans historique, on repart de la date d'ajout de la plante.
  plant.lastWatered = plant.waterings[0] ?? plant.createdAt.slice(0, 10);
  plant.updatedAt = nowISO();
  await saveOne(plant);
}

export type DevicePhotoResult = "saved" | "duplicate" | "invalid" | "not-found";

/**
 * Photo envoyée par le téléphone. Si `clientId` est déjà connu pour cette plante (renvoi après une
 * réponse perdue), la photo n'est pas enregistrée une seconde fois : résultat « duplicate ».
 */
async function addDevicePhotoUnsafe(
  id: string,
  file: File,
  meta: { clientId?: string; date?: string; health?: string; note?: string },
): Promise<DevicePhotoResult> {
  const plant = await readLive(id);
  if (!plant) return "not-found";
  const clientId = meta.clientId && CLIENT_ID.test(meta.clientId) ? meta.clientId : undefined;
  if (clientId && plant.photos.some((ph) => ph.clientId === clientId)) return "duplicate";
  const [name] = await savePhotos([file]);
  if (!name) return "invalid";
  const today = todayISO();
  const entry: PlantPhoto = {
    id: randomUUID(),
    file: name,
    date: meta.date && ISO_DATE.test(meta.date) && meta.date <= today ? meta.date : today,
    health: (Object.keys(HEALTH_LABELS) as Health[]).find((h) => h === meta.health),
    note: (meta.note ?? "").trim().slice(0, 500),
    clientId,
  };
  plant.photos = sortPhotos([entry, ...plant.photos]);
  plant.updatedAt = nowISO();
  await saveOne(plant);
  return "saved";
}

export function addDevicePhoto(...args: Parameters<typeof addDevicePhotoUnsafe>): ReturnType<typeof addDevicePhotoUnsafe> {
  return serialized(() => addDevicePhotoUnsafe(...args));
}

export async function markWatered(id: string): Promise<void> {
  await addWatering(id, todayISO());
}

/** Intervalle moyen (en jours) entre deux arrosages consécutifs, ou null s'il y en a moins de deux. */
export function averageInterval(plant: Plant): number | null {
  const d = plant.waterings;
  if (d.length < 2) return null;
  const span = (new Date(d[0] + "T00:00:00").getTime() - new Date(d[d.length - 1] + "T00:00:00").getTime()) / 86_400_000;
  return Math.round((span / (d.length - 1)) * 10) / 10;
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function nextWateringDate(plant: Plant): Date {
  const d = new Date(plant.lastWatered + "T00:00:00");
  d.setDate(d.getDate() + plant.wateringEveryDays);
  return d;
}

/** Nombre de jours avant le prochain arrosage (négatif = en retard). */
export function daysUntilWatering(plant: Plant): number {
  const today = new Date(todayISO() + "T00:00:00");
  return Math.round((nextWateringDate(plant).getTime() - today.getTime()) / 86_400_000);
}
