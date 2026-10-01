import "server-only";
import { bornesMoisParis, calculerRecap, type LeadFacturation } from "@/lib/facturation";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
const LOT = 1000;

// Charge le récap d'un mois (« 2026-09 ») : partenaires actifs ou facturés ce mois-là.
export async function chargerRecap(supabase: Client, mois: string) {
  const { debut, fin } = bornesMoisParis(mois);
  const [d, f] = [debut.toISOString(), fin.toISOString()];
  const leads: LeadFacturation[] = [];
  for (let i = 0; ; i += LOT) {
    const { data, error } = await supabase
      .from("leads")
      .select("partenaire_id, envoye_le, facturable_le, statut, statut_facturation, prix_facture, montant_commission")
      .not("partenaire_id", "is", null)
      .or(`and(envoye_le.gte.${d},envoye_le.lt.${f}),and(facturable_le.gte.${d},facturable_le.lt.${f})`)
      .range(i, i + LOT - 1);
    if (error) throw new Error(error.message);
    leads.push(...data);
    if (data.length < LOT) break;
  }
  const [{ data: partenaires }, { data: factures }] = await Promise.all([
    supabase.from("partenaires").select("id, raison_sociale, modele, prix_lead, taux_commission, montant_abonnement_mensuel, date_debut, actif").order("raison_sociale"),
    supabase.from("factures").select("partenaire_id, statut, montant, nb_leads").eq("mois", `${mois}-01`),
  ]);
  const facturesMois = factures ?? [];
  const visibles = (partenaires ?? []).filter((p) => p.actif || facturesMois.some((x) => x.partenaire_id === p.id));
  return calculerRecap(visibles, leads, facturesMois, mois);
}
