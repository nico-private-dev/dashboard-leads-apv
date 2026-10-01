// Seuil d'alerte « site silencieux » (brief §10). Fonction pure : testée par silence.test.ts.
const JOUR = 86_400_000;
const SILENCE_MIN_JOURS = 3;
const SILENCE_DEFAUT_JOURS = 7; // moins de 2 leads sur 30 jours : pas assez de recul pour le calcul auto

// Seuil de silence d'un site : réglage du site, sinon 2 × l'intervalle moyen entre leads sur 30 jours (3 jours minimum).
export function seuilSilenceJours(datesRecentes: number[], reglage: number | null): number {
  if (reglage) return reglage;
  if (datesRecentes.length < 2) return SILENCE_DEFAUT_JOURS;
  const triees = [...datesRecentes].sort((a, b) => a - b);
  const moyenne = (triees[triees.length - 1] - triees[0]) / (triees.length - 1) / JOUR;
  return Math.max(SILENCE_MIN_JOURS, 2 * moyenne);
}

