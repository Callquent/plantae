import { utcDate } from "./dates";

const opts = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { ...o, timeZone: "UTC" });
const date = opts({ day: "numeric", month: "long", year: "numeric" });
const longDate = opts({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const day = opts({ weekday: "long", day: "numeric", month: "long" });
const month = opts({ month: "long", year: "numeric" });

/** « 5 mars 2026 » */
export const formatDate = (iso: string) => date.format(utcDate(iso));
/** « jeudi 5 mars 2026 » */
export const formatLongDate = (iso: string) => longDate.format(utcDate(iso));
/** « jeudi 5 mars » */
export const formatDay = (iso: string) => day.format(utcDate(iso));
/** « mars 2026 » */
export const formatMonth = (year: number, m: number) => month.format(new Date(Date.UTC(year, m - 1, 1)));
