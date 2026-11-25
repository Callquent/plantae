import { STATUS_LABELS, type SeedlingStatus } from "@/lib/seedlings/types";

const CLS: Record<SeedlingStatus, string> = {
  seme: "bg-leaf/25 text-leaf-deep",
  leve: "bg-fern/15 text-fern-deep",
  transplante: "bg-green-100 text-green-800",
  echec: "bg-line/60 text-muted",
};

export default function StatusBadge({ status, className = "" }: { status: SeedlingStatus; className?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLS[status]} ${className}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
