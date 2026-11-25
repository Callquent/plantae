"use server";

import { redirect } from "next/navigation";
import { todayISO } from "@/lib/dates";
import { photoFiles, positiveInt, text } from "@/lib/form";
import { refreshPlants, refreshSeedlings } from "@/lib/revalidate";
import { savePhotos } from "@/lib/uploads";
import {
  addSeedlingPhotos,
  createSeedling,
  deleteSeedling,
  markFailed,
  markGerminated,
  removeSeedlingPhoto,
  resetSeedling,
  transplant,
  updateSeedling,
} from "./service";
import type { SeedlingInput } from "./types";

function parse(formData: FormData): SeedlingInput {
  return {
    name: text(formData, "name").trim() || "Semis sans nom",
    species: text(formData, "species").trim(),
    sownOn: String(formData.get("sownOn") || todayISO()),
    quantity: positiveInt(formData.get("quantity"), 1),
    germinationDays: positiveInt(formData.get("germinationDays"), 10),
    location: text(formData, "location").trim(),
    notes: text(formData, "notes").trim(),
  };
}

export async function createSeedlingAction(formData: FormData) {
  const photos = await savePhotos(photoFiles(formData));
  await createSeedling(parse(formData), photos);
  refreshSeedlings();
  redirect("/semis");
}

export async function updateSeedlingAction(id: string, formData: FormData) {
  await updateSeedling(id, parse(formData));
  refreshSeedlings(id);
  redirect("/semis");
}

export async function addSeedlingPhotosAction(id: string, formData: FormData) {
  await addSeedlingPhotos(id, photoFiles(formData), { date: text(formData, "date"), note: text(formData, "note") });
  refreshSeedlings(id);
}

export async function removeSeedlingPhotoAction(id: string, photoId: string) {
  await removeSeedlingPhoto(id, photoId);
  refreshSeedlings(id);
}

export async function deleteSeedlingAction(id: string) {
  await deleteSeedling(id);
  refreshSeedlings();
  redirect("/semis");
}

export async function germinateAction(id: string, formData: FormData) {
  const count = Number(formData.get("count"));
  await markGerminated(id, text(formData, "date"), count > 0 ? count : undefined);
  refreshSeedlings(id);
}

/** Raccourci de la liste : levé aujourd'hui, toutes les graines. */
export async function quickGerminateAction(id: string) {
  await markGerminated(id);
  refreshSeedlings(id);
}

export async function failAction(id: string) {
  await markFailed(id);
  refreshSeedlings(id);
}

export async function resetAction(id: string) {
  await resetSeedling(id);
  refreshSeedlings(id);
}

export async function transplantAction(id: string) {
  const plantId = await transplant(id);
  refreshSeedlings(id);
  refreshPlants();
  redirect(plantId ? `/plantes/${plantId}` : `/semis/${id}`);
}
