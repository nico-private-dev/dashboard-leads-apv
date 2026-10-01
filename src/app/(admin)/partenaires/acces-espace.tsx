"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { creerAccesEspace, retirerAccesEspace } from "./actions";

export function AccesEspace({ partenaireId, email, actif }: { partenaireId: string; email: string | null; actif: boolean }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string>();
  const lancer = (f: () => Promise<{ erreur?: string }>) => demarrer(async () => setErreur((await f()).erreur));

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">
        Espace partenaire : {actif ? <span className="font-medium text-foreground">accès actif ({email})</span> : "pas d'accès"}
      </span>
      {actif ? (
        <Button
          size="xs"
          variant="ghost"
          disabled={enCours}
          onClick={() => confirm("Retirer l'accès à l'espace partenaire ?") && lancer(() => retirerAccesEspace(partenaireId))}
        >
          Retirer
        </Button>
      ) : (
        <Button size="xs" variant="outline" disabled={enCours || !email} onClick={() => lancer(() => creerAccesEspace(partenaireId))}>
          Créer l&apos;accès
        </Button>
      )}
      {erreur && <span className="w-full text-destructive">{erreur}</span>}
    </div>
  );
}
