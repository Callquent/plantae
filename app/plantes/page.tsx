import Link from "next/link";
import PlantTile from "@/components/plants/plant-tile";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { listPlants } from "@/lib/plants/service";
import { daysUntilWatering } from "@/lib/plants/status";

export const dynamic = "force-dynamic";

export default async function PlantsPage() {
  const plants = await listPlants();
  const due = plants.filter((p) => daysUntilWatering(p) <= 0).length;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl sm:text-4xl">Mes plantes</h1>
          <p className="text-muted">
            {plants.length === 0
              ? "Aucune plante pour l'instant."
              : `${plants.length} plante${plants.length > 1 ? "s" : ""}, ${
                  due > 0 ? `dont ${due} à arroser` : "rien à arroser pour le moment"
                }.`}
          </p>
        </div>
      </div>

      {plants.length === 0 ? (
        <EmptyState
          icon="leaf"
          actions={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/plantes/nouvelle" className="btn">
                <Icon name="plus" />
                Ajouter une plante
              </Link>
              <Link href="/semis" className="btn-quiet">
                <Icon name="sprout" />
                Voir mes semis
              </Link>
            </div>
          }
        >
          Ajoutez votre première plante, ou transplantez un semis levé pour la retrouver ici.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {plants.map((p) => (
            <PlantTile key={p.id} plant={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
