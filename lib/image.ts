// Préparation d'une photo dans le navigateur (à utiliser depuis un composant client uniquement).
import { ACCEPTED_MIME_TYPES, MAX_PHOTO_BYTES } from "@/lib/photo-constants";

const MAX_SIDE = 2000;
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

/** Réduit la photo (inutile d'envoyer 12 Mpx), applique l'orientation EXIF, sort un JPEG. */
export async function prepareImage(file: File): Promise<Blob> {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) throw new Error("Format non pris en charge (JPEG, PNG, WebP ou GIF).");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Cette photo est trop lourde (40 Mo maximum).");
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#fff"; // les PNG transparents ne deviennent pas noirs en JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("canvas");
    return blob;
  } catch {
    // Navigateur sans décodage possible : on garde l'original s'il reste raisonnable.
    if (file.size <= MAX_PHOTO_BYTES) return file;
    throw new Error("Impossible de préparer cette photo.");
  }
}
