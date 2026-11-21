import { NextResponse } from "next/server";
import { agendaEvents, parseRange } from "@/lib/agenda-feed";
import { listPlants, todayISO } from "@/lib/plants";
import { listSeedlings } from "@/lib/seedlings";

export const dynamic = "force-dynamic";

// Flux de dates pour l'application « Agenda » : GET /api/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("from"), url.searchParams.get("to"));
  if (!range) return NextResponse.json({ error: "Paramètres from et to (YYYY-MM-DD, 400 jours maximum) requis." }, { status: 400 });
  const [plants, seedlings] = await Promise.all([listPlants(), listSeedlings()]);
  return NextResponse.json({ events: agendaEvents(plants, seedlings, range.from, range.to, todayISO()) });
}
