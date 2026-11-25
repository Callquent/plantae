import { shiftISO, todayISO, utcDate } from "@/lib/dates";
import { projectedWaterings } from "@/lib/plants/status";
import type { Plant } from "@/lib/plants/types";
import { expectedGermination } from "@/lib/seedlings/status";
import type { Seedling } from "@/lib/seedlings/types";

export type EventKind =
  | "done" // arrosage effectué
  | "planned" // arrosage prévu
  | "due" // arrosage à faire aujourd'hui
  | "overdue" // arrosage en retard
  | "tosow" // semis prévu (date à venir)
  | "sown" // semis réalisé
  | "expected" // levée attendue
  | "late" // levée attendue mais pas encore constatée
  | "germinated" // levée constatée
  | "photo"; // photo ajoutée

export type CalendarEvent = { id: string; href: string; name: string; kind: EventKind };

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
};

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Valide le paramètre ?mois=YYYY-MM ; retourne le mois courant s'il est absent ou invalide. */
export function parseMonth(param: string | undefined): { year: number; month: number } {
  const m = param ? MONTH_RE.exec(param) : null;
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const t = todayISO();
  return { year: Number(t.slice(0, 4)), month: Number(t.slice(5, 7)) };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

/** Fabrique d'événements pour un élément (plante ou semis) : il ne reste qu'à donner le type. */
const eventsFor = (id: string, href: string, name: string) => (kind: EventKind): CalendarEvent => ({ id, href, name, kind });

/**
 * Construit la grille d'un mois (semaines du lundi au dimanche) avec, pour chaque jour :
 * - les arrosages réalisés (historique),
 * - les arrosages à venir, projetés à partir du dernier arrosage et de la fréquence,
 * - les arrosages en retard (échéance dépassée et pas encore effectuée),
 * - pour les semis : la date de semis, la levée attendue (ou en retard) et la levée constatée.
 */
export function buildMonth(plants: Plant[], seedlings: Seedling[], year: number, month: number): CalendarDay[][] {
  const today = todayISO();
  const first = monthKey(year, month) + "-01";
  const offset = (utcDate(first).getUTCDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const gridStart = shiftISO(first, -offset);
  const lastOfMonth = shiftISO(first, daysInMonth - 1);
  const tail = (7 - ((offset + daysInMonth) % 7)) % 7;
  const gridEnd = shiftISO(lastOfMonth, tail);

  const byDate = new Map<string, CalendarEvent[]>();
  const push = (date: string, ev: CalendarEvent) => {
    if (date < gridStart || date > gridEnd) return;
    const list = byDate.get(date) ?? [];
    list.push(ev);
    byDate.set(date, list);
  };
  const pushPhotoDays = (photos: { date: string }[], ev: (kind: EventKind) => CalendarEvent) => {
    for (const date of new Set(photos.map((p) => p.date))) push(date, ev("photo"));
  };

  for (const plant of plants) {
    const ev = eventsFor(plant.id, `/plantes/${plant.id}`, plant.name);
    for (const date of plant.waterings) push(date, ev("done"));
    pushPhotoDays(plant.photos, ev);

    // Prochaine échéance : en retard si elle est passée, sinon prévue (ou « à faire aujourd'hui »).
    const { due, later } = projectedWaterings(plant, today, gridEnd);
    push(due, ev(due < today ? "overdue" : due === today ? "due" : "planned"));
    for (const date of later) push(date, ev("planned"));
  }

  for (const seedling of seedlings) {
    const ev = eventsFor(seedling.id, `/semis/${seedling.id}`, seedling.name);
    push(seedling.sownOn, ev(seedling.sownOn > today ? "tosow" : "sown"));
    pushPhotoDays(seedling.photos, ev);
    if (seedling.status === "seme") {
      const expected = expectedGermination(seedling);
      push(expected, ev(expected < today ? "late" : "expected"));
    } else if (seedling.germinatedOn && (seedling.status === "leve" || seedling.status === "transplante")) {
      push(seedling.germinatedOn, ev("germinated"));
    }
  }

  const weeks: CalendarDay[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: cursor,
        day: Number(cursor.slice(8, 10)),
        inMonth: cursor.slice(0, 7) === monthKey(year, month),
        isToday: cursor === today,
        events: (byDate.get(cursor) ?? []).sort((a, b) => a.name.localeCompare(b.name, "fr")),
      });
      cursor = shiftISO(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
