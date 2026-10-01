"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ResultatClic } from "@/lib/action-partenaire";
import { ACTIONS_PARTENAIRE, LIBELLES_ACTION, MOTIFS_INVALIDE, type ActionPartenaire } from "./constantes";

// Le clic dans l'email ouvre cette page ; seul le bouton « Confirmer » enregistre (les scanners d'emails ne cliquent pas).
// `envoyer` : action serveur déjà liée au lien signé (page /p) ou au lead de l'espace partenaire.
export function FormulaireClic({ envoyer, actionInitiale }: { envoyer: (fd: FormData) => Promise<ResultatClic>; actionInitiale: ActionPartenaire }) {
  const [action, setAction] = useState<ActionPartenaire>(actionInitiale);
  const [resultat, setResultat] = useState<ResultatClic>({});
  const [enCours, demarrer] = useTransition();

  if (resultat.message) return <p className="rounded-lg bg-muted/60 p-4 text-sm font-medium">{resultat.message}</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        demarrer(async () => setResultat(await envoyer(fd)));
      }}
      className="space-y-4"
    >
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-2 text-sm font-medium">Où en êtes-vous ?</legend>
        {ACTIONS_PARTENAIRE.map((a) => (
          <label
            key={a}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${action === a ? "border-primary bg-primary/5 font-medium" : ""}`}
          >
            <input type="radio" name="action" value={a} checked={action === a} onChange={() => setAction(a)} className="accent-primary" />
            {LIBELLES_ACTION[a]}
          </label>
        ))}
      </fieldset>

      {action === "invalide" && (
        <div className="space-y-2">
          <Label htmlFor="motif">Motif</Label>
          <select id="motif" name="motif" required defaultValue="" className="h-9 w-full rounded-lg border border-input bg-card px-2 text-sm">
            <option value="" disabled>
              Choisir un motif
            </option>
            {MOTIFS_INVALIDE.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <Input name="precision" placeholder="Précision (facultatif)" />
        </div>
      )}
      {(action === "devis_envoye" || action === "signe") && (
        <div className="space-y-2">
          <Label htmlFor="montant">Montant {action === "signe" ? "signé" : "du devis"} (€ HT)</Label>
          <Input id="montant" name="montant" inputMode="decimal" required={action === "signe"} placeholder="25 000" />
        </div>
      )}

      {resultat.erreur && <p className="text-sm text-destructive">{resultat.erreur}</p>}
      <Button type="submit" className="w-full" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Confirmer"}
      </Button>
    </form>
  );
}
