"use client";

import { Plus } from "lucide-react";
import { creerLead } from "@/app/(admin)/leads/actions";
import { Champ } from "@/components/champ";
import { FormulaireDialog } from "@/components/formulaire-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Referentiel } from "@/lib/referentiel";
import { ChampsCoordonnees } from "./actions-lead";

// Saisie manuelle (brief §3.4) : lead reçu par téléphone direct, email…
export function NouveauLead({ referentiel, maintenant }: { referentiel: Referentiel; maintenant: string }) {
  const { thematiques, sites } = referentiel;
  return (
    <FormulaireDialog
      titre="Ajouter un lead"
      action={creerLead}
      declencheur={
        <Button>
          <Plus /> Ajouter un lead
        </Button>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="site_id">Site ou thématique</Label>
        <select id="site_id" name="site_id" className="h-8 w-full rounded-lg border border-input bg-card px-2 text-sm" defaultValue="">
          <option value="">— Choisir un site —</option>
          {thematiques.map((t) => (
            <optgroup key={t.id} label={t.nom}>
              {sites
                .filter((s) => s.thematique_id === t.id && s.collecte === "direct")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <select name="thematique_id" className="h-8 w-full rounded-lg border border-input bg-card px-2 text-sm" defaultValue="" aria-label="Thématique (sans site)">
          <option value="">… ou une thématique sans site</option>
          {thematiques.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom}
            </option>
          ))}
        </select>
      </div>
      <ChampsCoordonnees />
      <Champ label="Reçu le (heure de Paris)" name="recu_le" type="datetime-local" defaultValue={maintenant} required />
      <div className="space-y-1.5">
        <Label htmlFor="notes_internes_nouveau">Note interne</Label>
        <Textarea id="notes_internes_nouveau" name="notes_internes" rows={2} />
      </div>
    </FormulaireDialog>
  );
}
