// Dates fournies à l'application « Agenda » (voir app/api/agenda/route.ts).
// Fonction pure : pas d'accès à la base, elle se teste seule.
import { isIsoDate, shiftISO } from "@/lib/dates";
import { projectedWaterings } from "@/lib/plants/status";
import type { Plant } from "@/lib/plants/types";
import { expectedGermination } from "@/lib/seedlings/status";
import type { Seedling } from "@/lib/seedlings/types";

export type AgendaEvent = {
  id: string; // unique pour chaque occurrence
  title: string;
  date: string; // YYYY-MM-DD
  status: "todo" | "done" | "late";
  category: string;
  path: string; // chemin dans l'application
};

const MAX_DAYS = 400;

/** Valide ?from=&to= : dates réelles, ordre correct, plage limitée. Renvoie null si invalide. */
export function parseRange(from: string | null, to: string | null): { from: string; to: string } | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  if (shiftISO(from, 0) !== from || shiftISO(to, 0) !== to || to < from) return null;
  const span = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  return span > MAX_DAYS ? null : { from, to };
}

export function agendaEvents(plants: Plant[], seedlings: Seedling[], from: string, to: string, today: string): AgendaEvent[] {
  const out: AgendaEvent[] = [];
  const push = (e: AgendaEvent) => {
    if (e.date >= from && e.date <= to) out.push(e);
  };

  for (const p of plants) {
    const path = `/plantes/${p.id}`;
    const title = `Arrosage : ${p.name}`;
    const watering = (id: string, date: string, status: AgendaEvent["status"]) =>
      push({ id, title, date, status, category: "Arrosage", path });

    for (const date of p.waterings) watering(`w-done-${p.id}-${date}`, date, "done");
    // Prochaine échéance : en retard si elle est passée, sinon prévue ; puis les échéances suivantes.
    const { due, later } = projectedWaterings(p, today, to);
    watering(`w-${p.id}-${due}`, due, due < today ? "late" : "todo");
    for (const date of later) watering(`w-${p.id}-${date}`, date, "todo");
  }

  for (const s of seedlings) {
    const path = `/semis/${s.id}`;
    push({ id: `s-sow-${s.id}`, title: `Semis : ${s.name}`, date: s.sownOn, status: s.sownOn > today ? "todo" : "done", category: "Semis", path });
    if (s.status === "seme") {
      const expected = expectedGermination(s);
      push({ id: `s-germ-${s.id}`, title: `Levée attendue : ${s.name}`, date: expected, status: expected < today ? "late" : "todo", category: "Semis", path });
    } else if (s.germinatedOn && (s.status === "leve" || s.status === "transplante")) {
      push({ id: `s-leve-${s.id}`, title: `Levée : ${s.name}`, date: s.germinatedOn, status: "done", category: "Semis", path });
    }
  }
  return out;
}
