import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Prisma } from "@/generated/prisma/client";
import { prisma, ready } from "./db";
import { createPlant, savePhotos, todayISO, UPLOADS_DIR } from "./plants";
import { serialize } from "./lock";

export type SeedlingStatus = "seme" | "leve" | "transplante" | "echec";

export const STATUS_LABELS: Record<SeedlingStatus, string> = {
  seme: "Semé",
  leve: "Levé",
  transplante: "Transplanté",
  echec: "Échec",
};

export type SeedlingPhoto = {
  id: string;
  file: string; // nom du fichier dans data/uploads
  date: string; // date de la prise de vue (YYYY-MM-DD)
  note: string;
};

export type Seedling = {
  id: string;
  name: string;
  species: string;
  sownOn: string; // date de semis (YYYY-MM-DD)
  quantity: number; // nombre de graines semées
  germinationDays: number; // délai de levée attendu, en jours
  location: string;
  notes: string;
  status: SeedlingStatus;
  germinatedOn?: string; // date de levée constatée
  germinatedCount?: number; // nombre de graines levées
  plantId?: string; // plante créée lors du transplantage
  photos: SeedlingPhoto[]; // photos du semis, de la plus récente à la plus ancienne
  createdAt: string;
  updatedAt: string; // dernière modification (ISO)
  deletedAt?: string; // semis supprimé (la fiche reste en base mais n'apparaît plus)
};

export type SeedlingInput = Pick<
  Seedling,
  "name" | "species" | "sownOn" | "quantity" | "germinationDays" | "location" | "notes"
>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const serialized = <T,>(task: () => Promise<T>) => serialize("seedlings", task);
const nowISO = () => new Date().toISOString();

