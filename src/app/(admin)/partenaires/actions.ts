"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ResultatAction } from "@/components/formulaire-dialog";
import { createClient } from "@/lib/supabase/server";

const texte = z.string().trim();
const optionnel = texte.transform((v) => v || null);
// « 10,5 » → 10.5 ; vide → null
const nombre = texte.transform((v) => (v ? Number(v.replace(/\s/g, "").replace(",", ".")) : null)).pipe(z.number().nonnegative("Montant invalide.").nullable());

const schema = z
  .object({
    id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    raison_sociale: texte.min(1, "Raison sociale obligatoire."),
    contact_nom: optionnel,
    contact_email: z.union([z.literal("").transform(() => null), z.email("Email du contact invalide.")]),
    emails_copie: texte.transform((v) => v.split(/[,;\s]+/).map((e) => e.toLowerCase()).filter(Boolean)).pipe(z.array(z.email("Un email en copie est invalide."))),
    telephone: optionnel,
    siret: optionnel,
    adresse: optionnel,
    site_web: optionnel,
    modele: z.enum(["", "abonnement", "commission", "achat_lead"]).transform((v) => v || null),
    montant_abonnement_mensuel: nombre,
    taux_commission: nombre.refine((v) => v === null || v <= 100, "Taux de commission : 100 % maximum."),
    prix_lead: nombre,
    delai_contestation_jours: texte.transform((v) => Number(v || 7)).pipe(z.number().int().min(0, "Délai de contestation invalide.")),
    date_debut: z.union([z.literal("").transform(() => null), z.iso.date()]),
    notes: optionnel,
    actif: z.literal("on").optional().transform(Boolean),
  })
  // Le tarif du modèle choisi doit être renseigné.
  .refine((p) => p.modele !== "abonnement" || p.montant_abonnement_mensuel !== null, "Indiquez le montant de l'abonnement mensuel.")
  .refine((p) => p.modele !== "commission" || p.taux_commission !== null, "Indiquez le taux de commission.")
  .refine((p) => p.modele !== "achat_lead" || p.prix_lead !== null, "Indiquez le prix par lead.");

export async function enregistrerPartenaire(fd: FormData): Promise<ResultatAction> {
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { id, ...valeurs } = p.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("partenaires").update(valeurs).eq("id", id) : await supabase.from("partenaires").insert(valeurs);
  if (error) return { erreur: "Erreur : " + error.message };
  revalidatePath("/partenaires");
  return {};
}
