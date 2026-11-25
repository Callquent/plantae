import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { descending, isIsoDate } from "@/lib/dates";

/**
 * Reprise, une seule fois, des anciennes données (data/plants.json et data/seedlings.json) dans SQLite.
 * Les fichiers JSON ne sont ni modifiés ni supprimés : ils restent comme sauvegarde.
 */

type OldPhoto = { id: string; file: string; date: string; health?: string; note?: string; clientId?: string };
type OldPlant = {
  id: string;
  name: string;
  species: string;
  location: string;
  light: string;
  wateringEveryDays: number;
  lastWatered: string;
  waterings?: string[];
  photos?: OldPhoto[];
  photo?: string; // tout premier format : une seule photo
  notes: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
};
type OldSeedling = {
  id: string;
  name: string;
  species: string;
  sownOn: string;
  quantity: number;
  germinationDays: number;
  location: string;
  notes: string;
  status: string;
  germinatedOn?: string;
  germinatedCount?: number;
  plantId?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
};

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function importLegacyJson(prisma: PrismaClient, dataDir: string): Promise<void> {
  const plants = await readJson<OldPlant>(path.join(dataDir, "plants.json"));
  const seedlings = await readJson<OldSeedling>(path.join(dataDir, "seedlings.json"));
  if (plants.length === 0 && seedlings.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const p of plants) {
      if (!p?.id || (await tx.plant.findUnique({ where: { id: p.id }, select: { id: true } }))) continue;
      const photos: OldPhoto[] =
        p.photos ?? (p.photo ? [{ id: randomUUID(), file: p.photo, date: p.createdAt.slice(0, 10) }] : []);
      photos.sort((a, b) => descending(a.date, b.date));
      const waterings = [...new Set((p.waterings ?? [p.lastWatered]).filter(isIsoDate))];
      await tx.plant.create({
        data: {
          id: p.id,
          name: p.name ?? "",
          species: p.species ?? "",
          location: p.location ?? "",
          light: p.light ?? "moyenne",
          wateringEveryDays: p.wateringEveryDays ?? 7,
          lastWatered: p.lastWatered,
          notes: p.notes ?? "",
          createdAt: p.createdAt,
          updatedAt: p.updatedAt ?? p.createdAt,
          deletedAt: p.deletedAt ?? null,
          photos: {
            create: photos.map((ph, position) => ({
              id: ph.id,
              position,
              file: ph.file,
              date: ph.date,
              health: ph.health ?? null,
              note: ph.note ?? "",
              clientId: ph.clientId ?? null,
            })),
          },
          waterings: { create: waterings.map((date) => ({ date })) },
        },
      });
    }
    for (const s of seedlings) {
      if (!s?.id || (await tx.seedling.findUnique({ where: { id: s.id }, select: { id: true } }))) continue;
      await tx.seedling.create({
        data: {
          id: s.id,
          name: s.name ?? "",
          species: s.species ?? "",
          sownOn: s.sownOn,
          quantity: s.quantity ?? 1,
          germinationDays: s.germinationDays ?? 10,
          location: s.location ?? "",
          notes: s.notes ?? "",
          status: s.status ?? "seme",
          germinatedOn: s.germinatedOn ?? null,
          germinatedCount: s.germinatedCount ?? null,
          plantId: s.plantId ?? null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt ?? s.createdAt,
          deletedAt: s.deletedAt ?? null,
        },
      });
    }
  });
}
