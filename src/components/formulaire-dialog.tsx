"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type ResultatAction = { erreur?: string };

// Fenêtre avec un formulaire relié à une server action ; se ferme si l'action réussit.
export function FormulaireDialog({
  titre,
  declencheur,
  action,
  children,
}: {
  titre: string;
  declencheur: React.ReactElement;
  action: (formData: FormData) => Promise<ResultatAction>;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [enCours, demarrer] = useTransition();

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        setErreur(undefined);
      }}
    >
      <DialogTrigger render={declencheur} />
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>
        <form
          // onSubmit plutôt que action= : React réinitialise le formulaire après une action, on perdrait la saisie en cas d'erreur.
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            demarrer(async () => {
              const res = await action(fd);
              if (res.erreur) setErreur(res.erreur);
              else setOuvert(false);
            });
          }}
          className="space-y-4"
        >
          {children}
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
