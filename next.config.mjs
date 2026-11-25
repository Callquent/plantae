// BASE_PATH (ex. /apps/plantes) et STANDALONE=1 sont fournis par la compilation de « Mes applications ».
// Sans ces variables, l'application se compile et se lance exactement comme avant.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Dossiers de @prisma/adapter-libsql et de tout ce dont il dépend, tels qu'installés dans node_modules. */
function sqliteFiles() {
  const seen = new Set();
  const walk = (name) => {
    if (seen.has(name)) return;
    const pkgFile = join(process.cwd(), "node_modules", name, "package.json");
    if (!existsSync(pkgFile)) return; // dépendance optionnelle d'une autre machine : absente, on l'ignore
    seen.add(name);
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
    for (const dep of Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })) walk(dep);
  };
  walk("@prisma/adapter-libsql");
  return [...seen].map((name) => `./node_modules/${name}/**/*`);
}

const basePath = process.env.BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  ...(process.env.STANDALONE ? { output: "standalone" } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Le client Prisma est empaqueté dans l'application (JavaScript pur) ; l’adaptateur SQLite est chargé
  // par lib/db/client.ts directement depuis node_modules.
  transpilePackages: ["@prisma/client"],
  // Les modules de SQLite sont chargés par lib/db/client.ts hors du paquet compilé : on les ajoute, avec toutes
  // leurs dépendances installées (dont le binaire propre à la machine), à la version autonome.
  outputFileTracingIncludes: { "/**": sqliteFiles() },
  experimental: {
    // Les photos passent par une Server Action : on relève la limite par défaut (1 Mo)
    // pour permettre l'envoi de plusieurs photos de téléphone à la fois.
    serverActions: { bodySizeLimit: "60mb" },
  },
};

export default nextConfig;
