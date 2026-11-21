import Link from "next/link";
import { parseMonth, todayTasks } from "@/lib/calendar";
import { listPlants, todayISO } from "@/lib/plants";
import { listSeedlings } from "@/lib/seedlings";
import WateringCalendar from "./calendar";
import { Icon } from "./icons";
import TodayTasks from "./today-tasks";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ mois?: string; jour?: string }> }) {
  const { mois, jour } = await searchParams;
  const { year, month } = parseMonth(mois);
  const currentMonth = todayISO().slice(0, 7);
  const [plants, seedlings] = await Promise.all([listPlants(), listSeedlings()]);

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl sm:text-4xl">Tableau de bord</h1>

      {plants.length === 0 && seedlings.length === 0 ? (
        <div className="panel grid justify-items-center gap-4 py-12 text-center">
          <Icon name="leaf" className="h-10 w-10 text-green-400" />
          <p className="max-w-sm text-muted">
            Le calendrier se remplira dès que vous aurez ajouté un semis ou une plante.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/semis/nouveau" className="btn">
              <Icon name="sprout" />
              Ajouter un semis
            </Link>
            <Link href="/plantes/nouvelle" className="btn-quiet">
              <Icon name="leaf" />
              Ajouter une plante
            </Link>
          </div>
        </div>
      ) : (
        <>
          <TodayTasks tasks={todayTasks(plants, seedlings)} />
          <WateringCalendar
            plants={plants}
            seedlings={seedlings}
            year={year}
            month={month}
            currentMonth={currentMonth}
            selected={jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : undefined}
          />
        </>
      )}
    </div>
  );
}
