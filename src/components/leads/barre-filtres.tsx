"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Filtres } from "@/lib/filtres";
import { STATUTS } from "@/lib/libelles";
import { PERIODES, PERIODE_DEFAUT } from "@/lib/periodes";
import type { Referentiel } from "@/lib/referentiel";

const classeSelect =
  "h-8 min-w-0 rounded-lg border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Formulaire GET : les filtres vivent dans l'URL (partageables, et repris par l'export CSV).
export function BarreFiltres({
  filtres,
  referentiel,
  avecStatut = true,
  avecRecherche = true,
  avecPeriode = true,
}: {
  filtres: Filtres;
  referentiel: Referentiel;
  avecStatut?: boolean;
  avecRecherche?: boolean;
  avecPeriode?: boolean;
}) {
  const pathname = usePathname();
  const envoyer = (e: React.ChangeEvent<HTMLSelectElement>) => e.currentTarget.form?.requestSubmit();
  const { thematiques, sites, sources, partenaires } = referentiel;

  return (
    <form action={pathname} className="flex flex-wrap items-center gap-2">
      {avecRecherche && (
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={filtres.q} placeholder="Nom, téléphone, email, ville" className="bg-card pl-8" />
        </div>
      )}
      {avecPeriode && (
        <select name="periode" defaultValue={filtres.periode ?? PERIODE_DEFAUT} onChange={envoyer} className={classeSelect} aria-label="Période">
          {PERIODES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <select name="thematique" defaultValue={filtres.thematique ?? ""} onChange={envoyer} className={classeSelect} aria-label="Thématique">
        <option value="">Toutes thématiques</option>
        {thematiques.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nom}
          </option>
        ))}
      </select>
      <select name="site" defaultValue={filtres.site ?? ""} onChange={envoyer} className={classeSelect} aria-label="Site">
        <option value="">Tous sites</option>
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
      <select name="source" defaultValue={filtres.source ?? ""} onChange={envoyer} className={classeSelect} aria-label="Source">
        <option value="">Toutes sources</option>
        <option value="manuel">Saisie manuelle</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nom}
          </option>
        ))}
      </select>
      {partenaires.length > 0 && (
        <select name="partenaire" defaultValue={filtres.partenaire ?? ""} onChange={envoyer} className={classeSelect} aria-label="Partenaire">
          <option value="">Tous partenaires</option>
          {partenaires.map((p) => (
            <option key={p.id} value={p.id}>
              {p.raison_sociale}
            </option>
          ))}
        </select>
      )}
      <Input
        name="departement"
        defaultValue={filtres.departement}
        placeholder="Dép."
        maxLength={3}
        className="w-16 bg-card"
        aria-label="Département"
      />
      {avecStatut && (
        <select name="statut" defaultValue={filtres.statut ?? ""} onChange={envoyer} className={classeSelect} aria-label="Statut">
          <option value="">Tous statuts</option>
          <option value="sans_doublons">Tous sauf doublons</option>
          {Object.entries(STATUTS).map(([v, s]) => (
            <option key={v} value={v}>
              {s.label}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="sr-only">
        Filtrer
      </button>
      <Link href={pathname} className="text-sm text-muted-foreground hover:text-primary hover:underline">
        Réinitialiser
      </Link>
    </form>
  );
}
