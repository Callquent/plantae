import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/** Panneau « rien ici pour l'instant » : icône, message et actions. */
export default function EmptyState({ icon, actions, children }: { icon: IconName; actions: ReactNode; children: ReactNode }) {
  return (
    <div className="panel grid justify-items-center gap-4 py-12 text-center">
      <Icon name={icon} className="h-10 w-10 text-green-400" />
      <p className="max-w-sm text-muted">{children}</p>
      {actions}
    </div>
  );
}
