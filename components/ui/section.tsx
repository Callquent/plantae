import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/** Section d'une fiche : filet, titre (avec icône et complément facultatifs) puis contenu. */
export default function Section({
  id,
  title,
  icon,
  iconClassName = "text-green-600",
  aside,
  gap = "gap-5",
  children,
}: {
  id: string;
  title: string;
  icon?: IconName;
  iconClassName?: string;
  aside?: ReactNode;
  gap?: "gap-4" | "gap-5";
  children: ReactNode;
}) {
  const heading = (
    <h2 id={id} className={`${icon ? "flex items-center gap-2.5 " : ""}text-2xl`}>
      {icon && <Icon name={icon} className={`h-5 w-5 ${iconClassName}`} />}
      {title}
    </h2>
  );
  return (
    <section aria-labelledby={id} className={`grid ${gap} border-t border-line pt-6`}>
      {aside ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {heading}
          <p className="text-sm text-muted">{aside}</p>
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  );
}
