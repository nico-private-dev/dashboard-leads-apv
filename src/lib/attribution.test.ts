// Lancer : pnpm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { choisirRegle, distanceKm, type LeadZone, type Regle } from "./attribution.ts";

const regle = (id: string, extra: Partial<Regle>): Regle => ({
  id, partenaire_id: "p-" + id, thematique_id: "marquage", site_id: null, type_zone: "france", zone_config: {},
  priorite: 0, envoi_auto: false, actif: true, created_at: "2026-10-01T00:00:00Z", ...extra,
});
const lead = (extra: Partial<LeadZone>): LeadZone => ({
  thematique_id: "marquage", site_id: null, pays: "FR", region: null, departement: null, lat: null, lng: null, ...extra,
});

const dekalco = regle("dekalco", { type_zone: "regions", zone_config: { regions: ["Occitanie"] } });
const lyon = regle("lyon", { type_zone: "rayon", zone_config: { centre: { ville: "Lyon", lat: 45.758, lng: 4.835 }, rayon_km: 120 } });

test("critère de fin de phase 2 : Toulouse → Dekalco, Lille → aucun partenaire (hors zone)", () => {
  assert.equal(choisirRegle([dekalco], lead({ region: "Occitanie", departement: "31" }))?.id, "dekalco");
  assert.equal(choisirRegle([dekalco], lead({ region: "Hauts-de-France", departement: "59" })), null);
});

test("thématique, site, règle inactive", () => {
  assert.equal(choisirRegle([dekalco], lead({ thematique_id: "pv", region: "Occitanie" })), null);
  const surSite = regle("site", { site_id: "s1" });
  assert.equal(choisirRegle([surSite], lead({ site_id: "s2" })), null);
  assert.equal(choisirRegle([surSite], lead({ site_id: "s1" }))?.id, "site");
  assert.equal(choisirRegle([regle("off", { actif: false })], lead({})), null);
});

test("priorité la plus haute, puis la plus ancienne", () => {
  const a = regle("a", { priorite: 1, created_at: "2026-10-02T00:00:00Z" });
  const b = regle("b", { priorite: 1, created_at: "2026-10-01T00:00:00Z" });
  const c = regle("c", { priorite: 5, created_at: "2026-10-03T00:00:00Z" });
  assert.equal(choisirRegle([a, b], lead({}))?.id, "b");
  assert.equal(choisirRegle([a, b, c], lead({}))?.id, "c");
});

test("rayon, pays, départements, France", () => {
  assert.ok(Math.abs(distanceKm({ lat: 45.758, lng: 4.835 }, { lat: 45.188, lng: 5.724 }) - 94) < 3); // Lyon → Grenoble
  assert.equal(choisirRegle([lyon], lead({ lat: 45.188, lng: 5.724 }))?.id, "lyon");
  assert.equal(choisirRegle([lyon], lead({ lat: 43.605, lng: 1.444 })), null); // Toulouse
  assert.equal(choisirRegle([lyon], lead({})), null); // pas de coordonnées
  assert.equal(choisirRegle([regle("be", { type_zone: "pays", zone_config: { pays: ["BE"] } })], lead({ pays: "BE" }))?.id, "be");
  assert.equal(choisirRegle([regle("fr", {})], lead({ pays: "BE" })), null);
  assert.equal(choisirRegle([regle("d", { type_zone: "departements", zone_config: { departements: ["31"] } })], lead({ departement: "31" }))?.id, "d");
});
