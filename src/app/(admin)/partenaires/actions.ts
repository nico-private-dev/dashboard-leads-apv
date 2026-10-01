"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ResultatAction } from "@/components/formulaire-dialog";
import { REGIONS, type ZoneConfig } from "@/lib/attribution";
import { geolocaliser } from "@/lib/ingestion/traitement";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

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

// --- Zones d'attribution (brief §6) ---

const listeCodes = (re: RegExp, message: string) =>
  texte.transform((v) => v.split(/[,;\s]+/).map((c) => c.toUpperCase()).filter(Boolean)).pipe(z.array(z.string().regex(re, message)));

const regleSchema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  partenaire_id: z.uuid(),
  thematique_id: z.uuid("Thématique obligatoire."),
  site_id: z.uuid().optional().or(z.literal("").transform(() => null)),
  type_zone: z.enum(["france", "pays", "regions", "departements", "rayon"]),
  departements: listeCodes(/^(\d{2,3}|2A|2B)$/, "Départements : numéros séparés par des virgules (31, 81…)."),
  pays: listeCodes(/^[A-Z]{2}$/, "Pays : codes à 2 lettres (BE, CH…)."),
  centre_ville: texte,
  rayon_km: texte.transform((v) => (v ? Number(v) : null)).pipe(z.number().positive("Rayon invalide.").nullable()),
  priorite: texte.transform((v) => Number(v || 0)).pipe(z.number().int("Priorité : nombre entier.")),
  envoi_auto: z.literal("on").optional().transform(Boolean),
  actif: z.literal("on").optional().transform(Boolean),
});

export async function enregistrerRegle(fd: FormData): Promise<ResultatAction> {
  const p = regleSchema.safeParse({ ...Object.fromEntries(fd), regions: undefined });
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { id, departements, pays, centre_ville, rayon_km, ...valeurs } = p.data;
  const regions = fd.getAll("regions").map(String).filter((r) => REGIONS.includes(r));

  let zone_config: ZoneConfig = {};
  if (valeurs.type_zone === "regions") {
    if (!regions.length) return { erreur: "Cochez au moins une région." };
    zone_config = { regions };
  } else if (valeurs.type_zone === "departements") {
    if (!departements.length) return { erreur: "Indiquez au moins un département." };
    zone_config = { departements };
  } else if (valeurs.type_zone === "pays") {
    if (!pays.length) return { erreur: "Indiquez au moins un pays." };
    zone_config = { pays };
  } else if (valeurs.type_zone === "rayon") {
    if (!centre_ville || !rayon_km) return { erreur: "Indiquez la ville centre et le rayon." };
    const geo = await geolocaliser(centre_ville).catch(() => null);
    if (!geo?.lat || !geo.lng) return { erreur: `Ville « ${centre_ville} » introuvable.` };
    zone_config = { centre: { ville: geo.ville ?? centre_ville, lat: geo.lat, lng: geo.lng }, rayon_km };
  }

  const supabase = await createClient();
  const ligne = { ...valeurs, zone_config: zone_config as Json };
  const { error } = id ? await supabase.from("attributions").update(ligne).eq("id", id) : await supabase.from("attributions").insert(ligne);
  if (error) return { erreur: "Erreur : " + error.message };
  revalidatePath("/partenaires");
  return {};
}
