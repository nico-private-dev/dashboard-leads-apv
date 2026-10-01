"use server";

import { z } from "zod";
import { verifierLien } from "@/lib/liens";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json, TablesUpdate } from "@/lib/supabase/types";
import { ACTIONS_PARTENAIRE, type ActionPartenaire } from "./constantes";

export type ResultatClic = { erreur?: string; message?: string };


const schema = z.object({
  action: z.enum(ACTIONS_PARTENAIRE),
  motif: z.string().trim().optional(),
  precision: z.string().trim().max(500).optional(),
  montant: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v.replace(/\s/g, "").replace(",", ".")) : null))
    .pipe(z.number().positive("Montant invalide.").nullable()),
});

const MESSAGES: Record<ActionPartenaire, string> = {
  contacte: "Merci ! Le lead est marqué comme contacté.",
  invalide: "Merci, le lead est signalé comme invalide.",
  devis_envoye: "Merci ! Le devis est noté.",
  signe: "Félicitations ! La signature est notée.",
  perdu: "Merci, le projet est noté comme perdu.",
  en_cours: "Merci, nous reviendrons vers vous plus tard.",
};

// Clic partenaire (brief §7) : pas de session, l'autorisation vient du lien signé (lead + partenaire).
export async function enregistrerClic(jeton: string, fd: FormData): Promise<ResultatClic> {
  const lien = verifierLien(jeton, process.env.LINK_SIGNING_SECRET ?? "");
  if (!lien) return { erreur: "Ce lien a expiré ou n'est pas valide." };
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { action, motif, precision, montant } = p.data;
  if (action === "invalide" && !motif) return { erreur: "Choisissez un motif." };
  if (action === "signe" && !montant) return { erreur: "Indiquez le montant signé." };

  const db = createAdminClient();
  const { data: lead } = await db.from("leads").select("id, statut, vu_le, partenaire_id, partenaires(modele, taux_commission)").eq("id", lien.lead).single();
  if (!lead || lead.partenaire_id !== lien.partenaire) return { erreur: "Ce lead ne vous est plus attribué." };

  const maintenant = new Date().toISOString();
  const maj: TablesUpdate<"leads"> = { vu_le: lead.vu_le ?? maintenant }; // premier clic = vu
  if (action === "en_cours") {
    if (lead.statut === "envoye") maj.statut = "vu";
  } else if (action === "invalide") {
    maj.statut = "invalide";
    maj.motif_contestation = [motif, precision].filter(Boolean).join(" : ");
  } else {
    maj.statut = action;
    if (montant) maj.montant_devis = montant;
    // Commission : facturable dès la signature (brief §8).
    if (action === "signe" && lead.partenaires?.modele === "commission" && lead.partenaires.taux_commission) {
      maj.montant_commission = Math.round(montant! * Number(lead.partenaires.taux_commission)) / 100;
      maj.statut_facturation = "a_facturer";
    }
  }

  const { error } = await db.from("leads").update(maj).eq("id", lead.id);
  if (error) return { erreur: "Enregistrement impossible, réessayez." };
  await db.from("lead_events").insert({
    lead_id: lead.id,
    type: "clic_partenaire",
    auteur: "partenaire",
    details: { action, ...(motif && { motif }), ...(precision && { precision }), ...(montant && { montant }) } as Json,
  });
  return { message: MESSAGES[action] };
}
