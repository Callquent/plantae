// Dates fournies à l'application « Agenda » (voir app/api/agenda/route.ts).
// Fonction pure : pas d'accès à la base, elle se teste seule.
import type { Plant } from "./plants";
import type { Seedling } from "./seedlings";

export type AgendaEvent = {
  id: string; // unique pour chaque occurrence
  title: string;
  date: string; // YYYY-MM-DD
  status: "todo" | "done" | "late";
  category: string;
  path: string; // chemin dans l'application
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400;

/** Arithmétique de dates en UTC : aucun décalage possible lié à l'heure d'été. */
function shift(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Valide ?from=&to= : dates réelles, ordre correct, plage limitée. Renvoie null si invalide. */
export function parseRange(from: string | null, to: string | null): { from: string; to: string } | null {
  if (!from || !to || !ISO.test(from) || !ISO.test(to)) return null;
  if (shift(from, 0) !== from || shift(to, 0) !== to || to < from) return null;
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
    for (const date of p.waterings) push({ id: `w-done-${p.id}-${date}`, title, date, status: "done", category: "Arrosage", path });

    const step = Math.max(1, p.wateringEveryDays);
    const due = shift(p.lastWatered, step);
    // Prochaine échéance : en retard si elle est passée, sinon prévue.
    push({ id: `w-${p.id}-${due}`, title, date: due, status: due < today ? "late" : "todo", category: "Arrosage", path });
    // Échéances suivantes : on suppose un arrosage au plus tard le jour de l'échéance (aujourd'hui si en retard).
    for (let next = shift(due < today ? today : due, step), guard = 0; next <= to && guard < 1000; next = shift(next, step), guard++) {
      push({ id: `w-${p.id}-${next}`, title, date: next, status: "todo", category: "Arrosage", path });
    }
  }

  for (const s of seedlings) {
    const path = `/semis/${s.id}`;
    push({ id: `s-sow-${s.id}`, title: `Semis : ${s.name}`, date: s.sownOn, status: s.sownOn > today ? "todo" : "done", category: "Semis", path });
    if (s.status === "seme") {
      const expected = shift(s.sownOn, s.germinationDays);
      push({ id: `s-germ-${s.id}`, title: `Levée attendue : ${s.name}`, date: expected, status: expected < today ? "late" : "todo", category: "Semis", path });
    } else if (s.germinatedOn && (s.status === "leve" || s.status === "transplante")) {
      push({ id: `s-leve-${s.id}`, title: `Levée : ${s.name}`, date: s.germinatedOn, status: "done", category: "Semis", path });
    }
  }
  return out;
}
