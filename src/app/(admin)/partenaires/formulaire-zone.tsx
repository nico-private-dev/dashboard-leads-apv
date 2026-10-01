"use client";

import { useState } from "react";
import { CaseACocher, Champ, ChampSelect } from "@/components/champ";
import { FormulaireDialog } from "@/components/formulaire-dialog";
import { REGIONS, type ZoneConfig } from "@/lib/attribution";
import type { Referentiel } from "@/lib/referentiel";
import type { Tables } from "@/lib/supabase/types";
import { enregistrerRegle } from "./actions";

const TYPES = [
  { value: "regions", label: "Régions" },
  { value: "departements", label: "Départements" },
  { value: "rayon", label: "Rayon autour d'une ville" },
  { value: "france", label: "Toute la France" },
  { value: "pays", label: "Pays (hors France)" },
];

export function FormulaireZone({
  partenaireId,
  regle,
  referentiel,
  declencheur,
}: {
  partenaireId: string;
  regle?: Tables<"attributions">;
  referentiel: Pick<Referentiel, "thematiques" | "sites">;
  declencheur: React.ReactElement;
}) {
  const z = (regle?.zone_config ?? {}) as ZoneConfig;
  const [type, setType] = useState(regle?.type_zone ?? "regions");
  const [thematique, setThematique] = useState(regle?.thematique_id ?? "");
  const sites = referentiel.sites.filter((s) => s.thematique_id === thematique);

  return (
    <FormulaireDialog titre={regle ? "Modifier la zone" : "Nouvelle zone"} declencheur={declencheur} action={enregistrerRegle}>
      <input type="hidden" name="id" value={regle?.id ?? ""} />
      <input type="hidden" name="partenaire_id" value={partenaireId} />
      <ChampSelect
        label="Thématique"
        name="thematique_id"
        value={thematique}
        onChange={(e) => setThematique(e.target.value)}
        options={[{ value: "", label: "— Choisir —" }, ...referentiel.thematiques.map((t) => ({ value: t.id, label: t.nom }))]}
      />
      <ChampSelect
        label="Site"
        name="site_id"
        defaultValue={regle?.site_id ?? ""}
        options={[{ value: "", label: "Tous les sites de la thématique" }, ...sites.map((s) => ({ value: s.id, label: s.nom }))]}
      />
      <ChampSelect label="Type de zone" name="type_zone" value={type} onChange={(e) => setType(e.target.value)} options={TYPES} />

      {/* Champs masqués plutôt que retirés : leurs valeurs restent si on change de type par erreur. */}
      <fieldset className={type === "regions" ? "grid grid-cols-2 gap-1.5" : "hidden"}>
        {REGIONS.map((r) => (
          <CaseACocher key={r} label={r} name="regions" value={r} defaultChecked={z.regions?.includes(r)} />
        ))}
      </fieldset>
      <div className={type === "departements" ? "" : "hidden"}>
        <Champ label="Départements" name="departements" defaultValue={z.departements?.join(", ") ?? ""} placeholder="31, 81, 82" />
      </div>
      <div className={type === "pays" ? "" : "hidden"}>
        <Champ label="Pays" name="pays" defaultValue={z.pays?.join(", ") ?? ""} placeholder="BE, LU" aide="Codes à 2 lettres" />
      </div>
      <div className={type === "rayon" ? "grid grid-cols-2 gap-3" : "hidden"}>
        <Champ label="Ville centre" name="centre_ville" defaultValue={z.centre?.ville ?? ""} placeholder="Lyon" />
        <Champ label="Rayon (km)" name="rayon_km" type="number" min={1} defaultValue={z.rayon_km ?? ""} aide="1h30 de route ≈ 120 km" />
      </div>

      <Champ label="Priorité" name="priorite" type="number" defaultValue={regle?.priorite ?? 0} aide="Si plusieurs zones couvrent un lead, la plus haute gagne." />
      <CaseACocher label="Envoi automatique de l'email (sinon validation dans « À traiter »)" name="envoi_auto" defaultChecked={regle?.envoi_auto} />
      <CaseACocher label="Active" name="actif" defaultChecked={regle?.actif ?? true} />
    </FormulaireDialog>
  );
}
