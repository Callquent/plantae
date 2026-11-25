import Link from "next/link";
import WateringCalendar from "@/components/dashboard/calendar";
import TodayTasks from "@/components/dashboard/today-tasks";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { parseMonth } from "@/lib/calendar/month";
import { todayTasks } from "@/lib/calendar/today-tasks";
import { isIsoDate, todayISO } from "@/lib/dates";
import { listPlants } from "@/lib/plants/service";
import { listSeedlings } from "@/lib/seedlings/service";

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
        <EmptyState
          icon="leaf"
          actions={
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
          }
        >
          Le calendrier se remplira dès que vous aurez ajouté un semis ou une plante.
        </EmptyState>
      ) : (
        <>
          <TodayTasks tasks={todayTasks(plants, seedlings)} />
          <WateringCalendar
            plants={plants}
            seedlings={seedlings}
            year={year}
            month={month}
            currentMonth={currentMonth}
            selected={isIsoDate(jour) ? jour : undefined}
          />
        </>
      )}
    </div>
  );
}
