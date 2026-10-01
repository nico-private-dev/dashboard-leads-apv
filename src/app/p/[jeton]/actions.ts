"use server";

import { appliquerActionPartenaire, type ResultatClic } from "@/lib/action-partenaire";
import { verifierLien } from "@/lib/liens";

// Clic partenaire (brief §7) : pas de session, l'autorisation vient du lien signé (lead + partenaire).
export async function enregistrerClic(jeton: string, fd: FormData): Promise<ResultatClic> {
  const lien = verifierLien(jeton, process.env.LINK_SIGNING_SECRET ?? "");
  if (!lien) return { erreur: "Ce lien a expiré ou n'est pas valide." };
  return appliquerActionPartenaire(lien.lead, lien.partenaire, fd);
}
