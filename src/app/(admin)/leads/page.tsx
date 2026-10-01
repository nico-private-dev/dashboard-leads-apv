import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { BarreFiltres } from "@/components/leads/barre-filtres";
import { FicheLead } from "@/components/leads/fiche-lead";
import { NouveauLead } from "@/components/leads/nouveau-lead";
import { COLONNES_LISTE, TableLeads } from "@/components/leads/table-leads";
import { buttonVariants } from "@/components/ui/button";
import { appliquerFiltres, lireFiltres, versUrl } from "@/lib/filtres";
import { heureParisLocale } from "@/lib/periodes";
import { chargerReferentiel } from "@/lib/referentiel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leads" };

const PAR_PAGE = 50;
const TRIS = ["recu_le", "nom", "ville", "statut"];

export default async function PageLeads({ searchParams }: PageProps<"/leads">) {
  const sp = await searchParams;
  const filtres = lireFiltres(sp);
  const tri = typeof sp.tri === "string" && TRIS.includes(sp.tri) ? sp.tri : "recu_le";
  const ordre = sp.ordre === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(sp.page) || 1);
  const leadOuvert = typeof sp.lead === "string" ? sp.lead : undefined;

  const supabase = await createClient();
  const referentiel = await chargerReferentiel(supabase);
  const { data: leads, count, error } = await appliquerFiltres(
    supabase.from("leads").select(COLONNES_LISTE, { count: "exact" }),
    filtres,
  )
    .order(tri, { ascending: ordre === "asc", nullsFirst: false })
    .order("recu_le", { ascending: false })
    .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1);
  if (error) throw new Error(error.message);

  const etat = { tri, ordre, ...(page > 1 && { page: String(page) }) };
  const url = (extra: Record<string, string> = {}) => "/leads" + versUrl(filtres, { ...etat, ...extra });
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BarreFiltres filtres={filtres} referentiel={referentiel} />
        <div className="flex gap-2">
          <a href={"/leads/export" + versUrl(filtres)} className={buttonVariants({ variant: "outline" })}>
            <Download /> Export CSV
          </a>
          <NouveauLead referentiel={referentiel} maintenant={heureParisLocale(new Date())} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {total} lead{total > 1 ? "s" : ""}
      </p>

      <TableLeads
        leads={leads}
        referentiel={referentiel}
        lienFiche={(id) => url({ lead: id })}
        tri={{
          colonne: tri,
          ordre,
          lien: (c) => "/leads" + versUrl(filtres, { tri: c, ordre: c === tri && ordre === "desc" ? "asc" : "desc" }),
        }}
      />

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? <Link href={url({ page: String(page - 1) })}>← Précédent</Link> : <span />}
          <span className="text-muted-foreground">
            Page {page} / {pages}
          </span>
          {page < pages ? <Link href={url({ page: String(page + 1) })}>Suivant →</Link> : <span />}
        </nav>
      )}

      {leadOuvert && <FicheLead id={leadOuvert} urlFermeture={url()} lienFiche={(id) => url({ lead: id })} />}
    </div>
  );
}
