// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { bornesPeriode, dateParis, heureParisVersDate, prorata } from "./periodes.ts";

test("jour à Paris, même quand il est encore la veille en UTC", () => {
  assert.equal(dateParis(new Date("2026-09-30T22:30:00Z")), "2026-10-01"); // 00:30 à Paris
});

test("minuit à Paris, été comme hiver et jours de changement d'heure", () => {
  assert.equal(heureParisVersDate("2026-07-01").toISOString(), "2026-06-30T22:00:00.000Z");
  assert.equal(heureParisVersDate("2026-12-01").toISOString(), "2026-11-30T23:00:00.000Z");
  assert.equal(heureParisVersDate("2026-03-29").toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(heureParisVersDate("2026-10-25").toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(heureParisVersDate("2026-10-01T09:30").toISOString(), "2026-10-01T07:30:00.000Z");
});

test("7 derniers jours = aujourd'hui + 6 jours, période précédente de même durée", () => {
  const b = bornesPeriode("7j", new Date("2026-10-01T10:00:00Z"));
  assert.equal(b.premierJour, "2026-09-25");
  assert.equal(b.debut?.toISOString(), "2026-09-24T22:00:00.000Z");
  assert.equal(b.precedente?.debut.toISOString(), "2026-09-17T22:00:00.000Z");
  assert.equal(bornesPeriode("tout").debut, null);
  assert.equal(bornesPeriode("n'importe quoi").code, "30j");
});

test("prorata Leadrs", () => {
  assert.equal(prorata("2026-09-01", "2026-09-30", "2026-09-25", "2026-10-01"), 6 / 30);
  assert.equal(prorata("2026-09-21", "2026-09-27", null, "2026-10-01"), 1);
  assert.equal(prorata("2026-08-01", "2026-08-31", "2026-09-25", "2026-10-01"), 0);
});
