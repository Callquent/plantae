import Link from "next/link";
import Gauge from "@/components/ui/gauge";
import { Icon } from "@/components/ui/icons";
import { photoUrl } from "@/lib/base-path";
import { todayISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { quickGerminateAction } from "@/lib/seedlings/actions";
import { germinationGauge, progress } from "@/lib/seedlings/status";
import type { Seedling } from "@/lib/seedlings/types";
import StatusBadge from "./status-badge";

export default function SeedlingTile({ s }: { s: Seedling }) {
  const g = germinationGauge(s);
  const p = progress(s);
  const toSow = s.sownOn > todayISO();
  const cover = s.photos[0];
  return (
    <li className="flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-line transition-shadow hover:shadow-lg hover:shadow-green-900/10">
      {cover && (
        <Link href={`/semis/${s.id}`} className="-mx-4 -mt-4 block bg-green-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(cover.file)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl">
            <Link href={`/semis/${s.id}`} className="hover:underline">
              {s.name}
            </Link>
          </h3>
          {s.species && <p className="text-sm italic text-muted">{s.species}</p>}
        </div>
        <StatusBadge status={s.status} className="shrink-0" />
      </div>

      {g ? (
        <Gauge ratio={g.ratio} tone={g.tone} caption={g.caption} label={`Levée de ${s.name}`} />
      ) : (
        <p className="text-sm font-medium text-fern-deep">{p.text}</p>
      )}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <li className="flex items-center gap-1.5">
          <Icon name="seed" />
          {s.quantity} graine{s.quantity > 1 ? "s" : ""}
        </li>
        <li className="flex items-center gap-1.5">
          <Icon name="calendar" />
          {toSow ? "À semer le" : "Semé le"} {formatDate(s.sownOn)}
        </li>
        {s.location && (
          <li className="flex items-center gap-1.5">
            <Icon name="pin" />
            {s.location}
          </li>
        )}
      </ul>

      {s.status === "seme" && !toSow && (
        <form action={quickGerminateAction.bind(null, s.id)} className="mt-auto">
          <button className="btn-quiet w-full">
            <Icon name="sprout" />
            Levé aujourd'hui
          </button>
        </form>
      )}
      {s.status === "leve" && (
        <Link href={`/semis/${s.id}`} className="btn mt-auto w-full">
          <Icon name="leaf" />
          Transplanter en plante
        </Link>
      )}
    </li>
  );
}
