export const LIGHT_LABELS = { faible: "Faible", moyenne: "Moyenne", forte: "Forte" } as const;
export type Light = keyof typeof LIGHT_LABELS;
export const LIGHTS = Object.keys(LIGHT_LABELS) as Light[];

export const HEALTH_LABELS = { bonne: "En forme", moyenne: "Moyenne", mauvaise: "Souffrante" } as const;
export type Health = keyof typeof HEALTH_LABELS;
export const HEALTHS = Object.keys(HEALTH_LABELS) as Health[];

export const parseLight = (value: unknown): Light => LIGHTS.find((l) => l === value) ?? "moyenne";
export const parseHealth = (value: unknown): Health | undefined => HEALTHS.find((h) => h === value);

export type PlantPhoto = {
  id: string;
  file: string; // nom du fichier dans data/uploads
  date: string; // date de la prise de vue (YYYY-MM-DD)
  health?: Health; // état de santé constaté ce jour-là
  note: string;
  clientId?: string; // identifiant donné par le téléphone : un renvoi ne crée jamais de doublon
};

export type Plant = {
  id: string;
  name: string;
  species: string;
  location: string;
  light: Light;
  wateringEveryDays: number;
  lastWatered: string; // ISO date (YYYY-MM-DD), toujours = arrosage le plus récent de l'historique
  waterings: string[]; // historique des arrosages (YYYY-MM-DD), du plus récent au plus ancien
  photos: PlantPhoto[]; // journal photo, de la plus récente à la plus ancienne
  notes: string;
  createdAt: string;
  updatedAt: string; // dernière modification (ISO)
  deletedAt?: string; // plante supprimée (la fiche reste en base mais n'apparaît plus)
};

export type PlantInput = Omit<Plant, "id" | "createdAt" | "photos" | "waterings" | "updatedAt" | "deletedAt">;
