"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import HealthSelect from "@/components/plants/health-select";
import Field from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import { prepareImage } from "@/lib/image";
import { ACCEPT_ATTR, MAX_PHOTOS_PER_UPLOAD } from "@/lib/photo-constants";

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn justify-self-start" disabled={disabled || pending}>
      <Icon name="plus" />
      {pending ? "Envoi…" : label}
    </button>
  );
}

/**
 * Ajout de photos au journal d'une plante (avec état de santé) ou d'un semis.
 * Les photos viennent de l'appareil photo (téléphone) ou de fichiers ; chacune est réduite (≈1 Mo)
 * puis rangée dans un champ caché, de sorte que tout part en un seul envoi avec la date et l'observation.
 */
export default function PhotoUploadForm({
  action,
  today,
  withHealth = false,
  notePlaceholder,
  submitLabel,
  hint,
}: {
  action: (formData: FormData) => void | Promise<void>;
  today: string;
  withHealth?: boolean;
  notePlaceholder: string;
  submitLabel: string;
  hint?: string;
}) {
  const collected = useRef<HTMLInputElement>(null); // champ « photos » réellement envoyé
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function store(list: File[]) {
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    if (collected.current) collected.current.files = dt.files;
    setCount(list.length);
  }

  async function add(picked: File[]) {
    if (picked.length === 0) return;
    setError("");
    setBusy(true);
    const list = Array.from(collected.current?.files ?? []);
    const problems: string[] = [];
    for (const file of picked) {
      if (list.length >= MAX_PHOTOS_PER_UPLOAD) {
        problems.push(`${MAX_PHOTOS_PER_UPLOAD} photos maximum par envoi.`);
        break;
      }
      try {
        const blob = await prepareImage(file);
        list.push(new File([blob], `photo-${Date.now()}-${list.length}.jpg`, { type: blob.type }));
      } catch (err) {
        problems.push(err instanceof Error ? err.message : "Impossible de préparer cette photo.");
      }
    }
    store(list);
    setError([...new Set(problems)].join(" "));
    setBusy(false);
  }

  // Le FileList est vivant : on le copie avant de vider le champ.
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    void add(picked);
  }

  async function submit(formData: FormData) {
    await action(formData);
    store([]);
  }

  const note = (
    <Field label="Observation">
      <input name="note" placeholder={notePlaceholder} className="field" />
    </Field>
  );

  return (
    <form action={submit} className="grid gap-3 rounded-xl border border-dashed border-green-300 bg-green-50/70 p-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Ajouter des photos</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-quiet" disabled={busy} onClick={() => camera.current?.click()}>
            <Icon name="camera" />
            Prendre une photo
          </button>
          <button type="button" className="btn-quiet" disabled={busy} onClick={() => files.current?.click()}>
            <Icon name="plus" />
            Choisir des fichiers
          </button>
        </div>
        {/* Sélecteurs sans nom : seul le champ « photos » ci-dessous est envoyé. */}
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={files} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={onPick} />
        <input ref={collected} name="photos" type="file" multiple hidden tabIndex={-1} />
        <p className="text-sm text-muted" aria-live="polite">
          {busy
            ? "Préparation des photos…"
            : count === 0
              ? "Aucune photo sélectionnée."
              : `${count} photo${count > 1 ? "s" : ""} prête${count > 1 ? "s" : ""} à envoyer. `}
          {!busy && count > 0 && (
            <button type="button" className="btn-text" onClick={() => store([])}>
              Tout retirer
            </button>
          )}
        </p>
        {error && (
          <p role="alert" className="text-sm font-medium text-alert">
            {error}
          </p>
        )}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date de la prise de vue">
          <input name="date" type="date" max={today} defaultValue={today} className="field" />
        </Field>
        {withHealth ? (
          <Field label="État de santé">
            <HealthSelect />
          </Field>
        ) : (
          note
        )}
      </div>
      {withHealth && note}
      <p className="text-xs text-muted">
        JPEG, PNG, WebP ou GIF, réduits à 2000 px avant l&apos;envoi, {MAX_PHOTOS_PER_UPLOAD} photos par envoi.
        {hint && ` ${hint}`}
      </p>
      <Submit label={submitLabel} disabled={busy || count === 0} />
    </form>
  );
}
