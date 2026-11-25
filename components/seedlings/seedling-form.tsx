import PhotoPicker from "@/components/photos/photo-picker";
import Field from "@/components/ui/field";
import { todayISO } from "@/lib/dates";
import type { Seedling } from "@/lib/seedlings/types";

export default function SeedlingForm({
  action,
  seedling,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  seedling?: Seedling;
  submitLabel: string;
}) {
  return (
    <form action={action} className="panel grid gap-4">
      {!seedling && <PhotoPicker hint="Facultatif. Vous pourrez en ajouter d'autres plus tard sur la fiche du semis." />}
      <Field label="Nom">
        <input name="name" required defaultValue={seedling?.name} className="field" placeholder="Tomates cerises" />
      </Field>
      <Field label="Espèce ou variété">
        <input name="species" defaultValue={seedling?.species} className="field italic" placeholder="Solanum lycopersicum" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date de semis" hint="Une date à venir planifie le semis dans le calendrier.">
          <input name="sownOn" type="date" defaultValue={seedling?.sownOn ?? todayISO()} className="field" />
        </Field>
        <Field label="Nombre de graines semées">
          <input name="quantity" type="number" min={1} defaultValue={seedling?.quantity ?? 6} className="field" />
        </Field>
        <Field label="Levée attendue après (jours)">
          <input
            name="germinationDays"
            type="number"
            min={1}
            defaultValue={seedling?.germinationDays ?? 10}
            className="field"
          />
        </Field>
        <Field label="Emplacement">
          <input name="location" defaultValue={seedling?.location} className="field" placeholder="Rebord de fenêtre, mini-serre…" />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={seedling?.notes}
          className="field"
          placeholder="Terreau, chaleur, trempage des graines…"
        />
      </Field>
      <button className="btn justify-self-start">{submitLabel}</button>
    </form>
  );
}
