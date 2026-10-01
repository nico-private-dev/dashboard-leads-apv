import "server-only";
import { EmailAdmin, EmailLead } from "@/emails/email-lead";
import { choisirRegle, type Regle } from "@/lib/attribution";
import { emailsAdmins, envoyerEmail } from "@/lib/email";
import { nomComplet } from "@/lib/libelles";
import { signerLien } from "@/lib/liens";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

// Attribution et envoi aux partenaires (brief §6, §7). Client serveur : appelé par le traitement
// automatique, les actions admin et la tâche planifiée.

type Db = ReturnType<typeof createAdminClient>;
export type TypeEnvoi = "nouveau" | "relance" | "suivi";

async function evenement(db: Db, lead_id: string, type: string, details: Record<string, unknown>, auteur = "systeme") {
  await db.from("lead_events").insert({ lead_id, type, auteur, details: details as Json });
}

export async function notifierAdmins(titre: string, lignes: string[], chemin = "/") {
  return envoyerEmail({
    a: emailsAdmins(),
    objet: `[Dashboard APV] ${titre}`,
    contenu: EmailAdmin({ titre, lignes, lien: `${process.env.NEXT_PUBLIC_APP_URL}${chemin}` }),
  });
}

// Cherche le partenaire du lead. Retourne le statut posé.
export async function attribuerLead(leadId: string, db: Db = createAdminClient()): Promise<string> {
  const { data: lead } = await db.from("leads").select("id, thematique_id, site_id, pays, region, departement, lat, lng, statut").eq("id", leadId).single();
  if (!lead) return "introuvable";
  const { data: regles } = await db.from("attributions").select("*").eq("thematique_id", lead.thematique_id).eq("actif", true);
  const regle = choisirRegle((regles ?? []) as Regle[], lead);

  if (!regle) {
    // Sans localisation, « hors zone » serait trompeur : le lead attend une attribution manuelle.
    if (!lead.region && !lead.departement && lead.lat === null) {
      await evenement(db, leadId, "attribution_impossible", { motif: "Localisation inconnue : attribution manuelle" });
      return lead.statut;
    }
    await db.from("leads").update({ statut: "hors_zone" }).eq("id", leadId);
    return "hors_zone";
  }

  await db.from("leads").update({ partenaire_id: regle.partenaire_id, attribue_le: new Date().toISOString(), statut: "attribue" }).eq("id", leadId);
  const { data: p } = await db.from("partenaires").select("raison_sociale").eq("id", regle.partenaire_id).single();
  await evenement(db, leadId, "attribue", { partenaire: p?.raison_sociale, envoi_auto: regle.envoi_auto });
  if (regle.envoi_auto) {
    const r = await envoyerAuPartenaire(leadId, "nouveau", db);
    return r.erreur ? "attribue" : "envoye";
  }
  return "attribue";
}

const OBJETS: Record<TypeEnvoi, (t: string, ville: string) => string> = {
  nouveau: (t, v) => `Nouveau lead ${t} — ${v}`,
  relance: (t, v) => `Rappel : lead ${t} — ${v} en attente`,
  suivi: (t, v) => `Où en est ce projet ? ${t} — ${v}`,
};

const INTROS: Record<TypeEnvoi, string> = {
  nouveau: "Voici un nouveau lead pour vous. Merci de contacter le client rapidement, puis de nous le signaler d'un clic.",
  relance: "Ce lead vous a été envoyé il y a plus de 48 h et n'a pas encore été traité. Pouvez-vous nous dire où vous en êtes ?",
  suivi: "Où en est ce projet ? Un clic suffit pour nous tenir informés.",
};

export async function envoyerAuPartenaire(leadId: string, type: TypeEnvoi, db: Db = createAdminClient(), auteur = "systeme"): Promise<{ erreur?: string }> {
  const secret = process.env.LINK_SIGNING_SECRET;
  if (!secret) return { erreur: "LINK_SIGNING_SECRET manquant." };
  const { data: lead } = await db.from("leads").select("*, thematiques(nom), partenaires(*)").eq("id", leadId).single();
  if (!lead?.partenaires) return { erreur: "Aucun partenaire attribué." };
  const p = lead.partenaires;
  if (!p.contact_email) return { erreur: `Email de réception de ${p.raison_sociale} à renseigner (écran Partenaires).` };

  const jeton = signerLien(lead.id, p.id, secret);
  const url = (action: string) => `${process.env.NEXT_PUBLIC_APP_URL}/p/${jeton}?action=${action}`;
  const boutons: { libelle: string; url: string; principal?: boolean }[] =
    type === "suivi"
      ? [
          { libelle: "Devis envoyé", url: url("devis_envoye"), principal: true },
          { libelle: "Signé", url: url("signe"), principal: true },
          { libelle: "Perdu", url: url("perdu") },
          { libelle: "Toujours en cours", url: url("en_cours") },
        ]
      : [
          { libelle: "J'ai contacté le client", url: url("contacte"), principal: true },
          { libelle: "Lead invalide", url: url("invalide") },
        ];
  // « Ouvrir mon espace » seulement pour les partenaires qui ont un accès (brief §7).
  const { data: acces } = await db.from("profils").select("id").eq("role", "partenaire").eq("partenaire_id", p.id).limit(1);
  if (acces?.length) boutons.push({ libelle: "Ouvrir mon espace", url: `${process.env.NEXT_PUBLIC_APP_URL}/espace` });
  const lieu = [lead.ville, lead.code_postal, lead.departement && `(${lead.departement})`].filter(Boolean).join(" ") || "Non précisée";
  const thematique = lead.thematiques?.nom ?? "Lead";

  const res = await envoyerEmail({
    a: [p.contact_email],
    copie: p.emails_copie,
    objet: OBJETS[type](thematique, lead.ville ?? lead.departement ?? "France"),
    contenu: EmailLead({
      intro: INTROS[type],
      thematique,
      lead: {
        nom: nomComplet(lead),
        telephone: lead.telephone,
        email: lead.email,
        lieu,
        besoin: lead.besoin,
        champs: (Array.isArray(lead.champs_specifiques) ? lead.champs_specifiques : []) as { label: string; valeur: string }[],
        resumeAppel: lead.allo_resume,
      },
      boutons,
    }),
  });
  if (res.erreur) {
    await evenement(db, leadId, "email_echec", { type, erreur: res.erreur });
    return { erreur: "Envoi impossible : " + res.erreur };
  }

  if (type === "nouveau") {
    await db
      .from("leads")
      .update({ envoye_le: new Date().toISOString(), ...(["nouveau", "attribue", "hors_zone"].includes(lead.statut) && { statut: "envoye" }) })
      .eq("id", leadId);
  }
  await evenement(db, leadId, type === "nouveau" ? "email_envoye" : type === "relance" ? "relance_envoyee" : "suivi_envoye", {
    a: p.contact_email,
    partenaire: p.raison_sociale,
    ...(res.simule && { simule: true }),
  }, auteur);
  return {};
}
