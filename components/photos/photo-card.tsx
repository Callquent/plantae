import type { ReactNode } from "react";
import { photoUrl } from "@/lib/base-path";
import { formatDate } from "@/lib/format";

/** Une photo du journal (plante ou semis) : image, date, pastille, observation, puis actions. */
export default function PhotoCard({
  file,
  alt,
  date,
  note,
  badge,
  children,
}: {
  file: string;
  alt: string;
  date: string;
  note: string;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="overflow-hidden rounded-xl bg-surface ring-1 ring-line">
      <a href={photoUrl(file)} target="_blank" rel="noreferrer" className="block bg-green-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(file)} alt={alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
      </a>
      <div className="grid gap-1.5 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">{formatDate(date)}</span>
          {badge}
        </div>
        {note && <p className="text-muted">{note}</p>}
        {children}
      </div>
    </li>
  );
}
