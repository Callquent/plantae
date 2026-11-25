import type { Seedling } from "@/lib/seedlings/types";
import SeedlingTile from "./seedling-tile";

/** Une rubrique de la liste des semis (masquée quand elle est vide). */
export default function SeedlingGroup({ title, items }: { title: string; items: Seedling[] }) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-4">
      <h2 className="flex items-baseline gap-2 border-b border-line pb-2 text-2xl">
        {title}
        <span className="font-sans text-sm text-muted">{items.length}</span>
      </h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <SeedlingTile key={s.id} s={s} />
        ))}
      </ul>
    </section>
  );
}
