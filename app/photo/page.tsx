import Link from "next/link";
import Cover from "@/components/photos/cover";
import { Icon } from "@/components/ui/icons";
import { listPlants } from "@/lib/plants/service";
import { coverPhoto } from "@/lib/plants/status";

export const dynamic = "force-dynamic";

export default async function PlantChoicePage() {
  const plants = await listPlants();
  return (
    <div className="grid max-w-2xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-3xl sm:text-4xl">Photographier</h1>
        <p className="text-muted">Choisissez la plante, prenez la photo : elle part vers le PC.</p>
      </header>
      {plants.length === 0 ? (
        <p className="text-muted">
          Aucune plante pour l'instant.{" "}
          <Link href="/plantes/nouvelle" className="font-medium text-green-700 underline">
            Ajouter une plante
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {plants.map((p) => (
            <li key={p.id}>
              <Link
                href={`/photo/${p.id}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line active:scale-[0.98]"
              >
                <span className="relative block aspect-square bg-green-100">
                  <Cover file={coverPhoto(p)?.file} iconClassName="h-12 w-12" />
                  <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-green-700 text-white shadow">
                    <Icon name="camera" className="h-5 w-5" />
                  </span>
                </span>
                <span className="p-3 font-display text-base leading-tight">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
