/**
 * Dates ISO (YYYY-MM-DD) : validation, calcul et tri, définis une seule fois pour toute l'application.
 * Les calculs passent par l'UTC : aucun décalage possible lié à l'heure d'été.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (value: string | null | undefined): value is string => !!value && ISO_DATE.test(value);

export const nowISO = () => new Date().toISOString();

/** Date du jour dans le fuseau local (YYYY-MM-DD). */
export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function utcDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Ajoute (ou retire) des jours à une date ISO. */
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Nombre de jours entre deux dates ISO (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((utcDate(b).getTime() - utcDate(a).getTime()) / 86_400_000);
}

/** Date saisie valide et non future, sinon aujourd'hui. */
export function pastOrToday(date: string | undefined): string {
  const today = todayISO();
  return isIsoDate(date) && date <= today ? date : today;
}

/** Comparateur : le plus récent d'abord. */
export const descending = (a: string, b: string): number => (a < b ? 1 : a > b ? -1 : 0);

/** Tri par date décroissante (le tri est stable : les ajouts du jour restent en tête). */
export const newestFirst = <T extends { date: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => descending(a.date, b.date));
