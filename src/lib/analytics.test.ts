// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculerVueEnsemble, type LeadStat } from "./analytics.ts";
import { bornesPeriode } from "./periodes.ts";

const ref = {
  thematiques: [{ id: "pv", nom: "PV", couleur: "#000000" }, { id: "th", nom: "Tiny", couleur: "#111111" }],
  sites: [{ id: "s-bzh", nom: "PV Bretagne", thematique_id: "pv" }, { id: "s-tiny", nom: "Tiny France", thematique_id: "th" }],
  sources: [{ id: "tally1", type: "tally" }],
};

const lead = (recu_le: string, statut = "nouveau", extra: Partial<LeadStat> = {}): LeadStat => ({
  recu_le, statut, thematique_id: "th", site_id: "s-tiny", source_id: "tally1", partenaire_id: null, prix_facture: null, montant_commission: null, ...extra,
});

test("vue d'ensemble : doublons à part, variation, courbe par jour, Leadrs au prorata", () => {
  const bornes = bornesPeriode("7j", new Date("2026-10-01T10:00:00Z")); // 25/09 → 01/10
  const v = calculerVueEnsemble({
    leads: [
      lead("2026-09-25T08:00:00Z"),
      lead("2026-09-30T21:30:00Z"), // 30/09 23:30 à Paris
      lead("2026-09-30T22:30:00Z"), // 01/10 00:30 à Paris
      lead("2026-10-01T08:00:00Z", "doublon"),
      lead("2026-10-01T09:00:00Z", "nouveau", { source_id: null, site_id: null }),
    ],
    precedents: 2,
    stats: [
      { site_id: "s-bzh", periode_debut: "2026-09-21", periode_fin: "2026-09-27", nb_leads: 14, nb_leads_valides: 7, ca_verse: 700 }, // 3/7 dans la période
      { site_id: "s-bzh", periode_debut: "2026-08-01", periode_fin: "2026-08-31", nb_leads: 99, nb_leads_valides: 99, ca_verse: 9999 }, // hors période
    ],
    ref,
    bornes,
    leadrsApplicable: true,
  });

  assert.equal(v.recus, 4);
  assert.equal(v.doublons, 1);
  assert.equal(v.variation, 1); // 4 contre 2 → +100 %
  assert.equal(v.granularite, "jour");
  assert.equal(v.courbe.length, 7);
  assert.deepEqual(v.courbe.find((c) => c.periode === "2026-09-30"), { periode: "2026-09-30", leads: 1 });
  assert.deepEqual(v.courbe.find((c) => c.periode === "2026-10-01"), { periode: "2026-10-01", leads: 2 });
  assert.equal(v.leadrs?.leads, 6);
  assert.equal(v.leadrs?.ca, 300);
  assert.equal(v.leadrs?.estime, true);
  assert.deepEqual(v.parThematique.map((t) => [t.nom, t.direct, t.leadrs]), [["PV", 0, 6], ["Tiny", 4, 0]]);
  assert.deepEqual(v.parSource, [{ nom: "Tally", n: 3 }, { nom: "Saisie manuelle", n: 1 }]);
  assert.equal(v.topSites[0].nom, "Tiny France");
});

test("filtre non applicable à Leadrs → pas de chiffres Leadrs", () => {
  const v = calculerVueEnsemble({ leads: [], precedents: 0, stats: [], ref, bornes: bornesPeriode("tout"), leadrsApplicable: false });
  assert.equal(v.leadrs, null);
  assert.equal(v.variation, null);
});
