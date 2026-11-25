import path from "path";

// DATA_DIR : fourni par la plateforme (Triviae) pour garder les données hors du dossier du programme.
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");

/** Fichier d'une URL « file: » (ex. file:C:/données/base.db), ou undefined pour toute autre URL. */
function fileOfUrl(url: string | undefined): string | undefined {
  if (!url?.startsWith("file:")) return undefined;
  const file = url.slice("file:".length).replace(/^\/\/(?=\/)/, "");
  return path.resolve(file);
}

/**
 * Une seule base SQLite. La plateforme la crée dans le dossier de données (base.db), prépare ses tables
 * d'après prisma/schema.prisma et fournit son adresse dans DATABASE_URL : on utilise donc cette adresse.
 * Hors plateforme (développement), c'est DATA_DIR/base.db, le même nom.
 */
export const DB_FILE = fileOfUrl(process.env.DATABASE_URL) ?? path.join(DATA_DIR, "base.db");
// Les fiches vivent dans la base SQLite (lib/db/client.ts) ; seuls les fichiers photo restent sur le disque.
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
