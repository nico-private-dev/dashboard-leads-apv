"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ResultatAction } from "@/components/formulaire-dialog";
import { attribuerLead, envoyerAuPartenaire } from "@/lib/envoi";
import { normaliser } from "@/lib/ingestion/extraction";
import { geolocaliser, traiterLead } from "@/lib/ingestion/traitement";
import { STATUTS } from "@/lib/libelles";
import { heureParisVersDate } from "@/lib/periodes";
import { createClient } from "@/lib/supabase/server";
import type { Json, TablesUpdate } from "@/lib/supabase/types";

// Client avec la session de l'admin : la RLS vérifie est_admin() à chaque écriture,
// et le trigger journalise les changements de statut au nom de l'admin.

const texte = z.string().trim();
const uuid = z.uuid();

function rafraichir() {
  revalidatePath("/leads");
  revalidatePath("/a-traiter");
  revalidatePath("/");
}

async function journal(lead_id: string, type: string, details: Record<string, unknown> = {}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  await supabase.from("lead_events").insert({ lead_id, type, auteur: "admin", auteur_id: data.user?.id, details: details as Json });
}

async function maj(id: string, valeurs: TablesUpdate<"leads">): Promise<ResultatAction> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update(valeurs).eq("id", id);
  if (error) return { erreur: "Erreur : " + error.message };
  rafraichir();
  return {};
}

export async function changerStatut(id: string, statut: string): Promise<ResultatAction> {
  if (!uuid.safeParse(id).success || !(statut in STATUTS)) return { erreur: "Statut invalide." };
  return maj(id, { statut });
}

export async function enregistrerNote(fd: FormData): Promise<ResultatAction> {
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { erreur: "Lead inconnu." };
  const note = texte.parse(fd.get("notes_internes") ?? "");
  const res = await maj(id.data, { notes_internes: note || null });
  if (!res.erreur) await journal(id.data, "note");
  return res;
}

export async function confirmerDoublon(id: string): Promise<ResultatAction> {
  if (!uuid.safeParse(id).success) return { erreur: "Lead inconnu." };
  const res = await maj(id, { doublon_verifie: true });
  if (!res.erreur) await journal(id, "doublon_confirme");
  return res;
}

export async function annulerDoublon(id: string): Promise<ResultatAction> {
  if (!uuid.safeParse(id).success) return { erreur: "Lead inconnu." };
  const res = await maj(id, { statut: "nouveau", doublon_de: null, doublon_verifie: false });
  if (!res.erreur) await journal(id, "doublon_annule");
  return res;
}

const coordonneesSchema = z.object({
  prenom: texte,
  nom: texte,
  email: z.union([z.literal(""), z.email("Email invalide.")]),
  telephone: texte,
  ville: texte,
  code_postal: texte,
  besoin: texte,
});

function socleDe(d: z.infer<typeof coordonneesSchema>) {
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v)) as Record<string, string>;
}

// Compléter ou corriger un lead (brief §9.3) : mêmes normalisation et géolocalisation qu'à l'arrivée.
export async function modifierCoordonnees(fd: FormData): Promise<ResultatAction> {
  const id = uuid.safeParse(fd.get("id"));
  const p = coordonneesSchema.safeParse(Object.fromEntries(fd));
  if (!id.success) return { erreur: "Lead inconnu." };
  if (!p.success) return { erreur: p.error.issues[0].message };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("statut, pays").eq("id", id.data).single();
  if (!lead) return { erreur: "Lead introuvable." };

  const socle = normaliser(socleDe(p.data), lead.pays ?? "FR");
  const geo = (lead.pays ?? "FR") === "FR" ? await geolocaliser(socle.ville, socle.code_postal).catch(() => null) : null;
  const contactable = Boolean(socle.telephone || socle.email);

  const res = await maj(id.data, {
    prenom: socle.prenom ?? null,
    nom: socle.nom ?? null,
    email: socle.email ?? null,
    telephone: socle.telephone ?? null,
    besoin: socle.besoin ?? null,
    ville: (socle.ville && geo && !geo.incertaine && geo.ville) || socle.ville || null,
    code_postal: geo?.code_postal ?? socle.code_postal ?? null,
    departement: geo?.departement ?? null,
    region: geo?.region ?? null,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    geoloc_incertaine: geo ? geo.incertaine : Boolean(socle.ville || socle.code_postal),
    // Un lead « à compléter » devient « nouveau » dès qu'on peut joindre le client.
    ...(lead.statut === "a_completer" && contactable && { statut: "nouveau" }),
  });
  if (!res.erreur) await journal(id.data, "infos_modifiees");
  return res;
}

