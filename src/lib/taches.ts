import "server-only";
import { envoyerAuPartenaire, notifierAdmins } from "@/lib/envoi";
import { filtreATraiter } from "@/lib/libelles";
import { seuilSilenceJours } from "@/lib/silence";
import { createAdminClient } from "@/lib/supabase/server";

// Vérifications périodiques (brief §7 relances, §10 alertes). Appelées toutes les heures
// par la tâche planifiée (/api/taches) ou à la main depuis la vue d'ensemble.

type Db = ReturnType<typeof createAdminClient>;
const HEURE = 3_600_000;
const JOUR = 24 * HEURE;

async function alerter(db: Db, alerte: { type: string; message: string; site_id?: string; lead_id?: string }) {
  // Une seule alerte ouverte par cible et par type.
  let q = db.from("alertes").select("id").eq("type", alerte.type).eq("resolue", false);
  q = alerte.site_id ? q.eq("site_id", alerte.site_id) : q.eq("lead_id", alerte.lead_id!);
  const { data } = await q.limit(1);
  if (data?.length) return false;
  await db.from("alertes").insert(alerte);
  return true;
}

// Lead envoyé sans aucun clic après 48 h → relance au partenaire + alerte (une seule fois).
async function relances48h(db: Db) {
  const { data: leads } = await db
    .from("leads")
    .select("id, nom, prenom, lead_events(type)")
    .eq("statut", "envoye")
    .is("vu_le", null)
    .lt("envoye_le", new Date(Date.now() - 48 * HEURE).toISOString());
  let n = 0;
  for (const l of leads ?? []) {
    if (l.lead_events.some((e) => e.type === "relance_envoyee")) continue;
    const r = await envoyerAuPartenaire(l.id, "relance", db);
    await alerter(db, { type: "lead_non_traite", lead_id: l.id, message: `Lead ${[l.prenom, l.nom].filter(Boolean).join(" ")} sans action du partenaire depuis 48 h${r.erreur ? ` (relance impossible : ${r.erreur})` : " : relance envoyée"}.` });
    n++;
  }
  return n;
}

// Commission : « Où en est ce projet ? » à J+15 puis J+30 après l'envoi.
async function suivisCommission(db: Db) {
  const { data: leads } = await db
    .from("leads")
    .select("id, envoye_le, partenaires!inner(modele), lead_events(type)")
    .eq("partenaires.modele", "commission")
    .in("statut", ["envoye", "vu", "contacte", "devis_envoye"])
    .lt("envoye_le", new Date(Date.now() - 15 * JOUR).toISOString());
  let n = 0;
  for (const l of leads ?? []) {
    const deja = l.lead_events.filter((e) => e.type === "suivi_envoye").length;
    const age = Date.now() - new Date(l.envoye_le!).getTime();
    if ((deja === 0 && age >= 15 * JOUR) || (deja === 1 && age >= 30 * JOUR)) {
      await envoyerAuPartenaire(l.id, "suivi", db);
      n++;
    }
  }
  return n;
}

// Site silencieux : formulaire peut-être cassé. Leadrs : dernière période saisie sans aucun lead.
async function sitesSilencieux(db: Db) {
  const [{ data: sites }, { data: leads }, { data: stats }] = await Promise.all([
    db.from("sites").select("id, nom, collecte, alerte_silence_jours").eq("actif", true),
    db.from("leads").select("site_id, recu_le").not("site_id", "is", null).not("statut", "in", "(doublon,archive)").gte("recu_le", new Date(Date.now() - 90 * JOUR).toISOString()),
    db.from("stats_externes").select("site_id, periode_debut, periode_fin, nb_leads").order("periode_fin", { ascending: false }),
  ]);
  let n = 0;
  for (const s of sites ?? []) {
    let silencieux = false;
    let message = "";
    if (s.collecte === "leadrs") {
      const derniere = stats?.find((x) => x.site_id === s.id);
      silencieux = derniere?.nb_leads === 0;
      message = `${s.nom} : aucun lead Leadrs sur la dernière période saisie.`;
    } else {
      const dates = (leads ?? []).filter((l) => l.site_id === s.id).map((l) => new Date(l.recu_le).getTime());
      if (!dates.length) continue; // jamais de lead récent : site pas encore branché, pas d'alerte
      const dernier = Math.max(...dates);
      const seuil = seuilSilenceJours(dates.filter((d) => d > Date.now() - 30 * JOUR), s.alerte_silence_jours);
      const jours = (Date.now() - dernier) / JOUR;
      silencieux = jours > seuil;
      message = `${s.nom} : aucun lead depuis ${Math.floor(jours)} jours (seuil ${Math.round(seuil)} j). Formulaire à vérifier.`;
    }
    if (silencieux) {
      if (await alerter(db, { type: "site_silencieux", site_id: s.id, message })) n++;
    } else {
      // Les leads sont revenus : l'alerte se résout seule.
      await db.from("alertes").update({ resolue: true, resolue_le: new Date().toISOString() }).eq("type", "site_silencieux").eq("site_id", s.id).eq("resolue", false);
    }
  }
  return n;
}

// Récap quotidien aux admins (leads à compléter, hors zone, alertes) : brief §7.
async function recapQuotidien(db: Db) {
  const [{ count: aTraiter }, { data: alertes }, { count: recus }] = await Promise.all([
    db.from("leads").select("id", { count: "exact", head: true }).or(filtreATraiter()),
    db.from("alertes").select("message").eq("resolue", false).order("created_at", { ascending: false }).limit(10),
    db.from("leads").select("id", { count: "exact", head: true }).not("statut", "in", "(doublon,archive)").gte("recu_le", new Date(Date.now() - JOUR).toISOString()),
  ]);
  await notifierAdmins(
    "Récap quotidien",
    [`${recus ?? 0} lead(s) reçu(s) sur les dernières 24 h.`, `${aTraiter ?? 0} lead(s) à traiter.`, ...(alertes?.length ? ["Alertes actives :", ...alertes.map((a) => `• ${a.message}`)] : ["Aucune alerte active."])],
    "/a-traiter",
  );
}

export async function executerTaches({ recap = false } = {}) {
  const db = createAdminClient();
  const resultat = {
    relances: await relances48h(db),
    suivis: await suivisCommission(db),
    sites_silencieux: await sitesSilencieux(db),
    recap: false,
  };
  if (recap) {
    await recapQuotidien(db);
    resultat.recap = true;
  }
  return resultat;
}
