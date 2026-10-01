// Périodes d'analyse, toujours calculées en heure de Paris (CLAUDE.md), même depuis l'étranger.
export const FUSEAU = "Europe/Paris";

export const PERIODES = [
  { code: "7j", label: "7 j", jours: 7 },
  { code: "15j", label: "15 j", jours: 15 },
  { code: "30j", label: "30 j", jours: 30 },
  { code: "3m", label: "3 mois", jours: 91 },
  { code: "6m", label: "6 mois", jours: 182 },
  { code: "12m", label: "12 mois", jours: 365 },
  { code: "tout", label: "Tout", jours: null },
] as const;
export type CodePeriode = (typeof PERIODES)[number]["code"];
export const PERIODE_DEFAUT: CodePeriode = "30j";

const jourParis = new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU }); // → AAAA-MM-JJ

// Jour calendaire à Paris d'un instant : « 2026-10-01 ».
export function dateParis(d: Date): string {
  return jourParis.format(d);
}

export function ajouterJours(jour: string, n: number): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Décalage de Paris (en minutes) à un instant donné : 60 l'hiver, 120 l'été.
function decalageParis(d: Date): number {
  const nom = new Intl.DateTimeFormat("en-US", { timeZone: FUSEAU, timeZoneName: "longOffset" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")!.value; // « GMT+02:00 »
  const m = nom.match(/GMT([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

// Heure locale de Paris (« 2026-10-01T09:30 » ou « 2026-10-01 ») → instant UTC.
export function heureParisVersDate(local: string): Date {
  const approx = new Date((local.length === 10 ? local + "T00:00" : local) + ":00Z");
  return new Date(approx.getTime() - decalageParis(approx) * 60_000);
}

export type Bornes = {
  code: CodePeriode;
  debut: Date | null; // null = depuis toujours
  fin: Date;
  premierJour: string | null;
  dernierJour: string;
  precedente: { debut: Date; fin: Date } | null;
};

// « 7 j » = aujourd'hui + les 6 jours précédents (jours entiers à Paris). Période précédente de même durée.
export function bornesPeriode(code: string | undefined, maintenant = new Date()): Bornes {
  const p = PERIODES.find((x) => x.code === code) ?? PERIODES.find((x) => x.code === PERIODE_DEFAUT)!;
  const dernierJour = dateParis(maintenant);
  if (p.jours === null) return { code: p.code, debut: null, fin: maintenant, premierJour: null, dernierJour, precedente: null };
  const premierJour = ajouterJours(dernierJour, -(p.jours - 1));
  const debut = heureParisVersDate(premierJour);
  return {
    code: p.code,
    debut,
    fin: maintenant,
    premierJour,
    dernierJour,
    precedente: { debut: heureParisVersDate(ajouterJours(premierJour, -p.jours)), fin: debut },
  };
}

export function nbJours(premier: string, dernier: string): number {
  return Math.round((Date.parse(dernier) - Date.parse(premier)) / 86_400_000) + 1;
}

// Part d'une période saisie (Leadrs) qui tombe dans la fenêtre analysée, au prorata des jours.
export function prorata(periodeDebut: string, periodeFin: string, fenetreDebut: string | null, fenetreFin: string): number {
  const debut = fenetreDebut && fenetreDebut > periodeDebut ? fenetreDebut : periodeDebut;
  const fin = fenetreFin < periodeFin ? fenetreFin : periodeFin;
  if (fin < debut) return 0;
  return nbJours(debut, fin) / nbJours(periodeDebut, periodeFin);
}

// Instant → « 2026-10-01T09:30 » à Paris (valeur d'un <input type="datetime-local">).
export function heureParisLocale(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: FUSEAU, dateStyle: "short", timeStyle: "short" }).format(d).replace(" ", "T");
}

// Lundi de la semaine d'un jour donné.
export function lundi(jour: string): string {
  const jds = new Date(jour + "T12:00:00Z").getUTCDay(); // 0 = dimanche
  return ajouterJours(jour, -((jds + 6) % 7));
}

// « 2026-09 » → premier et dernier jour du mois.
export function bornesMois(mois: string): { debut: string; fin: string } {
  const [a, m] = mois.split("-").map(Number);
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { debut: `${mois}-01`, fin: `${mois}-${String(dernier).padStart(2, "0")}` };
}
