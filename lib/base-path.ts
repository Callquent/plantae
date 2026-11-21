/**
 * Préfixe d'adresse quand l'application vit sous « Mes applications » (ex. /apps/plantes).
 * Vide quand elle tourne seule. Fixé au moment de la compilation (variable BASE_PATH).
 * Next.js ajoute tout seul le préfixe aux <Link> et aux redirections ; ce helper sert pour les
 * adresses écrites à la main (<img>, fetch, manifeste).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const withBase = (path: string) => BASE_PATH + path;
