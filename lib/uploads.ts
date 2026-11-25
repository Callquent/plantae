import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { UPLOADS_DIR } from "./config";
import { MAX_PHOTO_BYTES, MAX_PHOTOS_PER_UPLOAD, PHOTO_EXTENSIONS } from "./photo-constants";

/** Enregistre une image envoyée par formulaire. Renvoie le nom de fichier, ou undefined si invalide/absente. */
async function savePhoto(file: File): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const ext = PHOTO_EXTENSIONS[file.type];
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

export async function removePhotoFile(name?: string) {
  if (!name) return;
  await fs.rm(path.join(UPLOADS_DIR, path.basename(name)), { force: true });
}
