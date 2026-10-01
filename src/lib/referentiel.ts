import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Thématiques, sites, sources et partenaires : petites tables utilisées par les filtres et les écrans.
export async function chargerReferentiel(supabase: Client) {
  const [t, s, so, p] = await Promise.all([
    supabase.from("thematiques").select("id, nom, couleur, actif").order("nom"),
    supabase.from("sites").select("id, nom, thematique_id, collecte, pays").order("nom"),
    supabase.from("sources").select("id, nom, type, site_id, thematique_id").order("nom"),
    supabase.from("partenaires").select("id, raison_sociale").order("raison_sociale"),
  ]);
  if (t.error || s.error || so.error || p.error) throw new Error("Chargement du référentiel impossible.");
  return { thematiques: t.data, sites: s.data, sources: so.data, partenaires: p.data };
}

export type Referentiel = Awaited<ReturnType<typeof chargerReferentiel>>;
