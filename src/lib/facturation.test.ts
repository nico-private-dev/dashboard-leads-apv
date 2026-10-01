// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerRecap, type LeadFacturation, type PartenaireFacturation } from "./facturation.ts";

const part = (id: string, extra: Partial<PartenaireFacturation>): PartenaireFacturation => ({
  id, raison_sociale: id, modele: null, prix_lead: null, taux_commission: null, montant_abonnement_mensuel: null, date_debut: null, ...extra,
});
const lead = (partenaire_id: string, extra: Partial<LeadFacturation>): LeadFacturation => ({
  partenaire_id, envoye_le: "2026-09-10T10:00:00Z", facturable_le: null, statut: "envoye", statut_facturation: "non_facturable",
  prix_facture: null, montant_commission: null, ...extra,
});

const ecoGreen = part("eco", { modele: "achat_lead", prix_lead: 30 });
const valero = part("valero", { modele: "commission", taux_commission: 10 });
const abonne = part("abo", { modele: "abonnement", montant_abonnement_mensuel: 400, date_debut: "2026-09-15" });

test("récap mensuel : achat au lead, commission, abonnement", () => {
  const leads = [
    // Achat au lead : 2 facturables en septembre (dont un passé « facturé »), 1 contesté, 1 encore en délai, 1 d'août
    lead("eco", { facturable_le: "2026-09-17T08:00:00Z", statut_facturation: "a_facturer", prix_facture: 30 }),
    lead("eco", { facturable_le: "2026-09-30T21:59:00Z", statut_facturation: "facture", prix_facture: 30 }), // 30/09 23:59 à Paris
    lead("eco", { facturable_le: "2026-09-20T08:00:00Z", statut_facturation: "conteste", statut: "invalide" }),
    lead("eco", { envoye_le: "2026-09-29T10:00:00Z" }),
    lead("eco", { envoye_le: "2026-08-20T10:00:00Z", facturable_le: "2026-08-27T10:00:00Z", statut_facturation: "a_facturer", prix_facture: 30 }),
    lead("eco", { facturable_le: "2026-09-30T22:30:00Z", statut_facturation: "a_facturer", prix_facture: 30 }), // 01/10 à Paris → octobre
    // Commission : 10 % de 25 000 € signé en septembre
    lead("valero", { statut: "signe", facturable_le: "2026-09-22T10:00:00Z", statut_facturation: "a_facturer", montant_commission: 2500 }),
    lead("valero", { statut: "contacte" }),
    // Abonnement : 400 € pour 4 leads → 100 € par lead
    ...[1, 2, 3, 4].map(() => lead("abo", {})),
  ];
  const [eco, val, abo] = calculerRecap([ecoGreen, valero, abonne], leads, [], "2026-09");

  assert.equal(eco.montant, 60);
  assert.equal(eco.leadsFacturables, 2);
  assert.equal(eco.contestes, 1);
  assert.equal(eco.leadsRecus, 5); // envoyés en septembre (hors août)
  assert.equal(eco.statut, "a_facturer");

  assert.equal(val.montant, 2500);
  assert.equal(val.leadsFacturables, 1);
  assert.equal(val.leadsRecus, 2);

  assert.equal(abo.montant, 400);
  assert.equal(abo.coutParLead, 100);
  assert.equal(calculerRecap([abonne], [], [], "2026-08")[0].montant, 0); // abonnement pas encore commencé
});

test("facture déjà émise : montant figé et statut repris", () => {
  const [eco] = calculerRecap([ecoGreen], [], [{ partenaire_id: "eco", statut: "paye", montant: 90, nb_leads: 3 }], "2026-09");
  assert.equal(eco.montant, 90);
  assert.equal(eco.statut, "paye");
});
