import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";
import type { PrismaLibSql as PrismaLibSqlType } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { importLegacyJson } from "./legacy-import";

// DATA_DIR : fourni par « Mes applications » pour garder les données hors du dossier du programme.
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
export const DB_FILE = path.join(DATA_DIR, "plantes.db");

/**
 * L'adaptateur SQLite (libsql : binaires précompilés, rien à compiler à l'installation) est chargé par
 * Node directement depuis node_modules, hors du paquet compilé. Ainsi le résultat de « next build »
 * ne dépend d'aucun lien interne de Turbopack, qui disparaît quand le dossier compilé est copié ailleurs.
 */
const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
function loadAdapter(): typeof PrismaLibSqlType {
  return (nodeRequire("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql")).PrismaLibSql;
}

/**
 * Création des tables. Elle reprend à l'identique prisma/schema.prisma ; « IF NOT EXISTS » la rend
 * sans danger à chaque démarrage, et l'application n'a donc besoin d'aucune commande Prisma au lancement.
 */
const DDL = [
  `CREATE TABLE IF NOT EXISTS "Plant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "light" TEXT NOT NULL,
    "wateringEveryDays" INTEGER NOT NULL,
    "lastWatered" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "deletedAt" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "file" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "health" TEXT,
    "note" TEXT NOT NULL,
    "clientId" TEXT,
    CONSTRAINT "Photo_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Photo_plantId_idx" ON "Photo"("plantId")`,
  `CREATE TABLE IF NOT EXISTS "Watering" (
    "plantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    PRIMARY KEY ("plantId", "date"),
    CONSTRAINT "Watering_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "Seedling" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "sownOn" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "germinationDays" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "germinatedOn" TEXT,
    "germinatedCount" INTEGER,
    "plantId" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "deletedAt" TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS "SeedlingPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seedlingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "file" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "SeedlingPhoto_seedlingId_fkey" FOREIGN KEY ("seedlingId") REFERENCES "Seedling" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "SeedlingPhoto_seedlingId_idx" ON "SeedlingPhoto"("seedlingId")`,
];

type Store = { prisma: PrismaClient; ready: Promise<void> };
const g = globalThis as typeof globalThis & { __plantesDb?: Store };

async function init(prisma: PrismaClient) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  for (const sql of DDL) await prisma.$executeRawUnsafe(sql);
  // user_version = 0 : base toute neuve. On y reprend une seule fois les anciens fichiers JSON.
  const rows = await prisma.$queryRawUnsafe<{ user_version: number | bigint }[]>("PRAGMA user_version");
  if (Number(rows[0]?.user_version ?? 0) < 1) {
    try {
      await importLegacyJson(prisma, DATA_DIR);
      await prisma.$executeRawUnsafe("PRAGMA user_version = 1");
    } catch (e) {
      // Le reprise est atomique : en cas d'échec rien n'est écrit, et elle sera retentée au prochain démarrage.
      console.error("Reprise des anciennes données (plants.json / seedlings.json) impossible :", e);
    }
  }
}

function open(): Store {
  const PrismaLibSql = loadAdapter();
  // Barres obliques partout : « file:C:/... » est compris aussi sous Windows.
  const adapter = new PrismaLibSql({ url: `file:${DB_FILE.replace(/\\/g, "/")}` });
  const prisma = new PrismaClient({ adapter });
  // Pendant « next build » la base n'est pas utilisée : on n'y touche pas (pas de fichier créé dans le dossier de compilation).
  const ready = process.env.NEXT_PHASE === "phase-production-build" ? Promise.resolve() : init(prisma);
  ready.catch(() => undefined);
  return { prisma, ready };
}

// Vit sur globalThis : une seule connexion, même si le module est rechargé (mode développement).
const store = (g.__plantesDb ??= open());

/** Client Prisma, utilisable une fois `ready` résolue. */
export const prisma = store.prisma;
export const ready = store.ready;
