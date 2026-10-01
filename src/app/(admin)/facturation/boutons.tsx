"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { marquerFacture, marquerPaye } from "./actions";

export function BoutonFacturation({ partenaireId, mois, statut }: { partenaireId: string; mois: string; statut: string }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string>();
  if (statut !== "a_facturer" && statut !== "facture") return null;
  const action = statut === "a_facturer" ? marquerFacture : marquerPaye;
  return (
    <>
      <Button size="sm" variant={statut === "a_facturer" ? "default" : "outline"} disabled={enCours} onClick={() => demarrer(async () => setErreur((await action(partenaireId, mois)).erreur))}>
        {statut === "a_facturer" ? "Marquer facturé" : "Marquer payé"}
      </Button>
      {erreur && <span className="block text-xs text-destructive">{erreur}</span>}
    </>
  );
}
