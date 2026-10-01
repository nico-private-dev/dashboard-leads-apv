// Filtres partagés par la liste des leads, l'export CSV et la vue d'ensemble :
// mêmes paramètres d'URL → mêmes leads, donc des chiffres qui concordent (critère de fin de phase 1).
import { bornesPeriode, type Bornes } from "./periodes";

export type Filtres = {
  periode?: string;
  thematique?: string;
  site?: string;
  source?: string; // id de source, ou « manuel » (leads saisis à la main, sans source)
  partenaire?: string;
  departement?: string;
  statut?: string;
  q?: string;
};

const CLES = ["periode", "thematique", "site", "source", "partenaire", "departement", "statut", "q"] as const;

export type ParamsUrl = Record<string, string | string[] | undefined>;

export function lireFiltres(sp: ParamsUrl): Filtres {
  const f: Filtres = {};
  for (const c of CLES) {
    const v = sp[c];
    if (typeof v === "string" && v.trim()) f[c] = v.trim();
  }
  return f;
}

export function versUrl(f: Filtres, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? "?" + s : "";
}

// Interface minimale des requêtes Supabase qu'on filtre (évite de dépendre des types internes).
interface Filtrable<Q> {
  eq(colonne: string, valeur: string): Q;
  neq(colonne: string, valeur: string): Q;
  not(colonne: string, operateur: string, valeur: string): Q;
  is(colonne: string, valeur: null): Q;
  gte(colonne: string, valeur: string): Q;
  lt(colonne: string, valeur: string): Q;
  or(filtre: string): Q;
}

export function appliquerFiltres<Q extends Filtrable<Q>>(
  query: Q,
  f: Filtres,
  options: { bornes?: Bornes | null; sansStatut?: boolean } = {},
): Q {
  let q = query;
  const bornes = options.bornes === undefined ? bornesPeriode(f.periode) : options.bornes;
  if (bornes?.debut) q = q.gte("recu_le", bornes.debut.toISOString());
  if (bornes) q = q.lt("recu_le", bornes.fin.toISOString());
  if (f.thematique) q = q.eq("thematique_id", f.thematique);
  if (f.site) q = q.eq("site_id", f.site);
  if (f.source === "manuel") q = q.is("source_id", null);
  else if (f.source) q = q.eq("source_id", f.source);
  if (f.partenaire) q = q.eq("partenaire_id", f.partenaire);
  if (f.departement) q = q.eq("departement", f.departement);
  // « sans_doublons » : ce que compte la vue d'ensemble comme « leads reçus » (ni doublons, ni archivés).
  if (f.statut === "sans_doublons" && !options.sansStatut) q = q.not("statut", "in", "(doublon,archive)");
  else if (f.statut && !options.sansStatut) q = q.eq("statut", f.statut);
  if (f.q) {
    // Caractères réservés de la syntaxe or() retirés.
    const t = f.q.replace(/[,()*"\\]/g, " ").trim();
    const chiffres = t.replace(/\D/g, "");
    const conditions = ["nom", "prenom", "email", "ville"].map((c) => `${c}.ilike.*${t}*`);
    // Téléphones stockés en +33… : on cherche sur les 9 derniers chiffres.
    if (chiffres.length >= 6) conditions.push(`telephone.ilike.*${chiffres.slice(-9)}*`);
    if (t) q = q.or(conditions.join(","));
  }
  return q;
}
