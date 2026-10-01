import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatDateHeure } from "@/lib/format";
import { nomComplet, STATUTS_FACTURATION } from "@/lib/libelles";
import type { Referentiel } from "@/lib/referentiel";
import { BadgeStatut, Pastille } from "./badge-statut";

export const COLONNES_LISTE =
  "id, recu_le, statut, statut_facturation, prenom, nom, ville, code_postal, departement, thematique_id, site_id, source_id, partenaire_id, doublon_de";

export type LigneLead = {
  id: string;
  recu_le: string;
  statut: string;
  statut_facturation: string;
  prenom: string | null;
  nom: string | null;
  ville: string | null;
  code_postal: string | null;
  departement: string | null;
  thematique_id: string;
  site_id: string | null;
  source_id: string | null;
  partenaire_id: string | null;
  doublon_de: string | null;
};

type Tri = { colonne: string; ordre: "asc" | "desc"; lien: (colonne: string) => string };

function EnTete({ label, colonne, tri, className = "" }: { label: string; colonne?: string; tri?: Tri; className?: string }) {
  if (!colonne || !tri) return <th className={`px-3 py-2 text-left font-medium ${className}`}>{label}</th>;
  const actif = tri.colonne === colonne;
  const Fleche = tri.ordre === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2 text-left font-medium">
      <Link href={tri.lien(colonne)} scroll={false} className="inline-flex items-center gap-1 hover:text-primary">
        {label}
        {actif && <Fleche className="size-3" />}
      </Link>
    </th>
  );
}

// Tableau sur ordinateur, cartes sur mobile (CLAUDE.md : liste utilisable sur mobile).
export function TableLeads({
  leads,
  referentiel,
  lienFiche,
  tri,
  actions,
}: {
  leads: LigneLead[];
  referentiel: Referentiel;
  lienFiche: (id: string) => string;
  tri?: Tri;
  actions?: (lead: LigneLead) => React.ReactNode;
}) {
  const thematique = new Map(referentiel.thematiques.map((t) => [t.id, t]));
  const site = new Map(referentiel.sites.map((s) => [s.id, s.nom]));
  const source = new Map(referentiel.sources.map((s) => [s.id, s.nom]));
  const partenaire = new Map(referentiel.partenaires.map((p) => [p.id, p.raison_sociale]));

  if (!leads.length) {
    return <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-xs">Aucun lead pour ces filtres.</div>;
  }

  const lieu = (l: LigneLead) => [l.ville ?? l.code_postal, l.departement && `(${l.departement})`].filter(Boolean).join(" ") || "—";

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-xs md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <EnTete label="Reçu le" colonne="recu_le" tri={tri} />
              <EnTete label="Thématique / site" />
              <EnTete label="Nom" colonne="nom" tri={tri} />
              <EnTete label="Ville" colonne="ville" tri={tri} />
              <EnTete label="Source" className="hidden lg:table-cell" />
              <EnTete label="Partenaire" className="hidden xl:table-cell" />
              <EnTete label="Statut" colonne="statut" tri={tri} />
              <EnTete label="Facturation" className="hidden xl:table-cell" />
              {actions && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const t = thematique.get(l.thematique_id);
              return (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDateHeure(l.recu_le)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {t && <Pastille couleur={t.couleur} titre={t.nom} />}
                      <span className="truncate">{(l.site_id && site.get(l.site_id)) || t?.nom}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">
                    <Link href={lienFiche(l.id)} scroll={false} className="hover:text-primary hover:underline">
                      {nomComplet(l)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{lieu(l)}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">{(l.source_id && source.get(l.source_id)) || "Saisie manuelle"}</td>
                  <td className="hidden px-3 py-2 xl:table-cell">{(l.partenaire_id && partenaire.get(l.partenaire_id)) || "—"}</td>
                  <td className="px-3 py-2">
                    <BadgeStatut statut={l.statut} />
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground xl:table-cell">{STATUTS_FACTURATION[l.statut_facturation]}</td>
                  {actions && <td className="px-3 py-2 text-right whitespace-nowrap">{actions(l)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 md:hidden">
        {leads.map((l) => {
          const t = thematique.get(l.thematique_id);
          return (
            <li key={l.id} className="rounded-xl border bg-card p-3 shadow-xs">
              <Link href={lienFiche(l.id)} scroll={false} className="block space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{nomComplet(l)}</span>
                  <BadgeStatut statut={l.statut} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {t && <Pastille couleur={t.couleur} />}
                  <span className="truncate">{(l.site_id && site.get(l.site_id)) || t?.nom}</span>
                  <span>·</span>
                  <span className="truncate">{lieu(l)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{formatDateHeure(l.recu_le)}</div>
              </Link>
              {actions && <div className="mt-2 flex flex-wrap gap-2">{actions(l)}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
