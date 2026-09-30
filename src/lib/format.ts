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
