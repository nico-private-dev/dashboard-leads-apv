"use client";

import { useState } from "react";
import { CaseACocher, Champ, ChampSelect } from "@/components/champ";
import { FormulaireDialog } from "@/components/formulaire-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/supabase/types";
import { enregistrerPartenaire } from "./actions";

export function FormulairePartenaire({ partenaire, declencheur }: { partenaire?: Tables<"partenaires">; declencheur: React.ReactElement }) {
  const [modele, setModele] = useState(partenaire?.modele ?? "");
  return (
    <FormulaireDialog titre={partenaire ? partenaire.raison_sociale : "Nouveau partenaire"} declencheur={declencheur} action={enregistrerPartenaire}>
      <input type="hidden" name="id" value={partenaire?.id ?? ""} />
      <Champ label="Raison sociale" name="raison_sociale" defaultValue={partenaire?.raison_sociale} required />

      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-xs font-semibold text-muted-foreground">Modèle économique</legend>
        <ChampSelect
          label="Modèle"
          name="modele"
          value={modele}
          onChange={(e) => setModele(e.target.value)}
          options={[
            { value: "", label: "— À renseigner —" },
            { value: "commission", label: "Commission sur la vente" },
            { value: "achat_lead", label: "Achat au lead" },
            { value: "abonnement", label: "Abonnement mensuel" },
          ]}
        />
        {/* Les 3 tarifs restent dans le formulaire (valeurs conservées) ; seul celui du modèle est affiché. */}
        <div className={modele === "commission" ? "" : "hidden"}>
          <Champ label="Taux de commission (%)" name="taux_commission" inputMode="decimal" defaultValue={partenaire?.taux_commission ?? ""} />
        </div>
        <div className={modele === "achat_lead" ? "" : "hidden"}>
          <Champ label="Prix par lead (€)" name="prix_lead" inputMode="decimal" defaultValue={partenaire?.prix_lead ?? ""} />
        </div>
        <div className={modele === "abonnement" ? "" : "hidden"}>
          <Champ label="Abonnement mensuel (€)" name="montant_abonnement_mensuel" inputMode="decimal" defaultValue={partenaire?.montant_abonnement_mensuel ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Champ label="Délai de contestation (jours)" name="delai_contestation_jours" type="number" min={0} defaultValue={partenaire?.delai_contestation_jours ?? 7} />
          <Champ label="Début du partenariat" name="date_debut" type="date" defaultValue={partenaire?.date_debut ?? ""} />
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Champ label="Contact" name="contact_nom" defaultValue={partenaire?.contact_nom ?? ""} />
        <Champ label="Téléphone" name="telephone" type="tel" defaultValue={partenaire?.telephone ?? ""} />
      </div>
      <Champ label="Email (reçoit les leads)" name="contact_email" type="email" defaultValue={partenaire?.contact_email ?? ""} />
      <Champ label="Emails en copie" name="emails_copie" defaultValue={partenaire?.emails_copie.join(", ") ?? ""} aide="Séparés par des virgules" />
      <div className="grid grid-cols-2 gap-3">
        <Champ label="SIRET" name="siret" defaultValue={partenaire?.siret ?? ""} />
        <Champ label="Site web" name="site_web" defaultValue={partenaire?.site_web ?? ""} />
      </div>
      <Champ label="Adresse" name="adresse" defaultValue={partenaire?.adresse ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes internes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={partenaire?.notes ?? ""} />
      </div>
      <CaseACocher label="Actif" name="actif" defaultChecked={partenaire?.actif ?? true} />
    </FormulaireDialog>
  );
}
