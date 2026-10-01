"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { annulerDoublon, changerStatut, confirmerDoublon, enregistrerNote, modifierCoordonnees } from "@/app/(admin)/leads/actions";
import { Champ } from "@/components/champ";
import { FormulaireDialog, type ResultatAction } from "@/components/formulaire-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUTS } from "@/lib/libelles";

// Exécute une action serveur et affiche son éventuelle erreur.
function useAction() {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string>();
  const lancer = (f: () => Promise<ResultatAction>) =>
    demarrer(async () => {
      setErreur((await f()).erreur);
    });
  return { enCours, erreur, lancer };
}

export function ChangerStatut({ id, statut }: { id: string; statut: string }) {
  const [valeur, setValeur] = useState(statut);
  const { enCours, erreur, lancer } = useAction();
  return (
    <div className="space-y-1.5">
      <Label htmlFor="statut">Statut</Label>
      <div className="flex gap-2">
        <select
          id="statut"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-sm"
        >
          {Object.entries(STATUTS).map(([v, s]) => (
            <option key={v} value={v}>
              {s.label}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={enCours || valeur === statut} onClick={() => lancer(() => changerStatut(id, valeur))}>
          Enregistrer
        </Button>
      </div>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}

export function ActionsDoublon({ id, verifie }: { id: string; verifie: boolean }) {
  const { enCours, erreur, lancer } = useAction();
  return (
    <div className="flex flex-wrap gap-2">
      {!verifie && (
        <Button size="sm" variant="outline" disabled={enCours} onClick={() => lancer(() => confirmerDoublon(id))}>
          Confirmer le doublon
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={enCours} onClick={() => lancer(() => annulerDoublon(id))}>
        Ce n&apos;est pas un doublon
      </Button>
      {erreur && <p className="w-full text-sm text-destructive">{erreur}</p>}
    </div>
  );
}

export function MarquerInvalide({ id }: { id: string }) {
  const { enCours, lancer } = useAction();
  return (
    <Button size="sm" variant="outline" disabled={enCours} onClick={() => lancer(() => changerStatut(id, "invalide"))}>
      Invalide
    </Button>
  );
}

export function NoteInterne({ id, note }: { id: string; note: string | null }) {
  const { enCours, erreur, lancer } = useAction();
  const [ok, setOk] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setOk(false);
        lancer(async () => {
          const r = await enregistrerNote(fd);
          if (!r.erreur) setOk(true);
          return r;
        });
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="notes_internes">Note interne</Label>
      <Textarea id="notes_internes" name="notes_internes" defaultValue={note ?? ""} rows={3} placeholder="Visible uniquement par les admins" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" type="submit" disabled={enCours}>
          Enregistrer la note
        </Button>
        {ok && <span className="text-xs text-muted-foreground">Enregistrée</span>}
        {erreur && <span className="text-sm text-destructive">{erreur}</span>}
      </div>
    </form>
  );
}

type Coordonnees = {
  id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  ville: string | null;
  code_postal: string | null;
  besoin: string | null;
};

export function ModifierCoordonnees({ lead }: { lead: Coordonnees }) {
  return (
    <FormulaireDialog
      titre="Modifier les coordonnées"
      action={modifierCoordonnees}
      declencheur={
        <Button size="sm" variant="ghost" aria-label="Modifier les coordonnées">
          <Pencil /> Modifier
        </Button>
      }
    >
      <input type="hidden" name="id" value={lead.id} />
      <ChampsCoordonnees valeurs={lead} />
    </FormulaireDialog>
  );
}

export function ChampsCoordonnees({ valeurs }: { valeurs?: Partial<Coordonnees> }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Prénom" name="prenom" defaultValue={valeurs?.prenom ?? ""} />
        <Champ label="Nom" name="nom" defaultValue={valeurs?.nom ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Téléphone" name="telephone" type="tel" defaultValue={valeurs?.telephone ?? ""} />
        <Champ label="Email" name="email" type="email" defaultValue={valeurs?.email ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Champ label="Ville" name="ville" defaultValue={valeurs?.ville ?? ""} />
        <Champ label="Code postal" name="code_postal" defaultValue={valeurs?.code_postal ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="besoin">Besoin</Label>
        <Textarea id="besoin" name="besoin" defaultValue={valeurs?.besoin ?? ""} rows={3} />
      </div>
    </>
  );
}
