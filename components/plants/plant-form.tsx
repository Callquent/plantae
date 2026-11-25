import PhotoPicker from "@/components/photos/photo-picker";
import Field from "@/components/ui/field";
import { todayISO } from "@/lib/dates";
import { LIGHT_LABELS, LIGHTS, type Plant } from "@/lib/plants/types";

export default function PlantForm({
  action,
  plant,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  plant?: Plant;
  submitLabel: string;
}) {
  return (
    <form action={action} className="panel grid gap-4">
      {!plant && (
        <PhotoPicker hint="Facultatif. Vous pourrez en ajouter d'autres plus tard dans le journal photo de la plante." />
      )}
      <Field label="Nom">
        <input name="name" required defaultValue={plant?.name} className="field" placeholder="Ma monstera" />
      </Field>
      <Field label="Espèce">
        <input name="species" defaultValue={plant?.species} className="field italic" placeholder="Monstera deliciosa" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pièce ou emplacement">
          <input name="location" defaultValue={plant?.location} className="field" placeholder="Salon" />
        </Field>
        <Field label="Luminosité">
          <select name="light" defaultValue={plant?.light ?? "moyenne"} className="field">
            {LIGHTS.map((l) => (
              <option key={l} value={l}>
                {LIGHT_LABELS[l]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Arrosage tous les (jours)">
          <input
            name="wateringEveryDays"
            type="number"
            min={1}
            defaultValue={plant?.wateringEveryDays ?? 7}
            className="field"
          />
        </Field>
        <Field label="Dernier arrosage">
          <input name="lastWatered" type="date" defaultValue={plant?.lastWatered ?? todayISO()} className="field" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={plant?.notes} className="field" />
      </Field>
      <button className="btn justify-self-start">{submitLabel}</button>
    </form>
  );
}
