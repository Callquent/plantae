import path from "path";

// DATA_DIR : fourni par « Mes applications » pour garder les données hors du dossier du programme.
export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
export const DB_FILE = path.join(DATA_DIR, "plantes.db");
// Les fiches vivent dans la base SQLite (lib/db/client.ts) ; seuls les fichiers photo restent sur le disque.
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
