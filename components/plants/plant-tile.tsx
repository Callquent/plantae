import Link from "next/link";
import Cover from "@/components/photos/cover";
import Gauge from "@/components/ui/gauge";
import { Icon } from "@/components/ui/icons";
import { waterPlantAction } from "@/lib/plants/actions";
import { coverPhoto, latestHealth, wateringGauge } from "@/lib/plants/status";
import type { Plant } from "@/lib/plants/types";
import HealthBadge from "./health-badge";

export default function PlantTile({ plant }: { plant: Plant }) {
  const g = wateringGauge(plant);
  const health = latestHealth(plant);
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line transition-shadow hover:shadow-lg hover:shadow-green-900/10">
      <Link href={`/plantes/${plant.id}`} className="relative block aspect-[5/4] bg-green-100" aria-label={plant.name}>
        <Cover file={coverPhoto(plant)?.file} iconClassName="h-14 w-14" />
        {health && (
          <HealthBadge
            health={health.health}
            className="absolute bottom-2 left-2 text-[11px] shadow-sm sm:px-2.5 sm:text-xs"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <div>
          <h2 className="text-base leading-tight sm:text-xl">
            <Link href={`/plantes/${plant.id}`} className="hover:underline">
              {plant.name}
            </Link>
          </h2>
          {plant.species && <p className="text-xs italic text-muted sm:text-sm">{plant.species}</p>}
        </div>
        <Gauge ratio={g.ratio} tone={g.tone} caption={g.caption} label={`Arrosage de ${plant.name}`} />
        <ul className="flex flex-col gap-y-1 text-xs text-muted sm:flex-row sm:flex-wrap sm:gap-x-4 sm:text-sm">
          <li className="flex items-center gap-1.5">
            <Icon name="pin" />
            {plant.location || "Sans emplacement"}
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="sun" />
            Lumière {plant.light}
          </li>
          <li className="flex items-center gap-1.5">
            <Icon name="drop" />
            Tous les {plant.wateringEveryDays} j
          </li>
        </ul>
        <form action={waterPlantAction.bind(null, plant.id)} className="mt-auto">
          <button className="btn-quiet w-full">
            <Icon name="drop" />
            Arrosée<span className="hidden sm:inline"> aujourd'hui</span>
          </button>
        </form>
      </div>
    </li>
  );
}
