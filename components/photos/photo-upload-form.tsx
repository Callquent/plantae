import HealthSelect from "@/components/plants/health-select";
import { Icon } from "@/components/ui/icons";
import Field from "@/components/ui/field";
import { todayISO } from "@/lib/dates";
import { ACCEPT_ATTR, MAX_PHOTO_BYTES, MAX_PHOTOS_PER_UPLOAD } from "@/lib/photo-constants";

/** Ajout de photos au journal d'une plante (avec état de santé) ou d'un semis. */
export default function PhotoUploadForm({
  action,
  withHealth = false,
  notePlaceholder,
  submitLabel,
  hint,
}: {
  action: (formData: FormData) => void | Promise<void>;
  withHealth?: boolean;
  notePlaceholder: string;
  submitLabel: string;
  hint?: string;
}) {
  const today = todayISO();
  const note = (
    <Field label="Observation">
      <input name="note" placeholder={notePlaceholder} className="field" />
    </Field>
  );
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-dashed border-green-300 bg-green-50/70 p-4">
      <Field label="Ajouter des photos">
        <input
          name="photos"
          type="file"
          multiple
          required
          accept={ACCEPT_ATTR}
          className="text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-green-700 file:px-3 file:py-1.5 file:font-semibold file:text-white hover:file:bg-green-800"
        />
      </Field>
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
        JPEG, PNG, WebP ou GIF, {MAX_PHOTO_BYTES / 1024 / 1024} Mo maximum par photo, {MAX_PHOTOS_PER_UPLOAD} photos par
        envoi.{hint && ` ${hint}`}
      </p>
      <button className="btn justify-self-start">
        <Icon name="plus" />
        {submitLabel}
      </button>
    </form>
  );
}
