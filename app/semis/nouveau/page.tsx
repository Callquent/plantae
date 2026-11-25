import SeedlingForm from "@/components/seedlings/seedling-form";
import { createSeedlingAction } from "@/lib/seedlings/actions";

export default function NewSeedlingPage() {
  return (
    <div className="grid max-w-2xl gap-6">
      <h1 className="text-3xl sm:text-4xl">Nouveau semis</h1>
      <SeedlingForm action={createSeedlingAction} submitLabel="Ajouter le semis" />
    </div>
  );
}