/** Arithmétique de dates en UTC : aucun décalage possible lié à l'heure d'été. */
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates ISO (b - a). */
export function diffDays(a: string, b: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

export function expectedGermination(s: Seedling): string {
  return shiftISO(s.sownOn, s.germinationDays);
}

type SeedlingRow = Prisma.SeedlingGetPayload<{ include: { photos: true } }>;
const WITH_PHOTOS = { photos: { orderBy: { position: "asc" } } } satisfies Prisma.SeedlingInclude;

function sortPhotos(photos: SeedlingPhoto[]): SeedlingPhoto[] {
  return [...photos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

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
    status: (Object.keys(STATUS_LABELS) as SeedlingStatus[]).find((k) => k === r.status) ?? "seme",
    germinatedOn: r.germinatedOn ?? undefined,
    germinatedCount: r.germinatedCount ?? undefined,
    plantId: r.plantId ?? undefined,
    photos: sortPhotos(r.photos.map((p) => ({ id: p.id, file: p.file, date: p.date, note: p.note }))),
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

async function removePhotoFile(name?: string) {
  if (!name) return;
  await fs.rm(path.join(UPLOADS_DIR, path.basename(name)), { force: true });
}

/** Tous les semis, y compris les « tombeaux » des semis supprimés. */
async function readAll(): Promise<Seedling[]> {
  await ready;
  return (await prisma.seedling.findMany({ include: WITH_PHOTOS })).map(fromRow);
}

/** Un semis vivant (non supprimé), ou undefined. */
async function readLive(id: string): Promise<Seedling | undefined> {
  await ready;
  const row = await prisma.seedling.findFirst({ where: { id, deletedAt: null }, include: WITH_PHOTOS });
  return row ? fromRow(row) : undefined;
}

async function saveOne(s: Seedling) {
  await ready;
  await prisma.$transaction((tx) => saveSeedling(tx, s));
}

/** Date de semis : toute date valide, passée ou future (on peut planifier un semis), sinon aujourd'hui. */
function cleanSowDate(date: string | undefined): string {
  return date && ISO_DATE.test(date) && !Number.isNaN(Date.parse(date)) ? date : todayISO();
}

/** Date saisie valide et non future, sinon aujourd'hui. */
function cleanDate(date: string | undefined): string {
  const today = todayISO();
  return date && ISO_DATE.test(date) && date <= today ? date : today;
}

export async function listSeedlings(): Promise<Seedling[]> {
  const items = (await readAll()).filter((s) => !s.deletedAt);
  return items.sort((a, b) => (a.sownOn < b.sownOn ? 1 : a.sownOn > b.sownOn ? -1 : 0));
}

export async function getSeedling(id: string): Promise<Seedling | undefined> {
  return readLive(id);
}

async function createSeedlingUnsafe(input: SeedlingInput, photoFiles: string[] = []): Promise<Seedling> {
  const seedling: Seedling = {
    ...input,
    sownOn: cleanSowDate(input.sownOn),
    status: "seme",
    photos: photoFiles.map((file) => ({ id: randomUUID(), file, date: todayISO(), note: "" })),
    id: randomUUID(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await saveOne(seedling);
  return seedling;
}

async function updateSeedlingUnsafe(id: string, input: SeedlingInput): Promise<void> {
  const current = await readLive(id);
  if (!current) return;
  await saveOne({ ...current, ...input, sownOn: cleanSowDate(input.sownOn), updatedAt: nowISO() });
}

async function deleteSeedlingUnsafe(id: string): Promise<void> {
  const current = await readLive(id);
  if (!current) return;
  const at = nowISO();
  for (const p of current.photos) await removePhotoFile(p.file);
  await saveOne({ ...current, photos: [], deletedAt: at, updatedAt: at });
}

/** Ajoute des photos à un semis. Renvoie le nombre de photos réellement enregistrées. */
async function addPhotosUnsafe(id: string, files: File[], meta: { date?: string; note?: string }): Promise<number> {
  const s = await readLive(id);
  if (!s) return 0;
  const today = todayISO();
  const date = meta.date && ISO_DATE.test(meta.date) && meta.date <= today ? meta.date : today;
  const names = await savePhotos(files);
  const entries: SeedlingPhoto[] = names.map((file) => ({
    id: randomUUID(),
    file,
    date,
    note: (meta.note ?? "").trim().slice(0, 500),
  }));
  s.photos = sortPhotos([...entries, ...s.photos]);
  s.updatedAt = nowISO();
  await saveOne(s);
  return entries.length;
}

async function removePhotoUnsafe(id: string, photoId: string): Promise<void> {
  const s = await readLive(id);
  const photo = s?.photos.find((p) => p.id === photoId);
  if (!s || !photo) return;
  s.photos = s.photos.filter((p) => p.id !== photoId);
  s.updatedAt = nowISO();
  await saveOne(s);
  await removePhotoFile(photo.file);
}

/** Marque le semis comme levé. La date ne peut pas précéder le semis ; le nombre est borné à la quantité semée. */
async function markGerminatedUnsafe(id: string, date?: string, count?: number): Promise<void> {
  const s = await readLive(id);
  if (!s || s.sownOn > todayISO()) return; // un semis encore à faire ne peut pas lever
  s.updatedAt = nowISO();
  const day = cleanDate(date);
  s.status = "leve";
  s.germinatedOn = day < s.sownOn ? s.sownOn : day;
  const n = Number.isFinite(count) && count! > 0 ? Math.round(count!) : s.quantity;
  s.germinatedCount = Math.min(n, s.quantity);
  await saveOne(s);
}

async function markFailedUnsafe(id: string): Promise<void> {
  const s = await readLive(id);
  if (!s) return;
  s.updatedAt = nowISO();
  s.status = "echec";
  await saveOne(s);
}

/** Remet un semis à l'état « semé » (correction d'une erreur de saisie). */
async function resetSeedlingUnsafe(id: string): Promise<void> {
  const s = await readLive(id);
  if (!s || s.status === "transplante") return;
  s.updatedAt = nowISO();
  s.status = "seme";
  delete s.germinatedOn;
  delete s.germinatedCount;
  await saveOne(s);
}

/** Crée une plante à partir du semis levé et la rattache. Renvoie l'id de la plante, ou undefined. */
async function transplantUnsafe(id: string): Promise<string | undefined> {
  const s = await readLive(id);
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
}

export function createSeedling(...args: Parameters<typeof createSeedlingUnsafe>): ReturnType<typeof createSeedlingUnsafe> {
  return serialized(() => createSeedlingUnsafe(...args));
}

export function updateSeedling(...args: Parameters<typeof updateSeedlingUnsafe>): ReturnType<typeof updateSeedlingUnsafe> {
  return serialized(() => updateSeedlingUnsafe(...args));
}

export function deleteSeedling(...args: Parameters<typeof deleteSeedlingUnsafe>): ReturnType<typeof deleteSeedlingUnsafe> {
  return serialized(() => deleteSeedlingUnsafe(...args));
}

export function addSeedlingPhotos(...args: Parameters<typeof addPhotosUnsafe>): ReturnType<typeof addPhotosUnsafe> {
  return serialized(() => addPhotosUnsafe(...args));
}

export function removeSeedlingPhoto(...args: Parameters<typeof removePhotoUnsafe>): ReturnType<typeof removePhotoUnsafe> {
  return serialized(() => removePhotoUnsafe(...args));
}

export function markGerminated(...args: Parameters<typeof markGerminatedUnsafe>): ReturnType<typeof markGerminatedUnsafe> {
  return serialized(() => markGerminatedUnsafe(...args));
}

export function markFailed(...args: Parameters<typeof markFailedUnsafe>): ReturnType<typeof markFailedUnsafe> {
  return serialized(() => markFailedUnsafe(...args));
}

export function resetSeedling(...args: Parameters<typeof resetSeedlingUnsafe>): ReturnType<typeof resetSeedlingUnsafe> {
  return serialized(() => resetSeedlingUnsafe(...args));
}

export function transplant(...args: Parameters<typeof transplantUnsafe>): ReturnType<typeof transplantUnsafe> {
  return serialized(() => transplantUnsafe(...args));
}
