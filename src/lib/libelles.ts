// Libellés français des valeurs stockées en base.
export const TYPES_SOURCE = [
  { value: "tally", label: "Formulaire Tally" },
  { value: "generic", label: "Webhook générique" },
  { value: "csv", label: "Import CSV" },
  { value: "manuel", label: "Saisie manuelle" },
];

// Classes de badge : jaune APV toujours en fond avec texte foncé (charte).
export const STATUTS: Record<string, { label: string; classe: string }> = {
  nouveau: { label: "Nouveau", classe: "bg-jaune text-jaune-foreground" },
  attribue: { label: "Attribué", classe: "bg-secondary text-secondary-foreground" },
  envoye: { label: "Envoyé", classe: "bg-secondary text-secondary-foreground" },
  vu: { label: "Vu", classe: "bg-secondary text-secondary-foreground" },
  contacte: { label: "Contacté", classe: "bg-secondary text-secondary-foreground" },
  devis_envoye: { label: "Devis envoyé", classe: "bg-secondary text-secondary-foreground" },
  signe: { label: "Signé", classe: "bg-emerald-700 text-white" },
  perdu: { label: "Perdu", classe: "border border-border text-muted-foreground" },
  a_completer: { label: "À compléter", classe: "bg-primary text-primary-foreground" },
  hors_zone: { label: "Hors zone", classe: "border border-primary text-primary" },
  doublon: { label: "Doublon", classe: "border border-border text-muted-foreground" },
  invalide: { label: "Invalide", classe: "border border-border text-muted-foreground" },
  non_lead: { label: "Non lead", classe: "border border-border text-muted-foreground" },
  archive: { label: "Archivé", classe: "border border-border text-muted-foreground" },
};

export const STATUTS_FACTURATION: Record<string, string> = {
  non_facturable: "Non facturable",
  a_facturer: "À facturer",
  facture: "Facturé",
  paye: "Payé",
  conteste: "Contesté",
};

// Leads à traiter par un admin (brief §9.2).
export const STATUTS_A_TRAITER = ["nouveau", "a_completer", "hors_zone", "doublon"];

export const EVENEMENTS: Record<string, string> = {
  recu: "Reçu",
  saisie_manuelle: "Saisi à la main",
  traite: "Traité automatiquement",
  statut_change: "Statut modifié",
  erreur_traitement: "Erreur de traitement",
  geolocalisation_echec: "Géolocalisation impossible",
  correction: "Correction",
  infos_modifiees: "Coordonnées modifiées",
  note: "Note interne modifiée",
  doublon_confirme: "Doublon confirmé",
  doublon_annule: "Doublon annulé",
};

export function nomComplet(l: { prenom: string | null; nom: string | null }) {
  return [l.prenom, l.nom].filter(Boolean).join(" ") || "Sans nom";
}
