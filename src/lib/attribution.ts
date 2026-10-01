// Moteur d'attribution (brief §6). Fonctions pures : testées par attribution.test.ts.

// Noms identiques à ceux renvoyés par la géolocalisation (api-adresse.data.gouv.fr).
export const REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "Guadeloupe",
  "Martinique",
  "Guyane",
  "La Réunion",
  "Mayotte",
];

export type ZoneConfig = {
  regions?: string[];
  departements?: string[];
  pays?: string[];
  centre?: { ville: string; lat: number; lng: number };
  rayon_km?: number;
};

export type Regle = {
  id: string;
  partenaire_id: string;
  thematique_id: string;
  site_id: string | null;
  type_zone: string;
  zone_config: ZoneConfig;
  priorite: number;
  envoi_auto: boolean;
  actif: boolean;
  created_at: string;
};

export type LeadZone = {
  thematique_id: string;
  site_id: string | null;
  pays: string | null;
  region: string | null;
  departement: string | null;
  lat: number | null;
  lng: number | null;
};

// Distance à vol d'oiseau (formule de haversine).
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function regleCouvre(r: Regle, l: LeadZone): boolean {
  const z = r.zone_config ?? {};
  switch (r.type_zone) {
    case "france":
      return !l.pays || l.pays === "FR";
    case "pays":
      return Boolean(l.pays && z.pays?.includes(l.pays));
    case "regions":
      return Boolean(l.region && z.regions?.includes(l.region));
    case "departements":
      return Boolean(l.departement && z.departements?.includes(l.departement));
    case "rayon":
      return Boolean(z.centre && z.rayon_km && l.lat !== null && l.lng !== null && distanceKm(z.centre, { lat: l.lat, lng: l.lng }) <= z.rayon_km);
    default:
      return false;
  }
}

// Plusieurs règles valides : la priorité la plus haute gagne ; à égalité, la règle la plus ancienne.
export function choisirRegle(regles: Regle[], l: LeadZone): Regle | null {
  return (
    regles
      .filter((r) => r.actif && r.thematique_id === l.thematique_id && (!r.site_id || r.site_id === l.site_id) && regleCouvre(r, l))
      .sort((a, b) => b.priorite - a.priorite || a.created_at.localeCompare(b.created_at))[0] ?? null
  );
}

export function decrireZone(type: string, z: ZoneConfig): string {
  if (type === "france") return "Toute la France";
  if (type === "pays") return `Pays : ${z.pays?.join(", ")}`;
  if (type === "regions") return z.regions?.join(", ") ?? "";
  if (type === "departements") return `Départements ${z.departements?.join(", ")}`;
  if (type === "rayon") return `${z.rayon_km} km autour de ${z.centre?.ville}`;
  return type;
}
