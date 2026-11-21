import { withBase } from "@/lib/base-path";

/**
 * File d'attente des photos prises au téléphone.
 *
 * Chaque photo est d'abord réduite puis rangée dans IndexedDB (elle survit à la fermeture de
 * l'application et à une coupure Wi-Fi), puis envoyée au PC. Elle n'est effacée du téléphone
 * qu'une fois le PC ayant répondu « reçu ». Un renvoi est sans danger : le PC reconnaît
 * l'identifiant de la photo et ne la compte qu'une fois.
 */

const DB_NAME = "plantes-photos";
const STORE = "queue";
const MAX_SIDE = 2000;
const SEND_TIMEOUT_MS = 20_000;
export const QUEUE_EVENT = "photo-queue-changed";
export const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024;

export type QueuedPhoto = {
  id: string; // identifiant unique, aussi utilisé par le PC pour éviter les doublons
  plantId: string;
  plantName: string;
  blob: Blob;
  date: string;
  health: string;
  note: string;
  queuedAt: number;
};

/** Identifiant aléatoire sans crypto.randomUUID, absent hors HTTPS (cas du Wi-Fi maison en http). */
export function newId(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const changed = () => window.dispatchEvent(new Event(QUEUE_EVENT));

export async function listQueue(): Promise<QueuedPhoto[]> {
  try {
    const all = await run("readonly", (s) => s.getAll() as IDBRequest<QueuedPhoto[]>);
    return all.sort((a, b) => a.queuedAt - b.queuedAt);
  } catch {
    return [];
  }
}

export async function countQueue(): Promise<number> {
  try {
    return await run("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

export async function enqueue(photo: QueuedPhoto): Promise<void> {
  await run("readwrite", (s) => s.put(photo));
  changed();
}

async function remove(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
  changed();
}

/** Réduit la photo (le PC n'a pas besoin de 12 Mpx), applique l'orientation EXIF, sort un JPEG. */
export async function prepareImage(file: File): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Format non pris en charge (JPEG, PNG, WebP ou GIF).");
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
    // Navigateur sans décodage possible : on garde l'original s'il reste raisonnable pour le PC.
    if (file.size <= 8 * 1024 * 1024) return file;
    throw new Error("Impossible de préparer cette photo.");
  }
}

let flushing: Promise<FlushResult> | null = null;
export type FlushResult = { sent: number; left: number };

/** Envoie toutes les photos en attente, dans l'ordre. S'arrête au premier échec temporaire. */
export function flushQueue(): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    for (const item of await listQueue()) {
      const form = new FormData();
      form.set("plantId", item.plantId);
      form.set("clientId", item.id);
      form.set("date", item.date);
      form.set("health", item.health);
      form.set("note", item.note);
      form.set("photo", item.blob, `${item.id}.jpg`);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);
      try {
        const res = await fetch(withBase("/api/photos"), { method: "POST", body: form, signal: ctrl.signal });
        if (res.ok) {
          await remove(item.id);
          sent++;
        } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          // Refusée pour de bon (plante supprimée sur le PC, fichier invalide) : inutile de réessayer.
          await remove(item.id);
        } else {
          break;
        }
      } catch {
        break; // PC injoignable : on garde tout et on réessaiera
      } finally {
        clearTimeout(timer);
      }
    }
    return { sent, left: await countQueue() };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
