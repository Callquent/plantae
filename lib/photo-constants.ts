/** Règles sur les photos, partagées par le serveur, les formulaires et la file d'attente du téléphone. */
export const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
export const MIME_BY_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(PHOTO_EXTENSIONS).map(([mime, ext]) => [ext, mime]),
);
export const ACCEPTED_MIME_TYPES = Object.keys(PHOTO_EXTENSIONS);
/** Valeur de l'attribut `accept` des champs fichier. */
export const ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(",");

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 10;
export const MAX_NOTE_LENGTH = 500;

export const cleanNote = (note: string | undefined): string => (note ?? "").trim().slice(0, MAX_NOTE_LENGTH);
