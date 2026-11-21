import { revalidatePath } from "next/cache";
import { addDevicePhoto } from "@/lib/plants";

export const dynamic = "force-dynamic";

const reply = (status: number, body: Record<string, string>) => Response.json(body, { status });

/**
 * Réception d'une photo envoyée par le téléphone (une photo par requête).
 * 200 = enregistrée (ou déjà reçue : le téléphone peut l'oublier), 404 = plante inconnue,
 * 400 = fichier refusé. Le téléphone ne réessaie que les erreurs temporaires (réseau, 5xx).
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { status: "invalid" });
  }
  const plantId = form.get("plantId");
  const photo = form.get("photo");
  if (typeof plantId !== "string" || !(photo instanceof File) || photo.size === 0) {
    return reply(400, { status: "invalid" });
  }
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : undefined;
  };

  const result = await addDevicePhoto(plantId, photo, {
    clientId: text("clientId"),
    date: text("date"),
    health: text("health"),
    note: text("note"),
  });
  if (result === "not-found") return reply(404, { status: result });
  if (result === "invalid") return reply(400, { status: result });

  if (result === "saved") {
    revalidatePath("/plantes");
    revalidatePath(`/plantes/${plantId}`);
  }
  return reply(200, { status: result });
}