const creationSchema = coordonneesSchema.extend({
  site_id: uuid.optional().or(z.literal("").transform(() => undefined)),
  thematique_id: uuid.optional().or(z.literal("").transform(() => undefined)),
  recu_le: texte.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date de réception invalide."),
  notes_internes: texte,
});

// Saisie manuelle (brief §3.4) : on stocke la saisie comme payload brut puis on passe
// par le même traitement qu'un webhook (normalisation, géolocalisation, doublons).
export async function creerLead(fd: FormData): Promise<ResultatAction> {
  const p = creationSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { site_id, thematique_id, recu_le, notes_internes, ...coordonnees } = p.data;
  if (!coordonnees.telephone && !coordonnees.email) return { erreur: "Téléphone ou email obligatoire." };

  const supabase = await createClient();
  let thematique = thematique_id;
  if (site_id) {
    const { data: site } = await supabase.from("sites").select("thematique_id").eq("id", site_id).single();
    thematique = site?.thematique_id;
  }
  if (!thematique) return { erreur: "Choisissez un site ou une thématique." };

  const libelles: Record<string, string> = {
    prenom: "Prénom", nom: "Nom", email: "Email", telephone: "Téléphone", ville: "Ville", code_postal: "Code postal", besoin: "Besoin",
  };
  const payload = Object.fromEntries(Object.entries(socleDe(coordonnees)).map(([k, v]) => [libelles[k], v]));

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      thematique_id: thematique,
      site_id: site_id ?? null,
      recu_le: heureParisVersDate(recu_le).toISOString(),
      payload_brut: payload,
      notes_internes: notes_internes || null,
      statut: "a_completer",
    })
    .select("id")
    .single();
  if (error || !lead) return { erreur: "Erreur : " + (error?.message ?? "création impossible") };

  await journal(lead.id, "saisie_manuelle");
  await traiterLead(lead.id);
  rafraichir();
  return {};
}

// --- Attribution et envoi (brief §6, §9.2, §9.3) ---

// Les fonctions d'envoi utilisent la clé serveur (hors RLS) : on vérifie le rôle explicitement.
async function estAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("est_admin");
  return data === true;
}

export async function attribuerManuellement(id: string, partenaireId: string): Promise<ResultatAction> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(partenaireId).success) return { erreur: "Partenaire invalide." };
  const res = await maj(id, { partenaire_id: partenaireId, attribue_le: new Date().toISOString(), statut: "attribue", envoye_le: null, vu_le: null });
  if (!res.erreur) await journal(id, "attribue", { manuel: true });
  return res;
}

export async function relancerAttribution(id: string): Promise<ResultatAction> {
  if (!uuid.safeParse(id).success) return { erreur: "Lead inconnu." };
  if (!(await estAdmin())) return { erreur: "Action réservée aux admins." };
  const statut = await attribuerLead(id);
  rafraichir();
  return statut === "hors_zone" ? { erreur: "Aucun partenaire ne couvre cette zone : lead hors zone." } : {};
}

export async function envoyerLead(id: string): Promise<ResultatAction> {
  if (!uuid.safeParse(id).success) return { erreur: "Lead inconnu." };
  if (!(await estAdmin())) return { erreur: "Action réservée aux admins." };
  const res = await envoyerAuPartenaire(id, "nouveau", undefined, "admin");
  rafraichir();
  return res;
}
