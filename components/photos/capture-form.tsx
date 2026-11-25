"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { cleanNote, MAX_NOTE_LENGTH } from "@/lib/photo-constants";
import { enqueue, flushQueue, newId, prepareImage, type QueuedPhoto } from "@/lib/photo-queue";
import { HEALTH_LABELS, HEALTHS } from "@/lib/plants/types";

type Item = { key: string; blob: Blob; url: string };

const HEALTH = [
  { value: "", label: "Non précisé" },
  ...HEALTHS.map((h) => ({ value: h, label: HEALTH_LABELS[h] })),
];

export default function CaptureForm({
  plantId,
  plantName,
  today,
}: {
  plantId: string;
  plantName: string;
  today: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [health, setHealth] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ sent: number; left: number } | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    const all = urls.current;
    return () => all.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setResult(null);
    setBusy(true);
    const added: Item[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await prepareImage(file);
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        added.push({ key: newId(), blob, url });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Photo illisible.");
      }
    }
    setItems((cur) => [...cur, ...added]);
    setBusy(false);
  }

  async function send() {
    if (!items.length || busy) return;
    setBusy(true);
    setError("");
    try {
      for (const it of items) {
        const photo: QueuedPhoto = {
          id: it.key,
          plantId,
          plantName,
          blob: it.blob,
          date,
          health,
          note: cleanNote(note),
          queuedAt: Date.now(),
        };
        await enqueue(photo);
      }
      setItems([]);
      setNote("");
      setResult(await flushQueue());
    } catch {
      setError("Impossible d'enregistrer la photo sur le téléphone (stockage plein ?).");
    }
    setBusy(false);
  }

  const input = "sr-only";
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="btn btn-lg cursor-pointer">
          <Icon name="camera" className="h-6 w-6" />
          Prendre une photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className={input}
            onChange={(e) => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className="btn-quiet btn-lg cursor-pointer">
          Galerie
          <input
            type="file"
            accept="image/*"
            multiple
            className={input}
            onChange={(e) => {
              void pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <li key={it.key} className="relative aspect-square overflow-hidden rounded-xl bg-green-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="Photo à envoyer" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Retirer cette photo"
                onClick={() => setItems((cur) => cur.filter((x) => x.key !== it.key))}
                className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-lg leading-none text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">État de santé</legend>
        <div className="grid grid-cols-2 gap-2">
          {HEALTH.map((h) => (
            <label
              key={h.value}
              className="cursor-pointer rounded-xl px-3 py-2.5 text-center text-sm font-medium ring-1 ring-line has-checked:bg-green-700 has-checked:text-white has-checked:ring-green-700"
            >
              <input
                type="radio"
                name="health"
                value={h.value}
                checked={health === h.value}
                onChange={() => setHealth(h.value)}
                className="sr-only"
              />
              {h.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Date
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className="field" />
        </label>
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
          Note (facultatif)
          <input value={note} maxLength={MAX_NOTE_LENGTH} onChange={(e) => setNote(e.target.value)} className="field" />
        </label>
      </div>

      <button type="button" onClick={send} disabled={!items.length || busy} className="btn btn-lg disabled:opacity-50">
        {busy ? "Un instant…" : `Envoyer au PC${items.length > 1 ? ` (${items.length})` : ""}`}
      </button>

      <div aria-live="polite" className="grid gap-2 text-sm">
        {error && <p className="font-medium text-alert">{error}</p>}
        {result && result.left === 0 && (
          <p className="font-medium text-green-800">
            <Icon name="check" className="mr-1 inline h-4 w-4" />
            {result.sent > 1 ? `${result.sent} photos reçues` : "Photo reçue"} sur le PC.{" "}
            <Link href={`/plantes/${plantId}`} className="underline">
              Voir la fiche
            </Link>
          </p>
        )}
        {result && result.left > 0 && (
          <p className="font-medium text-sun-deep">
            PC injoignable : {result.left} photo{result.left > 1 ? "s" : ""} gardée{result.left > 1 ? "s" : ""} sur le
            téléphone, envoi automatique dès que le Wi-Fi de la maison revient.
          </p>
        )}
      </div>
    </div>
  );
}
