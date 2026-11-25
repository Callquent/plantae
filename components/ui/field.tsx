import type { ReactNode } from "react";

/** Libellé d'un champ de formulaire, avec une aide facultative sous le champ. */
export default function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-1 text-sm font-medium ${className}`}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}
