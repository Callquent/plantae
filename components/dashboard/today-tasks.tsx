import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import type { TodayTask } from "@/lib/calendar/today-tasks";
import { todayISO } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { waterPlantAction } from "@/lib/plants/actions";
import { quickGerminateAction } from "@/lib/seedlings/actions";

const ICONS: Record<TodayTask["kind"], IconName> = {
  water: "drop",
  sow: "seed",
  germination: "hourglass",
  transplant: "leaf",
};

/** « À faire aujourd'hui » : arrosages, semis, levées et transplantations du jour. */
export default function TodayTasks({ tasks }: { tasks: TodayTask[] }) {
  return (
    <section aria-labelledby="aujourdhui" className="panel grid gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="aujourdhui" className="text-2xl">
          À faire aujourd'hui
        </h2>
        <p className="text-sm capitalize text-muted">{formatDay(todayISO())}</p>
      </div>

      {tasks.length === 0 ? (
        <p className="flex items-center gap-2 text-muted">
          <Icon name="check" className="h-4 w-4 text-green-600" />
          Rien à faire aujourd'hui.
        </p>
      ) : (
        <ul className="grid gap-2">
          {tasks.map((t) => (
            <li
              key={t.key}
              className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2.5 ring-1 ${
                t.late ? "bg-alert/10 ring-alert/40" : "bg-green-50/70 ring-line"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  t.late ? "bg-alert text-white" : "bg-green-700 text-white"
                }`}
              >
                <Icon name={ICONS[t.kind]} className="h-4 w-4" />
              </span>
              <Link href={t.href} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.name}</span>
                <span className={`block text-sm ${t.late ? "font-medium text-alert" : "text-muted"}`}>{t.text}</span>
              </Link>
              {t.kind === "water" && (
                <form action={waterPlantAction.bind(null, t.id)}>
                  <button className="btn-quiet">
                    <Icon name="drop" />
                    Arrosée
                  </button>
                </form>
              )}
              {t.kind === "germination" && (
                <form action={quickGerminateAction.bind(null, t.id)}>
                  <button className="btn-quiet">
                    <Icon name="sprout" />
                    Levé
                  </button>
                </form>
              )}
              {(t.kind === "transplant" || t.kind === "sow") && (
                <Link href={t.href} className="btn-quiet">
                  {t.kind === "transplant" ? "Transplanter" : "Ouvrir"}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
