// Extraction et normalisation du socle commun d'un lead (brief §3.1, §3.5, §4 étapes 2-3).
// Fonctions pures, sans accès base : testées par extraction.test.ts.
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type ChampSocle = "prenom" | "nom" | "email" | "telephone" | "ville" | "code_postal" | "besoin";
export type Socle = Partial<Record<ChampSocle, string>>;
export type ChampSpecifique = { label: string; valeur: string };
export type Extraction = { socle: Socle; champs_specifiques: ChampSpecifique[] };
// Mapping manuel par source (sources.config.mapping) : libellé ou clé du champ → champ du socle.
export type Mapping = Record<string, ChampSocle>;

function sansAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Détection par libellé. L'ordre compte : « prénom » contient « nom ».
const REGLES: [ChampSocle, RegExp][] = [
  ["email", /e-?mail|courriel/],
  ["telephone", /telephone|\btel\b|portable/], // pas « mobile » : confondu avec mobil-home
  ["code_postal", /code postal|\bcp\b/], // pas « postal » seul : « adresse postale »
  ["ville", /ville|commune|localite|city/],
  ["prenom", /prenom|first ?name/],
  ["nom", /\bnom\b|last ?name|name/],
  ["besoin", /besoin|projet|message|demande|description|precisions/],
];

export function champDuLibelle(label: string): ChampSocle | undefined {
  const l = sansAccents(label);
  // « Nom et prénom », « Nom complet » : tout va dans nom.
  if (/\bnom\b/.test(l) && /prenom|complet/.test(l)) return "nom";
  return REGLES.find(([, re]) => re.test(l))?.[0];
}

function enTexte(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v)) return v.map(enTexte).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.url === "string") return o.url; // fichier Tally
    return JSON.stringify(v);
  }
  return String(v).trim();
}

// Ajoute une valeur au socle si le champ est libre, sinon la garde en champ spécifique.
function ranger(res: Extraction, champ: ChampSocle | undefined, label: string, valeur: string) {
  if (!valeur) return;
  if (champ && !res.socle[champ]) res.socle[champ] = valeur;
  else res.champs_specifiques.push({ label, valeur });
}

type ChampTally = {
  key: string;
  label: string | null;
  type: string;
  value: unknown;
  options?: { id: string; text: string }[];
};

export function extraireTally(payload: unknown, mapping: Mapping = {}): Extraction {
  const fields = (payload as { data?: { fields?: ChampTally[] } })?.data?.fields;
  if (!Array.isArray(fields)) throw new Error("Payload Tally sans data.fields");
  const res: Extraction = { socle: {}, champs_specifiques: [] };

  for (const f of fields) {
    const label = f.label?.trim() || f.key;
    // Cases à cocher : Tally envoie aussi une entrée par option (valeur booléenne) → doublon inutile.
    if (f.type === "CHECKBOXES" && typeof f.value === "boolean") continue;
    const valeur = f.options && Array.isArray(f.value)
      ? f.value.map((id) => f.options!.find((o) => o.id === id)?.text ?? id).join(", ")
      : enTexte(f.value);
    const champ =
      mapping[f.key] ?? mapping[label] ??
      (f.type === "INPUT_EMAIL" ? "email" : f.type === "INPUT_PHONE_NUMBER" ? "telephone" : champDuLibelle(label));
    ranger(res, champ, label, valeur);
  }
  return res;
}

// Webhook générique : un objet JSON simple { "Nom": "...", "Téléphone": "...", ... }.
export function extraireGenerique(payload: unknown, mapping: Mapping = {}): Extraction {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Le JSON doit être un objet");
  const res: Extraction = { socle: {}, champs_specifiques: [] };
  for (const [cle, v] of Object.entries(payload)) {
    ranger(res, mapping[cle] ?? champDuLibelle(cle), cle, enTexte(v));
  }
  return res;
}

export function normaliserTelephone(tel: string, pays = "FR"): string {
  const p = parsePhoneNumberFromString(tel, pays as CountryCode);
  return p?.isValid() ? p.number : tel.replace(/\s+/g, "");
}

// « jean-pierre DE LA fontaine » → « Jean-Pierre De La Fontaine »
export function casseNom(s: string): string {
  return s.trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
}

export function normaliser(socle: Socle, pays = "FR"): Socle {
  const n: Socle = { ...socle };
  if (n.email) n.email = n.email.trim().toLowerCase();
  if (n.telephone) n.telephone = normaliserTelephone(n.telephone, pays);
  if (n.prenom) n.prenom = casseNom(n.prenom);
  if (n.nom) n.nom = casseNom(n.nom);
  if (n.code_postal) n.code_postal = n.code_postal.replace(/\s+/g, "");
  if (n.ville) {
    // « 14940 », « Caen 14000 », « Caen (14000) » : on sépare la ville du code postal.
    const m = n.ville.trim().match(/^(.*?)[\s,(-]*(\d{5})\)?$/);
    n.ville = (m ? m[1] : n.ville).trim() || undefined;
    if (m && !n.code_postal) n.code_postal = m[2];
    if (!n.ville) delete n.ville;
  }
  return n;
}
