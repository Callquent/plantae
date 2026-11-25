import { diffDays, todayISO } from "@/lib/dates";
import { daysUntilWatering } from "@/lib/plants/status";
import type { Plant } from "@/lib/plants/types";
import { expectedGermination } from "@/lib/seedlings/status";
import type { Seedling } from "@/lib/seedlings/types";

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
