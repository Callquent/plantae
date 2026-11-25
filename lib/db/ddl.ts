/**
 * Création des tables. Elle reprend à l'identique prisma/schema.prisma ; « IF NOT EXISTS » la rend
 * sans danger à chaque démarrage, et l'application n'a donc besoin d'aucune commande Prisma au lancement.
 */
export const DDL = [
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
