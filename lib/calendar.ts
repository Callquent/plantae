import { daysUntilWatering, nextWateringDate, todayISO, type Plant } from "./plants";
import { diffDays, expectedGermination, type Seedling } from "./seedlings";

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

/** Arithmétique de dates en UTC : aucun décalage possible lié à l'heure d'été. */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

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

/**
 * Construit la grille d'un mois (semaines du lundi au dimanche) avec, pour chaque jour :
 * - les arrosages réalisés (historique),
 * - les arrosages à venir, projetés à partir du dernier arrosage et de la fréquence,
 * - les arrosages en retard (échéance dépassée et pas encore effectuée),
 * - pour les semis : la date de semis, la levée attendue (ou en retard) et la levée constatée.
 */
export function buildMonth(
  plants: Plant[],
  seedlings: Seedling[],
  year: number,
  month: number,
): CalendarDay[][] {
  const today = todayISO();
  const first = monthKey(year, month) + "-01";
  const offset = (utcDate(first).getUTCDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const gridStart = addDays(first, -offset);
  const lastOfMonth = addDays(first, daysInMonth - 1);
  const tail = (7 - ((offset + daysInMonth) % 7)) % 7;
  const gridEnd = addDays(lastOfMonth, tail);

  const byDate = new Map<string, CalendarEvent[]>();
  const push = (date: string, ev: CalendarEvent) => {
    if (date < gridStart || date > gridEnd) return;
    const list = byDate.get(date) ?? [];
    list.push(ev);
    byDate.set(date, list);
  };

  for (const plant of plants) {
    const ev = (kind: EventKind): CalendarEvent => ({
      id: plant.id,
      href: `/plantes/${plant.id}`,
      name: plant.name,
      kind,
    });
    for (const date of plant.waterings) push(date, ev("done"));
    for (const date of new Set(plant.photos.map((p) => p.date))) push(date, ev("photo"));

    const due = nextWateringDate(plant);
    const dueISO = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    const step = Math.max(1, plant.wateringEveryDays);

    // Prochaine échéance : en retard si elle est passée, sinon prévue (ou "à faire aujourd'hui").
    if (dueISO < today) push(dueISO, ev("overdue"));
    else push(dueISO, ev(dueISO === today ? "due" : "planned"));

    // Échéances suivantes : on suppose un arrosage au plus tard le jour de l'échéance (ou aujourd'hui si en retard).
    let next = addDays(dueISO < today ? today : dueISO, step);
    while (next <= gridEnd) {
      push(next, ev("planned"));
      next = addDays(next, step);
    }
  }

  for (const seedling of seedlings) {
    const ev = (kind: EventKind): CalendarEvent => ({
      id: seedling.id,
      href: `/semis/${seedling.id}`,
      name: seedling.name,
      kind,
    });
    push(seedling.sownOn, ev(seedling.sownOn > today ? "tosow" : "sown"));
    for (const date of new Set(seedling.photos.map((p) => p.date))) push(date, ev("photo"));
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
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export type TodayTask = {
  key: string;
  kind: "water" | "sow" | "germination" | "transplant";
  href: string;
  id: string;
  name: string;
  text: string;
  late: boolean;
};

/**
 * Ce qu'il y a à faire aujourd'hui : arrosages dus ou en retard, semis à faire ce jour,
 * levées à constater (attendues aujourd'hui ou en retard) et semis levés à transplanter.
 * Les plus urgents d'abord.
 */
export function todayTasks(plants: Plant[], seedlings: Seedling[]): TodayTask[] {
  const today = todayISO();
  const tasks: TodayTask[] = [];

  for (const p of plants) {
    const days = daysUntilWatering(p);
    if (days > 0) continue;
    tasks.push({
      key: `w-${p.id}`,
      kind: "water",
      href: `/plantes/${p.id}`,
      id: p.id,
      name: p.name,
      text: days === 0 ? "À arroser aujourd'hui" : `Arrosage en retard de ${-days} j`,
      late: days < 0,
    });
  }

  for (const s of seedlings) {
    const href = `/semis/${s.id}`;
    if (s.status === "seme") {
      // Planifié à l'avance (créé avant sa date) et prévu aujourd'hui : il reste à le semer.
      if (s.sownOn === today && s.createdAt.slice(0, 10) < today) {
        tasks.push({ key: `s-${s.id}`, kind: "sow", href, id: s.id, name: s.name, text: "À semer aujourd'hui", late: false });
      }
      if (s.sownOn <= today) {
        const days = diffDays(today, expectedGermination(s));
        if (days <= 0) {
          tasks.push({
            key: `g-${s.id}`,
            kind: "germination",
            href,
            id: s.id,
            name: s.name,
            text: days === 0 ? "Levée attendue aujourd'hui" : `Levée attendue depuis ${-days} j`,
            late: days < 0,
          });
        }
      }
    } else if (s.status === "leve") {
      tasks.push({ key: `t-${s.id}`, kind: "transplant", href, id: s.id, name: s.name, text: "Levé : à transplanter", late: false });
    }
  }

  return tasks.sort((a, b) => Number(b.late) - Number(a.late) || a.name.localeCompare(b.name, "fr"));
}
