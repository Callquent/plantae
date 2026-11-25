// Règles de calcul sur un semis (levée attendue, avancement). Fonctions pures : aucun accès à la base.
import { diffDays, shiftISO, todayISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { GaugeState } from "@/lib/gauge";
import type { Seedling } from "./types";

export const expectedGermination = (s: Seedling): string => shiftISO(s.sownOn, s.germinationDays);

/** Phrase décrivant où en est le semis (levée attendue, retard, levée constatée…). */
export function progress(s: Seedling): { text: string; late: boolean } {
  if (s.status === "seme") {
    const toSow = diffDays(todayISO(), s.sownOn);
    if (toSow > 0) return { text: `Semis prévu le ${formatDate(s.sownOn)} (dans ${toSow} j)`, late: false };
    const expected = expectedGermination(s);
    const days = diffDays(todayISO(), expected);
    if (days > 1) return { text: `Levée attendue le ${formatDate(expected)} (dans ${days} j)`, late: false };
    if (days === 1) return { text: "Levée attendue demain", late: false };
    if (days === 0) return { text: "Levée attendue aujourd'hui", late: false };
    return { text: `Levée attendue depuis ${-days} j (prévue le ${formatDate(expected)})`, late: true };
  }
  if (s.status === "leve" && s.germinatedOn) {
    const took = diffDays(s.sownOn, s.germinatedOn);
    const count = s.germinatedCount ?? s.quantity;
    return {
      text: `${count}/${s.quantity} levé${count > 1 ? "s" : ""} le ${formatDate(s.germinatedOn)} (après ${took} j)`,
      late: false,
    };
  }
  if (s.status === "transplante") return { text: "Transplanté : la plante est dans votre collection", late: false };
  return { text: "Semis non abouti", late: false };
}

/** Avancement vers la levée attendue : la jauge est pleine à la date prévue. */
export function germinationGauge(s: Seedling): GaugeState | undefined {
  if (s.status !== "seme") return undefined;
  const toSow = diffDays(todayISO(), s.sownOn);
  if (toSow > 0) return { ratio: 0, tone: "leaf", caption: toSow === 1 ? "À semer demain" : `À semer dans ${toSow} j` };
  const days = diffDays(todayISO(), expectedGermination(s));
  const elapsed = diffDays(s.sownOn, todayISO());
  const ratio = s.germinationDays > 0 ? elapsed / s.germinationDays : 1;
  if (days < 0) return { ratio: 1, tone: "alert", caption: `Levée attendue depuis ${-days} j` };
  if (days === 0) return { ratio: 1, tone: "sun", caption: "Levée attendue aujourd'hui" };
  if (days === 1) return { ratio, tone: "leaf", caption: "Levée attendue demain" };
  return { ratio, tone: "leaf", caption: `Levée attendue dans ${days} j` };
}
