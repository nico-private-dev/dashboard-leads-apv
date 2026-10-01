"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { bornesMoisParis } from "@/lib/facturation";
import { createClient } from "@/lib/supabase/server";
import { chargerRecap } from "./donnees";

const mois = z.string().regex(/^\d{4}-\d{2}$/);

// « Marquer facturé » : fige le montant du mois et passe les leads « à facturer » en « facturé ».
export async function marquerFacture(partenaireId: string, m: string) {
  if (!z.uuid().safeParse(partenaireId).success || !mois.safeParse(m).success) return { erreur: "Paramètres invalides." };
  const supabase = await createClient();
  const ligne = (await chargerRecap(supabase, m)).find((l) => l.partenaire.id === partenaireId);
  if (!ligne || ligne.statut !== "a_facturer") return { erreur: "Rien à facturer pour ce mois." };
  const { error } = await supabase.from("factures").insert({
    partenaire_id: partenaireId,
    mois: `${m}-01`,
    montant: ligne.montant,
    nb_leads: ligne.leadsFacturables,
    statut: "facture",
  });
  if (error) return { erreur: "Erreur : " + error.message };
  const { debut, fin } = bornesMoisParis(m);
  await supabase
    .from("leads")
    .update({ statut_facturation: "facture" })
    .eq("partenaire_id", partenaireId)
    .eq("statut_facturation", "a_facturer")
    .gte("facturable_le", debut.toISOString())
    .lt("facturable_le", fin.toISOString());
  revalidatePath("/facturation");
  return {};
}

export async function marquerPaye(partenaireId: string, m: string) {
  if (!z.uuid().safeParse(partenaireId).success || !mois.safeParse(m).success) return { erreur: "Paramètres invalides." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("factures")
    .update({ statut: "paye", paye_le: new Date().toISOString() })
    .eq("partenaire_id", partenaireId)
    .eq("mois", `${m}-01`);
  if (error) return { erreur: "Erreur : " + error.message };
  const { debut, fin } = bornesMoisParis(m);
  await supabase
    .from("leads")
    .update({ statut_facturation: "paye" })
    .eq("partenaire_id", partenaireId)
    .eq("statut_facturation", "facture")
    .gte("facturable_le", debut.toISOString())
    .lt("facturable_le", fin.toISOString());
  revalidatePath("/facturation");
  return {};
}
