"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enregistrerStats, type ResultatStats } from "./actions";

export type LigneSaisie = {
  site_id: string;
  nom: string;
  region: string | null;
  nb: number | null;
  valides: number | null;
  ca: number | null;
  chevauchement: string | null; // autre saisie qui chevauche la période choisie
};

// Tableau de saisie rapide : une ligne par site Leadrs, on remplit les colonnes de la période.
export function FormulaireStats({ debut, fin, lignes }: { debut: string; fin: string; lignes: LigneSaisie[] }) {
  const [resultat, setResultat] = useState<ResultatStats>({});
  const [enCours, demarrer] = useTransition();

  return (
    <form
      key={debut + fin}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        demarrer(async () => setResultat(await enregistrerStats(fd)));
      }}
      className="space-y-3"
    >
      <input type="hidden" name="periode_debut" value={debut} />
      <input type="hidden" name="periode_fin" value={fin} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Site</th>
              <th className="px-3 py-2 text-left font-medium">Leads</th>
              <th className="px-3 py-2 text-left font-medium">Validés</th>
              <th className="px-3 py-2 text-left font-medium">CA versé (€)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.site_id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <input type="hidden" name="site_id" value={l.site_id} />
                  <input type="hidden" name={`nom_${l.site_id}`} value={l.nom} />
                  <div className="font-medium">{l.region ?? l.nom}</div>
                  {l.chevauchement && <div className="text-xs text-primary">Déjà saisi : {l.chevauchement}</div>}
                </td>
                <td className="px-3 py-2">
                  <Input name={`nb_${l.site_id}`} defaultValue={l.nb ?? ""} inputMode="numeric" className="w-20 bg-card" aria-label={`Leads ${l.nom}`} />
                </td>
                <td className="px-3 py-2">
                  <Input name={`valides_${l.site_id}`} defaultValue={l.valides ?? ""} inputMode="numeric" className="w-20 bg-card" aria-label={`Validés ${l.nom}`} />
                </td>
                <td className="px-3 py-2">
                  <Input name={`ca_${l.site_id}`} defaultValue={l.ca ?? ""} inputMode="decimal" className="w-28 bg-card" aria-label={`CA ${l.nom}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer la période"}
        </Button>
        {resultat.message && <span className="text-sm text-muted-foreground">{resultat.message}</span>}
        {resultat.erreur && <span className="text-sm text-destructive">{resultat.erreur}</span>}
      </div>
      <p className="text-xs text-muted-foreground">Vider une ligne supprime la saisie de ce site pour la période.</p>
    </form>
  );
}
