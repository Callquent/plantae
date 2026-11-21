import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlant, todayISO } from "@/lib/plants";
import { Icon } from "../../icons";
import CaptureForm from "./capture-form";

export const dynamic = "force-dynamic";

export default async function CapturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plant = await getPlant(id);
  if (!plant) notFound();
  return (
    <div className="grid max-w-xl gap-6">
      <header className="grid gap-1">
        <Link href="/photo" className="btn-text inline-flex items-center gap-1 no-underline">
          <Icon name="left" /> Autres plantes
        </Link>
        <h1 className="text-3xl sm:text-4xl">{plant.name}</h1>
        {plant.species && <p className="italic text-muted">{plant.species}</p>}
      </header>
      <CaptureForm plantId={plant.id} plantName={plant.name} today={todayISO()} />
    </div>
  );
}
