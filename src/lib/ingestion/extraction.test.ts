// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { casseNom, champDuLibelle, extraireGenerique, extraireTally, normaliser } from "./extraction.ts";

const tally = {
  eventId: "evt_1",
  eventType: "FORM_RESPONSE",
  data: {
    fields: [
      { key: "q1", label: "Prénom", type: "INPUT_TEXT", value: "jean-pierre" },
      { key: "q2", label: "Nom", type: "INPUT_TEXT", value: "DE LA FONTAINE" },
      { key: "q3", label: "Votre adresse", type: "INPUT_EMAIL", value: "JP@Exemple.FR " },
      { key: "q4", label: "Comment vous joindre ?", type: "INPUT_PHONE_NUMBER", value: "06 12 34 56 78" },
      { key: "q5", label: "Code postal", type: "INPUT_TEXT", value: "69 003" },
      { key: "q6", label: "Ville du projet", type: "INPUT_TEXT", value: "Lyon" },
      { key: "q7", label: "Décrivez votre projet", type: "TEXTAREA", value: "Maison 60 m²" },
      {
        key: "q8", label: "Surface souhaitée", type: "MULTIPLE_CHOICE", value: ["o2"],
        options: [{ id: "o1", text: "< 40 m²" }, { id: "o2", text: "40-80 m²" }],
      },
      { key: "q9", label: "Options", type: "CHECKBOXES", value: ["a"], options: [{ id: "a", text: "Terrasse" }] },
      { key: "q9_a", label: "Options (Terrasse)", type: "CHECKBOXES", value: true },
      { key: "q10", label: "Plans", type: "FILE_UPLOAD", value: [{ name: "p.pdf", url: "https://x/p.pdf" }] },
      { key: "q11", label: "Commentaire", type: "TEXTAREA", value: null },
    ],
  },
};

test("Tally : socle commun détecté par type et libellé, le reste en champs spécifiques", () => {
  const { socle, champs_specifiques } = extraireTally(tally);
  assert.deepEqual(socle, {
    prenom: "jean-pierre",
    nom: "DE LA FONTAINE",
    email: "JP@Exemple.FR",
    telephone: "06 12 34 56 78",
    code_postal: "69 003",
    ville: "Lyon",
    besoin: "Maison 60 m²",
  });
  assert.deepEqual(champs_specifiques, [
    { label: "Surface souhaitée", valeur: "40-80 m²" },
    { label: "Options", valeur: "Terrasse" },
    { label: "Plans", valeur: "https://x/p.pdf" },
  ]);
});

test("Tally : le mapping manuel prime sur la détection", () => {
  const { socle } = extraireTally(tally, { q8: "besoin", "Décrivez votre projet": "ville" });
  assert.equal(socle.besoin, "40-80 m²");
});

test("Tally : payload sans champs → erreur (le lead restera à compléter)", () => {
  assert.throws(() => extraireTally({ foo: 1 }));
});

test("libellés ambigus", () => {
  assert.equal(champDuLibelle("Nom et prénom"), "nom");
  assert.equal(champDuLibelle("Prénom"), "prenom");
  assert.equal(champDuLibelle("Type de mobil-home"), undefined);
  assert.equal(champDuLibelle("Adresse postale"), undefined);
});

test("générique + normalisation", () => {
  const { socle, champs_specifiques } = extraireGenerique({ nom: "martin", telephone: "+32 470 12 34 56", budget: 30000 });
  const n = normaliser(socle, "BE");
  assert.equal(n.telephone, "+32470123456");
  assert.equal(n.nom, "Martin");
  assert.deepEqual(champs_specifiques, [{ label: "budget", valeur: "30000" }]);
  const fr = normaliser({ telephone: "06 12 34 56 78", email: " A@B.FR", code_postal: "69 003" });
  assert.deepEqual(fr, { telephone: "+33612345678", email: "a@b.fr", code_postal: "69003" });
  assert.equal(casseNom("jean-pierre DE LA fontaine"), "Jean-Pierre De La Fontaine");
  assert.equal(casseNom("o'neil"), "O'Neil");
  assert.deepEqual(normaliser({ ville: "14940" }), { code_postal: "14940" });
  assert.deepEqual(normaliser({ ville: "Caen (14000)" }), { ville: "Caen", code_postal: "14000" });
  assert.deepEqual(normaliser({ ville: "Caen 14000", code_postal: "14123" }), { ville: "Caen", code_postal: "14123" });
  assert.deepEqual(normaliser({ ville: "Saint-Lô" }), { ville: "Saint-Lô" });
});
