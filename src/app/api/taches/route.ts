import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { executerTaches } from "@/lib/taches";

// Tâche planifiée (toutes les heures ; ?recap=1 une fois par jour). Appelée par pg_cron + pg_net
// une fois l'application en ligne. Protégée par l'en-tête Authorization: Bearer CRON_SECRET.
export const maxDuration = 60;

function autorise(req: Request) {
  const secret = process.env.CRON_SECRET;
  const recu = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return Boolean(secret) && recu.length === secret!.length && timingSafeEqual(Buffer.from(recu), Buffer.from(secret!));
}

export async function POST(req: Request) {
  if (!autorise(req)) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const recap = new URL(req.url).searchParams.get("recap") === "1";
  return NextResponse.json(await executerTaches({ recap }));
}
