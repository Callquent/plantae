export const STATUS_LABELS = {
  seme: "Semé",
  leve: "Levé",
  transplante: "Transplanté",
  echec: "Échec",
} as const;
export type SeedlingStatus = keyof typeof STATUS_LABELS;

export const parseStatus = (value: unknown): SeedlingStatus =>
  (Object.keys(STATUS_LABELS) as SeedlingStatus[]).find((k) => k === value) ?? "seme";

export type SeedlingPhoto = {
  id: string;
  file: string; // nom du fichier dans data/uploads
  date: string; // date de la prise de vue (YYYY-MM-DD)
  note: string;
};

export type Seedling = {
  id: string;
  name: string;
  species: string;
  sownOn: string; // date de semis (YYYY-MM-DD)
  quantity: number; // nombre de graines semées
  germinationDays: number; // délai de levée attendu, en jours
  location: string;
  notes: string;
  status: SeedlingStatus;
  germinatedOn?: string; // date de levée constatée
  germinatedCount?: number; // nombre de graines levées
  plantId?: string; // plante créée lors du transplantage
  photos: SeedlingPhoto[]; // photos du semis, de la plus récente à la plus ancienne
  createdAt: string;
  updatedAt: string; // dernière modification (ISO)
  deletedAt?: string; // semis supprimé (la fiche reste en base mais n'apparaît plus)
};

export type SeedlingInput = Pick<
  Seedling,
  "name" | "species" | "sownOn" | "quantity" | "germinationDays" | "location" | "notes"
>;
