"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demanderConnexion, verifierCode, type EtatConnexion } from "./actions";

export function FormulaireConnexion() {
  const [etatEmail, envoyerEmail, envoiEnCours] = useActionState(demanderConnexion, { etape: "email" } as EtatConnexion);
  const [etatCode, envoyerCode, verifEnCours] = useActionState(verifierCode, { etape: "code" } as EtatConnexion);

  if (etatEmail.etape === "email") {
    return (
      <form action={envoyerEmail} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </div>
        {etatEmail.erreur && <p className="text-sm text-destructive">{etatEmail.erreur}</p>}
        <Button type="submit" className="w-full" disabled={envoiEnCours}>
          {envoiEnCours ? "Envoi…" : "Recevoir mon lien de connexion"}
        </Button>
      </form>
    );
  }

  return (
    <form action={envoyerCode} className="space-y-4">
      <input type="hidden" name="email" value={etatEmail.email} />
      <p className="text-sm text-muted-foreground">{etatEmail.message}</p>
      <p className="text-sm">
        Cliquez sur le lien reçu par email, ou saisissez le code à 6 chiffres :
      </p>
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
      </div>
      {etatCode.erreur && <p className="text-sm text-destructive">{etatCode.erreur}</p>}
      <Button type="submit" className="w-full" disabled={verifEnCours}>
        {verifEnCours ? "Vérification…" : "Se connecter"}
      </Button>
    </form>
  );
}
