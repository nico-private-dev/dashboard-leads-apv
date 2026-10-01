import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/lib/supabase/types";
import { extraireGenerique, extraireTally, normaliser, type Mapping, type Socle } from "./extraction";

type Admin = ReturnType<typeof createAdminClient>;
type Geo = { ville?: string; code_postal?: string; departement?: string; region?: string; lat?: number; lng?: number; incertaine: boolean };

const JOURS_DOUBLON = 30;

async function evenement(db: Admin, lead_id: string, type: string, details: Record<string, unknown> = {}) {
  await db.from("lead_events").insert({ lead_id, type, auteur: "systeme", details: details as Json });
}

// Brief §4 étape 4 : api-adresse.data.gouv.fr (France uniquement en V1).
async function geolocaliser(ville?: string, codePostal?: string): Promise<Geo | null> {
  const q = ville || codePostal;
  if (!q || q.length < 3) return null;
  const chercher = async (params: Record<string, string>) => {
    const url = "https://api-adresse.data.gouv.fr/search/?" + new URLSearchParams({ type: "municipality", limit: "1", ...params });
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Géocodage HTTP ${res.status}`);
    const json = (await res.json()) as { features: { geometry: { coordinates: [number, number] }; properties: { score: number; city: string; postcode: string; depcode: string; context: string } }[] };
    return json.features[0];
  };
  // Le code postal prime ; si ville et CP ne concordent pas, on retente sur la ville seule (résultat incertain).
  let f = codePostal && ville ? await chercher({ q, postcode: codePostal }) : undefined;
  let incertaine = false;
  if (!f) {
    f = await chercher({ q });
    incertaine = Boolean(codePostal && ville);
  }
  if (!f) return { incertaine: true };
  const p = f.properties;
  return {
    ville: p.city,
    code_postal: codePostal || p.postcode,
    departement: p.depcode,
    region: p.context.split(", ")[2],
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    incertaine: incertaine || p.score < 0.5,
  };
}

// Brief §4 étape 5 : même téléphone OU même email, même thématique, sous 30 jours.
async function trouverDoublon(db: Admin, lead: Tables<"leads">, socle: Socle) {
  // Valeurs entre guillemets : un email peut contenir des caractères réservés du filtre or().
  const q = (v: string) => `"${v.replace(/"/g, "")}"`;
  const criteres = [
    socle.telephone && `telephone.eq.${q(socle.telephone)}`,
    socle.email && `email.eq.${q(socle.email)}`,
  ].filter(Boolean);
  if (!criteres.length) return null;
  const depuis = new Date(new Date(lead.recu_le).getTime() - JOURS_DOUBLON * 86_400_000).toISOString();
  const { data } = await db
    .from("leads")
    .select("id")
    .eq("thematique_id", lead.thematique_id)
    .neq("id", lead.id)
    .not("statut", "in", "(doublon,invalide,non_lead)")
    .gte("recu_le", depuis)
    .lte("recu_le", lead.recu_le)
    .or(criteres.join(","))
    .order("recu_le")
    .limit(1);
  return data?.[0]?.id ?? null;
}

// Traite un lead déjà enregistré (payload brut stocké). En cas d'échec il reste « à compléter » + alerte.
export async function traiterLead(leadId: string) {
  const db = createAdminClient();
  const { data: lead } = await db.from("leads").select("*, sources(*), sites(*)").eq("id", leadId).single();
  if (!lead) return;

  try {
    const source = lead.sources;
    const pays = lead.sites?.pays ?? "FR";
    const mapping = ((source?.config as { mapping?: Mapping } | null)?.mapping) ?? {};
    const extraction =
      source?.type === "tally" ? extraireTally(lead.payload_brut, mapping) : extraireGenerique(lead.payload_brut, mapping);
    const socle = normaliser(extraction.socle, pays);

    let geo: Geo | null = null;
    if (pays === "FR") {
      try {
        geo = await geolocaliser(socle.ville, socle.code_postal);
      } catch (e) {
        // Le géocodage est un bonus : son échec ne bloque pas le lead.
        await evenement(db, leadId, "geolocalisation_echec", { erreur: String(e) });
      }
    }

    const doublonDe = await trouverDoublon(db, lead, socle);
    const contactable = Boolean(socle.telephone || socle.email);
    const statut = doublonDe ? "doublon" : contactable ? "nouveau" : "a_completer";

    const { error } = await db
      .from("leads")
      .update({
        ...socle,
        // Orthographe officielle de la ville saisie ; un code postal seul peut couvrir plusieurs communes → pas de ville inventée.
        ville: (socle.ville && geo && !geo.incertaine && geo.ville) || socle.ville || null,
        code_postal: geo?.code_postal ?? socle.code_postal ?? null,
        departement: geo?.departement ?? null,
        region: geo?.region ?? null,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
        pays,
        geoloc_incertaine: geo ? geo.incertaine : Boolean(socle.ville || socle.code_postal),
        champs_specifiques: extraction.champs_specifiques as Json,
        statut,
        doublon_de: doublonDe,
      })
      .eq("id", leadId);
    if (error) throw new Error(error.message);

    await evenement(db, leadId, "traite", {
      statut,
      champs_detectes: Object.keys(socle),
      ...(doublonDe && { doublon_de: doublonDe }),
      ...(!contactable && { motif: "Ni téléphone ni email détecté" }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await evenement(db, leadId, "erreur_traitement", { erreur: message });
    await db.from("alertes").insert({
      type: "erreur_ingestion",
      lead_id: leadId,
      source_id: lead.source_id,
      site_id: lead.site_id,
      message: `Traitement du lead en échec : ${message}`,
    });
  }
}
