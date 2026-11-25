import { HEALTH_LABELS, type Health } from "@/lib/plants/types";

/** Couleurs de l'état de santé, partagées par la liste et les fiches. */
const CLS: Record<Health, string> = {
  bonne: "bg-green-100 text-green-800",
  moyenne: "bg-[#f7e5bf] text-sun-deep",
  mauvaise: "bg-[#f4d9d4] text-alert",
};

export default function HealthBadge({ health, className = "" }: { health: Health; className?: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-semibold ${CLS[health]} ${className}`}>{HEALTH_LABELS[health]}</span>
  );
}
