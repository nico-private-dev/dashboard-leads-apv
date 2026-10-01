export const ACTIONS_PARTENAIRE = ["contacte", "invalide", "devis_envoye", "signe", "perdu", "en_cours"] as const;
export type ActionPartenaire = (typeof ACTIONS_PARTENAIRE)[number];
export const MOTIFS_INVALIDE = ["Faux numéro", "Hors zone", "Doublon", "Autre"];

export const LIBELLES_ACTION: Record<ActionPartenaire, string> = {
  contacte: "J'ai contacté le client",
  invalide: "Lead invalide",
  devis_envoye: "Devis envoyé",
  signe: "Signé",
  perdu: "Perdu",
  en_cours: "Toujours en cours",
};
