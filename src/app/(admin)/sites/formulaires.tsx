"use client";

import { CaseACocher, Champ, ChampSelect } from "@/components/champ";
import { FormulaireDialog } from "@/components/formulaire-dialog";
import { TYPES_SOURCE } from "@/lib/libelles";
import type { Tables } from "@/lib/supabase/types";
import { enregistrerSite, enregistrerSource, enregistrerThematique } from "./actions";

type Declencheur = { declencheur: React.ReactElement };

export function FormulaireThematique({ thematique, declencheur }: Declencheur & { thematique?: Tables<"thematiques"> }) {
  return (
    <FormulaireDialog
      titre={thematique ? "Modifier la thématique" : "Nouvelle thématique"}
      declencheur={declencheur}
      action={enregistrerThematique}
    >
      <input type="hidden" name="id" value={thematique?.id ?? ""} />
      <Champ label="Nom" name="nom" defaultValue={thematique?.nom} required />
      <Champ label="Couleur de la pastille" name="couleur" type="color" defaultValue={thematique?.couleur ?? "#6B6B6B"} className="w-20 p-1" />
      <CaseACocher label="Plusieurs sites (un par région)" name="multi_sites" defaultChecked={thematique?.multi_sites} />
      <CaseACocher label="Active" name="actif" defaultChecked={thematique?.actif ?? true} />
    </FormulaireDialog>
  );
}

export function FormulaireSite({
  site,
  thematiqueId,
  thematiques,
  declencheur,
}: Declencheur & { site?: Tables<"sites">; thematiqueId: string; thematiques: Tables<"thematiques">[] }) {
  return (
    <FormulaireDialog titre={site ? "Modifier le site" : "Nouveau site"} declencheur={declencheur} action={enregistrerSite}>
      <input type="hidden" name="id" value={site?.id ?? ""} />
      <ChampSelect
        label="Thématique"
        name="thematique_id"
        defaultValue={site?.thematique_id ?? thematiqueId}
        options={thematiques.map((t) => ({ value: t.id, label: t.nom }))}
      />
      <Champ label="Nom" name="nom" defaultValue={site?.nom} required />
      <Champ label="Domaine" name="domaine" defaultValue={site?.domaine ?? ""} placeholder="exemple.fr" />
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Pays" name="pays" defaultValue={site?.pays ?? "FR"} maxLength={2} required aide="Code à 2 lettres" />
        <Champ label="Région" name="region" defaultValue={site?.region ?? ""} aide="Vide = tout le pays" />
      </div>
      <ChampSelect
        label="Réception des leads"
        name="collecte"
        defaultValue={site?.collecte ?? "direct"}
        options={[
          { value: "direct", label: "En direct (leads reçus ici)" },
          { value: "leadrs", label: "Iframe Leadrs (chiffres agrégés)" },
        ]}
      />
      <Champ
        label="Alerte si aucun lead depuis (jours)"
        name="alerte_silence_jours"
        type="number"
        min={1}
        defaultValue={site?.alerte_silence_jours ?? ""}
        aide="Vide = 7 jours"
      />
      <CaseACocher label="Actif" name="actif" defaultChecked={site?.actif ?? true} />
    </FormulaireDialog>
  );
}

export function FormulaireSource({
  source,
  siteId,
  thematiqueId,
  declencheur,
}: Declencheur & { source?: Tables<"sources">; siteId?: string; thematiqueId: string }) {
  return (
    <FormulaireDialog titre={source ? "Modifier la source" : "Nouvelle source"} declencheur={declencheur} action={enregistrerSource}>
      <input type="hidden" name="id" value={source?.id ?? ""} />
      <input type="hidden" name="site_id" value={source?.site_id ?? siteId ?? ""} />
      <input type="hidden" name="thematique_id" value={source?.thematique_id ?? thematiqueId} />
      <Champ label="Nom" name="nom" defaultValue={source?.nom} placeholder="Formulaire devis" required />
      <ChampSelect label="Type" name="type" defaultValue={source?.type ?? "tally"} options={TYPES_SOURCE} />
      <Champ
        label="Secret de signature (Tally)"
        name="webhook_secret"
        defaultValue={source?.webhook_secret ?? ""}
        autoComplete="off"
        aide="Le « Signing secret » saisi dans le webhook Tally. Laisser vide pour les autres types."
      />
      <CaseACocher label="Active" name="actif" defaultChecked={source?.actif ?? true} />
    </FormulaireDialog>
  );
}
