import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { notifierAdmins } from "@/lib/envoi";
import { traiterLead } from "@/lib/ingestion/traitement";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

// Webhooks entrants (brief §3.1, §3.5). Règle d'or : le payload brut est stocké avant tout traitement,
// on répond tout de suite, et le traitement tourne après la réponse (after).

const TYPES = ["tally", "generic"];
const TAILLE_MAX = 1_000_000;

// Tally : en-tête Tally-Signature = base64(HMAC-SHA256(corps, secret)).
function signatureTallyValide(corps: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const attendue = Buffer.from(createHmac("sha256", secret).update(corps).digest("base64"));
  const recue = Buffer.from(signature);
  return attendue.length === recue.length && timingSafeEqual(attendue, recue);
}

export async function POST(req: Request, ctx: RouteContext<"/api/ingest/[type]/[token]">) {
  const { type, token } = await ctx.params;
  if (!TYPES.includes(type)) return NextResponse.json({ erreur: "Type inconnu" }, { status: 404 });

  const db = createAdminClient();
  const { data: source } = await db.from("sources").select().eq("webhook_token", token).eq("type", type).maybeSingle();
  if (!source?.actif) return NextResponse.json({ erreur: "Source inconnue ou désactivée" }, { status: 404 });

  const corps = await req.text();
  if (corps.length > TAILLE_MAX) return NextResponse.json({ erreur: "Corps trop volumineux" }, { status: 413 });

  if (type === "tally" && source.webhook_secret && !signatureTallyValide(corps, req.headers.get("tally-signature"), source.webhook_secret)) {
    await db.from("alertes").insert({
      type: "erreur_ingestion",
      source_id: source.id,
      site_id: source.site_id,
      message: `Envoi refusé sur « ${source.nom} » : signature Tally invalide (vérifier le secret).`,
    });
    after(() => notifierAdmins("Webhook refusé", [`Signature Tally invalide sur la source « ${source.nom} ».`, "Vérifiez le secret de signature dans Tally et dans Sites & sources."], "/sites"));
    return NextResponse.json({ erreur: "Signature invalide" }, { status: 401 });
  }

  let payload: Json;
  try {
    payload = JSON.parse(corps) as Json;
  } catch {
    payload = { corps_brut: corps }; // JSON illisible : gardé tel quel, le traitement le signalera
  }

  // Tally renvoie le même eventId quand il réessaie : on ne crée pas deux fois le lead.
  const eventId = (payload as { eventId?: unknown })?.eventId;
  if (typeof eventId === "string") {
    const { data: deja } = await db
      .from("leads")
      .select("id")
      .eq("source_id", source.id)
      .eq("payload_brut->>eventId", eventId)
      .maybeSingle();
    if (deja) return NextResponse.json({ ok: true, lead_id: deja.id, deja_recu: true });
  }

  const { data: lead, error } = await db
    .from("leads")
    .insert({
      source_id: source.id,
      site_id: source.site_id,
      thematique_id: source.thematique_id,
      payload_brut: payload,
      statut: "a_completer",
    })
    .select("id")
    .single();
  if (error || !lead) {
    // Réponse 500 : Tally réessaiera, la donnée n'est donc pas perdue.
    console.error("Ingestion : insertion impossible", error?.message);
    return NextResponse.json({ erreur: "Enregistrement impossible" }, { status: 500 });
  }

  await Promise.all([
    db.from("sources").update({ dernier_lead_le: new Date().toISOString() }).eq("id", source.id),
    db.from("lead_events").insert({ lead_id: lead.id, type: "recu", auteur: "systeme", details: { source: source.nom } }),
  ]);

  after(() => traiterLead(lead.id));
  return NextResponse.json({ ok: true, lead_id: lead.id });
}
