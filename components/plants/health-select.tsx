import { HEALTH_LABELS, HEALTHS, type Health } from "@/lib/plants/types";

/** Liste de l'état de santé d'une plante (« Non précisé » par défaut). */
export default function HealthSelect({ defaultValue = "" }: { defaultValue?: Health | "" }) {
  return (
    <select name="health" defaultValue={defaultValue} className="field">
      <option value="">Non précisé</option>
      {HEALTHS.map((h) => (
        <option key={h} value={h}>
          {HEALTH_LABELS[h]}
        </option>
      ))}
    </select>
  );
}
