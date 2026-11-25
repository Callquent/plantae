"use server";

import { redirect } from "next/navigation";
import { todayISO } from "@/lib/dates";
import { photoFiles, positiveInt, text } from "@/lib/form";
import { refreshPlants } from "@/lib/revalidate";
import { savePhotos } from "@/lib/uploads";
import {
  addPhotos,
  addWatering,
  createPlant,
  deletePlant,
  markWatered,
  removePhoto,
  removeWatering,
  updatePhoto,
  updatePlant,
} from "./service";
import { parseLight, type PlantInput } from "./types";

function parse(formData: FormData): PlantInput {
  return {
    name: text(formData, "name").trim() || "Plante sans nom",
    species: text(formData, "species").trim(),
    location: text(formData, "location").trim(),
    light: parseLight(formData.get("light")),
    wateringEveryDays: positiveInt(formData.get("wateringEveryDays"), 7),
    lastWatered: String(formData.get("lastWatered") || todayISO()),
    notes: text(formData, "notes").trim(),
  };
}

export async function createPlantAction(formData: FormData) {
  const photos = await savePhotos(photoFiles(formData));
  await createPlant(parse(formData), photos);
  refreshPlants();
  redirect("/plantes");
}

export async function updatePlantAction(id: string, formData: FormData) {
  await updatePlant(id, parse(formData));
  refreshPlants();
  redirect("/plantes");
}

export async function deletePlantAction(id: string) {
  await deletePlant(id);
  refreshPlants();
  redirect("/plantes");
}

export async function waterPlantAction(id: string) {
  await markWatered(id);
  refreshPlants(id);
}

export async function addWateringAction(id: string, formData: FormData) {
  await addWatering(id, text(formData, "date"));
  refreshPlants(id);
}

export async function removeWateringAction(id: string, date: string) {
  await removeWatering(id, date);
  refreshPlants(id);
}

export async function addPhotosAction(id: string, formData: FormData) {
  await addPhotos(id, photoFiles(formData), {
    date: text(formData, "date"),
    health: text(formData, "health"),
    note: text(formData, "note"),
  });
  refreshPlants(id);
}

export async function updatePhotoAction(id: string, photoId: string, formData: FormData) {
  await updatePhoto(id, photoId, { health: text(formData, "health"), note: text(formData, "note") });
  refreshPlants(id);
}

export async function removePhotoAction(id: string, photoId: string) {
  await removePhoto(id, photoId);
  refreshPlants(id);
}
