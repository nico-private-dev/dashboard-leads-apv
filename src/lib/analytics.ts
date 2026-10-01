// Calculs de la vue d'ensemble (brief §9.1). Fonction pure : testée par analytics.test.ts.
// ponytail: agrégation en TypeScript sur les leads de la période ; passer en SQL si on dépasse ~50 000 leads/an.
import { ajouterJours, dateParis, lundi, nbJours, prorata, type Bornes } from "./periodes.ts";

export type LeadStat = {
  recu_le: string;
  statut: string;
  thematique_id: string;
  site_id: string | null;
  source_id: string | null;
  partenaire_id: string | null;
  prix_facture: number | null;
  montant_commission: number | null;
};

export type StatExterne = {
  site_id: string;
  periode_debut: string;
  periode_fin: string;
  nb_leads: number;
  nb_leads_valides: number | null;
  ca_verse: number | null;
};

type Ref = {
  thematiques: { id: string; nom: string; couleur: string }[];
  sites: { id: string; nom: string; thematique_id: string }[];
  sources: { id: string; type: string }[];
};

export type Granularite = "jour" | "semaine" | "mois";

function cle(jour: string, g: Granularite) {
  return g === "jour" ? jour : g === "semaine" ? lundi(jour) : jour.slice(0, 7) + "-01";
}

function suivant(jour: string, g: Granularite) {
  if (g === "jour") return ajouterJours(jour, 1);
  if (g === "semaine") return ajouterJours(jour, 7);
  const [a, m] = jour.split("-").map(Number);
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 10);
}

export function calculerVueEnsemble({
  leads,
  precedents,
  stats,
  ref,
  bornes,
  leadrsApplicable,
}: {
  leads: LeadStat[];
  precedents: number | null; // leads reçus (hors doublons) sur la période précédente
  stats: StatExterne[]; // saisies Leadrs déjà filtrées par thématique / site
  ref: Ref;
  bornes: Bornes;
  leadrsApplicable: boolean; // faux si un filtre ne s'applique pas aux chiffres agrégés (source, partenaire, département)
}) {
  // « Reçus » : ni doublons, ni archivés (leads de test, mis de côté).
  const recus = leads.filter((l) => l.statut !== "doublon" && l.statut !== "archive");
  const caDirect = recus.reduce((t, l) => t + Number(l.prix_facture ?? 0) + Number(l.montant_commission ?? 0), 0);
  const attribues = recus.filter((l) => l.partenaire_id).length;

  // Leadrs au prorata des jours de chaque saisie compris dans la période.
  const premier = bornes.premierJour;
  const dernier = bornes.dernierJour;
  let leadrs = { leads: 0, valides: 0, ca: 0, estime: false, saisies: 0 };
  const leadrsParThematique = new Map<string, number>();
  if (leadrsApplicable) {
    const thematiqueDuSite = new Map(ref.sites.map((s) => [s.id, s.thematique_id]));
    for (const s of stats) {
      const part = prorata(s.periode_debut, s.periode_fin, premier, dernier);
      if (part === 0) continue;
      if (part < 1) leadrs.estime = true;
      leadrs = {
        ...leadrs,
        leads: leadrs.leads + s.nb_leads * part,
        valides: leadrs.valides + (s.nb_leads_valides ?? 0) * part,
        ca: leadrs.ca + Number(s.ca_verse ?? 0) * part,
        saisies: leadrs.saisies + 1,
      };
      const t = thematiqueDuSite.get(s.site_id);
      if (t) leadrsParThematique.set(t, (leadrsParThematique.get(t) ?? 0) + s.nb_leads * part);
    }
  }

  // Courbe : par jour jusqu'à 31 jours, par semaine jusqu'à 6 mois, sinon par mois.
  const debutCourbe = premier ?? (recus.length ? dateParis(new Date(recus.reduce((m, l) => (l.recu_le < m ? l.recu_le : m), recus[0].recu_le))) : dernier);
  const duree = nbJours(debutCourbe, dernier);
  const granularite: Granularite = duree <= 31 ? "jour" : duree <= 186 ? "semaine" : "mois";
  const compte = new Map<string, number>();
  for (const l of recus) {
    const k = cle(dateParis(new Date(l.recu_le)), granularite);
    compte.set(k, (compte.get(k) ?? 0) + 1);
  }
  const courbe: { periode: string; leads: number }[] = [];
  for (let k = cle(debutCourbe, granularite); k <= dernier; k = suivant(k, granularite)) {
    courbe.push({ periode: k, leads: compte.get(k) ?? 0 });
  }

  const compter = <K>(cles: (l: LeadStat) => K) => {
    const m = new Map<K, number>();
    for (const l of recus) m.set(cles(l), (m.get(cles(l)) ?? 0) + 1);
    return m;
  };

  const parThematiqueDirect = compter((l) => l.thematique_id);
  const parThematique = ref.thematiques
    .map((t) => ({ nom: t.nom, couleur: t.couleur, direct: parThematiqueDirect.get(t.id) ?? 0, leadrs: Math.round(leadrsParThematique.get(t.id) ?? 0) }))
    .filter((t) => t.direct || t.leadrs)
    .sort((a, b) => b.direct + b.leadrs - (a.direct + a.leadrs));

  const typeSource = new Map(ref.sources.map((s) => [s.id, s.type]));
  const libelleType: Record<string, string> = { tally: "Tally", generic: "Webhook générique", csv: "Import", allo: "Allo", manuel: "Saisie manuelle" };
  const parSource = [...compter((l) => libelleType[(l.source_id && typeSource.get(l.source_id)) || "manuel"] ?? "Autre")]
    .map(([nom, n]) => ({ nom, n }))
    .sort((a, b) => b.n - a.n);

  const nomSite = new Map(ref.sites.map((s) => [s.id, s.nom]));
  const topSites = [...compter((l) => l.site_id)]
    .map(([id, n]) => ({ nom: (id && nomSite.get(id)) || "Sans site", n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  return {
    recus: recus.length,
    variation: precedents === null || precedents === 0 ? null : (recus.length - precedents) / precedents,
    precedents,
    doublons: leads.filter((l) => l.statut === "doublon").length,
    attribues,
    horsZone: recus.filter((l) => l.statut === "hors_zone").length,
    aCompleter: recus.filter((l) => l.statut === "a_completer").length,
    attentePartenaire: recus.filter((l) => l.statut === "envoye" || l.statut === "vu").length,
    caDirect,
    caParLeadDirect: attribues && caDirect ? caDirect / attribues : null,
    leadrs: leadrsApplicable ? { ...leadrs, caParLead: leadrs.valides ? leadrs.ca / leadrs.valides : null } : null,
    granularite,
    courbe,
    parThematique,
    parSource,
    topSites,
  };
}

export type VueEnsemble = ReturnType<typeof calculerVueEnsemble>;
