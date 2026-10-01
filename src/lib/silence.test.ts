// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { seuilSilenceJours } from "./silence.ts";

const J = 86_400_000;

test("seuil de silence : réglage du site, sinon 2 × intervalle moyen, minimum 3 jours", () => {
  assert.equal(seuilSilenceJours([0, 5 * J], 10), 10);
  assert.equal(seuilSilenceJours([0], null), 7); // pas assez de recul
  assert.equal(seuilSilenceJours([0, 4 * J, 8 * J], null), 8); // un lead tous les 4 jours → 8 jours
  assert.equal(seuilSilenceJours([0, J / 2, J], null), 3); // très actif → minimum 3 jours
});
