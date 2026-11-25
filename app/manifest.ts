import type { MetadataRoute } from "next";
import { withBase } from "@/lib/base-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mes plantes d'intérieur",
    short_name: "Mes plantes",
    description: "Suivi des semis, de l'arrosage et des photos de vos plantes d'intérieur",
    lang: "fr",
    start_url: withBase("/"),
    scope: withBase("/"),
    display: "standalone",
    background_color: "#ebf0ea",
    theme_color: "#24573f",
    icons: [{ src: withBase("/logo.png"), sizes: "192x192 512x512", type: "image/png", purpose: "any" }],
  };
}
