import Link from "next/link";
import SeedlingGroup from "@/components/seedlings/seedling-group";
import EmptyState from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icons";
import { listSeedlings } from "@/lib/seedlings/service";

export const dynamic = "force-dynamic";

export default async function SeedlingsPage() {
  const all = await listSeedlings();
  const sown = all.filter((s) => s.status === "seme");
  const up = all.filter((s) => s.status === "leve");
  const done = all.filter((s) => s.status === "transplante" || s.status === "echec");

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl sm:text-4xl">Mes semis</h1>
          <p className="text-muted">
            {all.length === 0
              ? "Aucun semis pour l'instant."
              : `${sown.length} en attente de levée, ${up.length} à transplanter.`}
          </p>
        </div>
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon="sprout"
          actions={
            <Link href="/semis/nouveau" className="btn">
              <Icon name="plus" />
              Ajouter mon premier semis
            </Link>
          }
        >
          Notez la date et le nombre de graines : l'application prévoit la levée et vous la rappelle dans le calendrier.
        </EmptyState>
      ) : (
        <>
          <SeedlingGroup title="En attente de levée" items={sown} />
          <SeedlingGroup title="Levés, à transplanter" items={up} />
          <SeedlingGroup title="Terminés" items={done} />
        </>
      )}
    </div>
  );
}
