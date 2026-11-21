import type { MetadataRoute } from "next";
import { withBase } from "@/lib/base-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mes plantes d'intérieur",
    short_name: "Mes plantes",
    description: "Photographier ses plantes et les envoyer au PC",
    lang: "fr",
    start_url: withBase("/photo"),
    scope: withBase("/"),
    display: "standalone",
    background_color: "#ebf0ea",
    theme_color: "#24573f",
    icons: [{ src: withBase("/logo.png"), sizes: "192x192 512x512", type: "image/png", purpose: "any" }],
    shortcuts: [{ name: "Prendre une photo", url: withBase("/photo"), icons: [{ src: withBase("/logo.png"), sizes: "512x512" }] }],
  };
}
