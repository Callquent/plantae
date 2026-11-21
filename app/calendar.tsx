import Link from "next/link";
import { buildMonth, monthKey, shiftMonth, type EventKind } from "@/lib/calendar";
import type { Plant } from "@/lib/plants";
import type { Seedling } from "@/lib/seedlings";
import { Icon, type IconName } from "./icons";
import { KINDS, PLANT_KINDS, SEEDLING_KINDS } from "./kinds";

const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MAX_VISIBLE = 3;

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default function WateringCalendar({
  plants,
  seedlings,
  year,
  month,
  currentMonth,
  selected,
}: {
  plants: Plant[];
  seedlings: Seedling[];
  year: number;
  month: number;
  currentMonth: string;
  selected?: string; // jour dont on affiche le détail (YYYY-MM-DD)
}) {
  const weeks = buildMonth(plants, seedlings, year, month);
  const label = monthFmt.format(new Date(Date.UTC(year, month - 1, 1)));
  const key = monthKey(year, month);
  const nav =
    "grid h-9 w-9 place-items-center rounded-lg text-green-800 shadow-[inset_0_0_0_1px_var(--color-green-300)] hover:bg-green-100";

  // Nombre d'événements de chaque type dans le mois affiché (hors jours des mois voisins)
  const counts = new Map<EventKind, number>();
  for (const day of weeks.flat()) {
    if (!day.inMonth) continue;
    for (const ev of day.events) counts.set(ev.kind, (counts.get(ev.kind) ?? 0) + 1);
  }
  // Liste du mois : tout ce qui a été fait (jours passés) et tout ce qui est prévu.
  const agenda = weeks
    .flat()
    .filter((d) => d.inMonth && d.events.length > 0);
  const selectedDay = selected ? weeks.flat().find((d) => d.date === selected) : undefined;
  const dayHref = (date: string) => `/?mois=${key}&jour=${date}#jour`;
  const groups: { id: string; title: string; icon: IconName; kinds: EventKind[] }[] = [
    { id: "legende-arrosage", title: "Arrosage", icon: "drop", kinds: PLANT_KINDS },
    ...(seedlings.length > 0
      ? [{ id: "legende-semis", title: "Semis", icon: "sprout" as const, kinds: SEEDLING_KINDS }]
      : []),
  ];

  return (
    <section aria-labelledby="calendrier" className="panel grid gap-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="calendrier" className="text-2xl capitalize sm:text-3xl">
          {label}
        </h2>
        <nav aria-label="Navigation du calendrier" className="flex items-center gap-2">
          {key !== currentMonth && (
            <Link href="/" className="btn-quiet">
              Aujourd'hui
            </Link>
          )}
          <Link href={`/?mois=${shiftMonth(year, month, -1)}`} className={nav} aria-label="Mois précédent">
            <Icon name="left" />
          </Link>
          <Link href={`/?mois=${shiftMonth(year, month, 1)}`} className={nav} aria-label="Mois suivant">
            <Icon name="right" />
          </Link>
        </nav>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line text-xs shadow-[0_0_0_1px_var(--color-line)]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-green-50 py-2 text-center font-medium text-muted">
            {d}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const visible = day.events.slice(0, MAX_VISIBLE);
          const hidden = day.events.length - visible.length;
          return (
            <div
              key={day.date}
              className={`min-h-14 p-1 sm:min-h-24 sm:p-1.5 ${day.inMonth ? "bg-surface" : "bg-green-50/80"} ${
                day.date === selected ? "relative z-10 ring-2 ring-inset ring-green-600" : ""
              }`}
              aria-label={dayFmt.format(new Date(day.date + "T00:00:00Z"))}
            >
              <Link
                href={dayHref(day.date)}
                aria-label={`Voir le détail du ${dayFmt.format(new Date(day.date + "T00:00:00Z"))}`}
                className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs hover:ring-2 hover:ring-green-300 ${
                  day.isToday
                    ? "bg-ink font-semibold text-surface"
                    : day.inMonth
                      ? "font-medium text-ink"
                      : "text-muted/60"
                }`}
              >
                {day.day}
              </Link>
              {/* Téléphone : des pastilles de couleur ; le détail est dans la liste sous le calendrier */}
              <ul className="flex flex-wrap gap-1 sm:hidden" aria-hidden>
                {day.events.slice(0, 6).map((ev) => (
                  <li key={`${ev.id}-${ev.kind}`} className={`h-2.5 w-2.5 rounded-full ${KINDS[ev.kind].dot}`} />
                ))}
              </ul>
              <ul className="hidden gap-1 sm:grid">
                {visible.map((ev) => {
                  const k = KINDS[ev.kind];
                  return (
                    <li key={`${ev.id}-${ev.kind}`} className="min-w-0">
                      <Link
                        href={ev.href}
                        title={`${ev.name} : ${k.label}`}
                        className={`flex items-center gap-1 truncate rounded-r-md border-l-2 px-1 py-0.5 text-[11px] leading-tight hover:brightness-95 ${k.chip} ${
                          day.inMonth ? "" : "opacity-60"
                        }`}
                      >
                        <Icon name={k.icon} className="h-3 w-3" />
                        <span className="truncate">{ev.name}</span>
                        <span className="sr-only"> : {k.label}</span>
                      </Link>
                    </li>
                  );
                })}
                {hidden > 0 && (
                  <li
                    className="px-1 text-[10px] text-muted"
                    title={day.events
                      .slice(MAX_VISIBLE)
                      .map((e) => e.name)
                      .join(", ")}
                  >
                    +{hidden}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Détail d'un jour : tout ce qui y a été fait ou y est prévu */}
      {selectedDay && (
        <div id="jour" className="grid scroll-mt-4 gap-3 rounded-xl bg-green-50/70 p-3 ring-1 ring-line sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-sans text-base font-semibold capitalize tracking-normal">
              {dayFmt.format(new Date(selectedDay.date + "T00:00:00Z"))}
              {selectedDay.isToday && " · aujourd'hui"}
            </h3>
            <Link href={`/?mois=${key}`} className="btn-quiet">
              Fermer
            </Link>
          </div>
          {selectedDay.events.length === 0 ? (
            <p className="text-sm text-muted">Rien de noté ce jour-là.</p>
          ) : (
            <ul className="grid gap-1.5">
              {selectedDay.events.map((ev) => {
                const k = KINDS[ev.kind];
                return (
                  <li key={`${ev.id}-${ev.kind}`}>
                    <Link
                      href={ev.href}
                      className={`flex items-center gap-2 rounded-r-lg border-l-4 px-2.5 py-2 text-sm ${k.chip}`}
                    >
                      <Icon name={k.icon} className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{ev.name}</span>
                      <span className="shrink-0 text-xs">{k.legend}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Téléphone : liste lisible des jours du mois, jours passés compris */}
      {agenda.length > 0 && (
        <div className="grid gap-3 sm:hidden">
          <h3 className="font-sans text-sm font-semibold tracking-normal">Ce mois-ci : fait et à venir</h3>
          <ul className="grid gap-3">
            {agenda.map((day) => (
              <li key={day.date} className="grid gap-1.5">
                <p className={`text-sm font-semibold capitalize ${day.isToday ? "text-green-700" : "text-muted"}`}>
                  {dayFmt.format(new Date(day.date + "T00:00:00Z"))}
                  {day.isToday && " · aujourd'hui"}
                </p>
                <ul className="grid gap-1">
                  {day.events.map((ev) => {
                    const k = KINDS[ev.kind];
                    return (
                      <li key={`${ev.id}-${ev.kind}`}>
                        <Link
                          href={ev.href}
                          className={`flex items-center gap-2 rounded-r-lg border-l-4 px-2.5 py-2 text-sm ${k.chip}`}
                        >
                          <Icon name={k.icon} className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate font-semibold">{ev.name}</span>
                          <span className="shrink-0 text-xs">{k.legend}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`grid gap-x-10 gap-y-5 border-t border-line pt-4 ${groups.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {groups.map((g) => (
          <div key={g.id} role="group" aria-labelledby={g.id} className="grid content-start gap-2">
            <div className="flex items-center gap-2 border-b border-line/70 pb-1.5">
              <Icon name={g.icon} className="h-4 w-4 text-green-600" />
              <h3 id={g.id} className="font-sans text-sm font-semibold tracking-normal">
                {g.title}
              </h3>
              <span className="ml-auto text-xs text-muted">ce mois-ci</span>
            </div>
            <ul className="grid gap-1.5 text-sm">
              {g.kinds.map((k) => {
                const n = counts.get(k) ?? 0;
                return (
                  <li key={k} className={`flex items-center gap-2.5 ${n === 0 ? "opacity-50" : ""}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${KINDS[k].dot}`}>
                      <Icon name={KINDS[k].icon} className="h-3 w-3" />
                    </span>
                    <span className="text-muted">{KINDS[k].legend}</span>
                    <span className="ml-auto font-semibold tabular-nums text-ink">
                      {n}
                      <span className="sr-only"> ce mois-ci</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
