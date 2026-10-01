// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { signerLien, verifierLien } from "./liens.ts";

test("lien 1 clic : valide 60 jours, infalsifiable", () => {
  const t0 = Date.parse("2026-10-01T00:00:00Z");
  const jeton = signerLien("lead-1", "part-1", "secret", t0);
  assert.deepEqual(verifierLien(jeton, "secret", t0 + 59 * 86_400_000)?.lead, "lead-1");
  assert.equal(verifierLien(jeton, "secret", t0 + 61 * 86_400_000), null); // expiré
  assert.equal(verifierLien(jeton, "autre-secret", t0), null);
  const [donnees, sig] = jeton.split(".");
  const falsifie = Buffer.from(Buffer.from(donnees, "base64url").toString().replace("lead-1", "lead-2")).toString("base64url");
  assert.equal(verifierLien(`${falsifie}.${sig}`, "secret", t0), null);
  assert.equal(verifierLien("n'importe-quoi", "secret", t0), null);
});
