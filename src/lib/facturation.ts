// Récap mensuel de facturation (brief §8). Fonction pure : testée par facturation.test.ts.
import { heureParisVersDate } from "./periodes.ts";

export type PartenaireFacturation = {
  id: string;
  raison_sociale: string;
  modele: string | null;
  prix_lead: number | null;
  taux_commission: number | null;
  montant_abonnement_mensuel: number | null;
  date_debut: string | null;
};

export type LeadFacturation = {
  partenaire_id: string | null;
  envoye_le: string | null;
  facturable_le: string | null;
  statut: string;
  statut_facturation: string;
  prix_facture: number | null;
  montant_commission: number | null;
};

export type FactureMois = { partenaire_id: string; statut: string; montant: number; nb_leads: number };

export type LigneRecap = {
  partenaire: PartenaireFacturation;
  leadsRecus: number; // envoyés dans le mois
  leadsFacturables: number;
  contestes: number;
  montant: number;
  coutParLead: number | null; // abonnement : argument de renouvellement
  statut: "a_facturer" | "facture" | "paye" | "rien";
};

// « 2026-09 » → bornes du mois en heure de Paris.
export function bornesMoisParis(mois: string) {
  const [a, m] = mois.split("-").map(Number);
  const suivant = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  return { debut: heureParisVersDate(`${mois}-01`), fin: heureParisVersDate(`${suivant}-01`) };
}

export function calculerRecap(partenaires: PartenaireFacturation[], leads: LeadFacturation[], factures: FactureMois[], mois: string): LigneRecap[] {
  const { debut, fin } = bornesMoisParis(mois);
  const dans = (d: string | null) => d !== null && new Date(d) >= debut && new Date(d) < fin;
  const dernierJour = new Date(fin.getTime() - 1).toISOString().slice(0, 10);

  return partenaires.map((p) => {
    const siens = leads.filter((l) => l.partenaire_id === p.id);
    const recus = siens.filter((l) => dans(l.envoye_le) && l.statut !== "archive").length;
    // Achat au lead : facturable après le délai de contestation ; commission : à la signature.
    const facturables = siens.filter((l) => dans(l.facturable_le) && ["a_facturer", "facture", "paye"].includes(l.statut_facturation));
    const contestes = siens.filter((l) => dans(l.facturable_le) && l.statut_facturation === "conteste").length;

    let montant = 0;
    if (p.modele === "achat_lead") montant = facturables.reduce((t, l) => t + Number(l.prix_facture ?? p.prix_lead ?? 0), 0);
    if (p.modele === "commission") montant = facturables.reduce((t, l) => t + Number(l.montant_commission ?? 0), 0);
    const abonne = p.modele === "abonnement" && (!p.date_debut || p.date_debut <= dernierJour);
    if (abonne) montant = Number(p.montant_abonnement_mensuel ?? 0);

    const facture = factures.find((f) => f.partenaire_id === p.id);
    return {
      partenaire: p,
      leadsRecus: recus,
      leadsFacturables: p.modele === "abonnement" ? recus : facturables.length,
      contestes,
      montant: Math.round((facture?.montant ?? montant) * 100) / 100,
      coutParLead: abonne && recus ? montant / recus : null,
      statut: facture ? (facture.statut as "facture" | "paye") : montant > 0 ? "a_facturer" : "rien",
    };
  });
}
