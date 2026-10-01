// Dates toujours affichées en français, fuseau Europe/Paris (CLAUDE.md).
const FUSEAU = "Europe/Paris";

const dateHeure = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, dateStyle: "short", timeStyle: "short" });
const relatif = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatDateHeure(d: string | Date) {
  return dateHeure.format(new Date(d));
}

export function joursDepuis(d: string | Date, maintenant = new Date()) {
  return Math.floor((maintenant.getTime() - new Date(d).getTime()) / 86_400_000);
}

export function depuis(d: string | Date, maintenant = new Date()) {
  const minutes = Math.round((new Date(d).getTime() - maintenant.getTime()) / 60_000);
  if (Math.abs(minutes) < 60) return relatif.format(minutes, "minute");
  const heures = Math.round(minutes / 60);
  if (Math.abs(heures) < 24) return relatif.format(heures, "hour");
  return relatif.format(Math.round(heures / 24), "day");
}

const jourCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });

// « 2026-09-21 » (date sans heure) → « 21/09/2026 »
export function formatJour(jour: string) {
  return jourCourt.format(new Date(jour + "T12:00:00Z"));
}

export function formatPeriode(debut: string, fin: string) {
  return `du ${formatJour(debut)} au ${formatJour(fin)}`;
}

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurosCentimes = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

export function formatEuros(n: number, centimes = false) {
  return (centimes ? eurosCentimes : euros).format(n);
}

export function formatNombre(n: number, decimales = 0) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimales }).format(n);
}
