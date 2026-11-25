import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";
import type { PrismaLibSql as PrismaLibSqlType } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { DATA_DIR, DB_FILE } from "@/lib/config";
import { DDL } from "./ddl";
import { importLegacyJson } from "./legacy-import";

/**
 * L'adaptateur SQLite (libsql : binaires précompilés, rien à compiler à l'installation) est chargé par
 * Node directement depuis node_modules, hors du paquet compilé. Ainsi le résultat de « next build »
 * ne dépend d'aucun lien interne de Turbopack, qui disparaît quand le dossier compilé est copié ailleurs.
 */
const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
function loadAdapter(): typeof PrismaLibSqlType {
  return (nodeRequire("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql")).PrismaLibSql;
}


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
