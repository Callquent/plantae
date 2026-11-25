import { revalidatePath } from "next/cache";

/** Pages à rafraîchir après une modification d'une plante (ou de toutes si `id` est absent). */
export function refreshPlants(id?: string) {
  revalidatePath("/");
  revalidatePath("/plantes");
  if (id) revalidatePath(`/plantes/${id}`);
}

export function refreshSeedlings(id?: string) {
  revalidatePath("/semis");
  if (id) revalidatePath(`/semis/${id}`);
}
