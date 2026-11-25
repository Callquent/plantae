// Règles de calcul sur une plante (arrosage, photo de couverture, santé). Fonctions pures : aucun accès à la base.
import { diffDays, shiftISO, todayISO } from "@/lib/dates";
import type { GaugeState } from "@/lib/gauge";
import type { Health, Plant, PlantPhoto } from "./types";

/** Intervalle d'arrosage en jours (au moins 1). */
export const wateringStep = (plant: Plant): number => Math.max(1, plant.wateringEveryDays);

/** Date du prochain arrosage (YYYY-MM-DD). */
export const nextWateringISO = (plant: Plant): string => shiftISO(plant.lastWatered, wateringStep(plant));

/** Nombre de jours avant le prochain arrosage (négatif = en retard). */
export const daysUntilWatering = (plant: Plant): number => diffDays(todayISO(), nextWateringISO(plant));

/**
 * Arrosages à venir jusqu'à `until` : la prochaine échéance (`due`, éventuellement passée) puis les
 * suivantes (`later`). On suppose un arrosage au plus tard le jour de l'échéance (aujourd'hui si en retard).
 */
export function projectedWaterings(plant: Plant, today: string, until: string): { due: string; later: string[] } {
  const due = nextWateringISO(plant);
  const step = wateringStep(plant);
  const later: string[] = [];
  for (let next = shiftISO(due < today ? today : due, step), guard = 0; next <= until && guard < 1000; next = shiftISO(next, step), guard++) {
    later.push(next);
  }
  return { due, later };
}

/** Intervalle moyen (en jours) entre deux arrosages consécutifs, ou null s'il y en a moins de deux. */
export function averageInterval(plant: Plant): number | null {
  const d = plant.waterings;
  if (d.length < 2) return null;
  return Math.round((diffDays(d[d.length - 1], d[0]) / (d.length - 1)) * 10) / 10;
}

/** Photo de couverture : la plus récente du journal. */
export const coverPhoto = (plant: Plant): PlantPhoto | undefined => plant.photos[0];

/** Dernier état de santé renseigné dans le journal. */
export function latestHealth(plant: Plant): { health: Health; date: string } | undefined {
  const p = plant.photos.find((ph) => ph.health);
  return p?.health ? { health: p.health, date: p.date } : undefined;
}

/** Avancement vers le prochain arrosage : la jauge est pleine le jour de l'échéance. */
export function wateringGauge(plant: Plant): GaugeState {
  const days = daysUntilWatering(plant);
  const elapsed = diffDays(plant.lastWatered, todayISO());
  const ratio = plant.wateringEveryDays > 0 ? elapsed / plant.wateringEveryDays : 1;
  if (days < 0) return { ratio: 1, tone: "alert", caption: `En retard de ${-days} j` };
  if (days === 0) return { ratio: 1, tone: "sun", caption: "À arroser aujourd'hui" };
  if (days === 1) return { ratio, tone: "rain", caption: "À arroser demain" };
  return { ratio, tone: "rain", caption: `Prochain arrosage dans ${days} j` };
}
