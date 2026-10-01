"use server";

import { revalidatePath } from "next/cache";
import { appliquerActionPartenaire, type ResultatClic } from "@/lib/action-partenaire";
import { createClient } from "@/lib/supabase/server";

// Mise à jour d'un lead depuis l'espace : l'identité du partenaire vient de la base (session → profil).
export async function actionEspace(leadId: string, fd: FormData): Promise<ResultatClic> {
  const supabase = await createClient();
  const { data: partenaireId } = await supabase.rpc("partenaire_courant");
  if (!partenaireId) return { erreur: "Session expirée : reconnectez-vous." };
  const res = await appliquerActionPartenaire(leadId, partenaireId, fd);
  revalidatePath("/espace");
  return res;
}
