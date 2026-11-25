/** Lecture des formulaires, commune à toutes les actions serveur. */
export const text = (formData: FormData, key: string): string => String(formData.get(key) ?? "");

export function positiveInt(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function photoFiles(formData: FormData): File[] {
  return formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
}
