export type GaugeTone = "rain" | "sun" | "alert" | "leaf";

/** Ce que la jauge affiche : avancement (0 à 1), couleur et légende. */
export type GaugeState = { ratio: number; tone: GaugeTone; caption: string };
