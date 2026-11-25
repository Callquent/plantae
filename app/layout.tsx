import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/instrument-sans/wght-italic.css";
import "@fontsource/young-serif";
import "./globals.css";
import Nav from "@/components/layout/nav";

export const metadata: Metadata = {
  title: "Mes plantes d'intérieur",
  description: "Suivi des semis, de l'arrosage et de l'entretien de vos plantes d'intérieur",
  appleWebApp: { capable: true, title: "Mes plantes", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#24573f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <header className="border-b border-line bg-surface/90">
          <Nav />
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
