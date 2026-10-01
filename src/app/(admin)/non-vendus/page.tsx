import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { Pastille } from "@/components/leads/badge-statut";
import { BarreFiltres } from "@/components/leads/barre-filtres";
import { buttonVariants } from "@/components/ui/button";
import { appliquerFiltres, lireFiltres, versUrl } from "@/lib/filtres";
import { formatJour } from "@/lib/format";
import { dateParis } from "@/lib/periodes";
import { chargerReferentiel } from "@/lib/referentiel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Non vendus" };

const LOT = 1000;

// Leads hors zone par thématique et département (brief §9.5) : les zones où chercher de nouveaux partenaires.
export default async function PageNonVendus({ searchParams }: PageProps<"/non-vendus">) {
  const filtres = { ...lireFiltres(await searchParams), statut: "hors_zone" };
  const supabase = await createClient();
  const referentiel = await chargerReferentiel(supabase);

  const leads: { thematique_id: string; departement: string | null; region: string | null; recu_le: string }[] = [];
  for (let debut = 0; ; debut += LOT) {
    const { data, error } = await appliquerFiltres(supabase.from("leads").select("thematique_id, departement, region, recu_le"), filtres).range(debut, debut + LOT - 1);
    if (error) throw new Error(error.message);
    leads.push(...data);
    if (data.length < LOT) break;
  }

  const groupes = new Map<string, { thematique_id: string; departement: string | null; region: string | null; n: number; dernier: string }>();
  for (const l of leads) {
    const cle = `${l.thematique_id}|${l.departement}`;
    const g = groupes.get(cle) ?? { thematique_id: l.thematique_id, departement: l.departement, region: l.region, n: 0, dernier: l.recu_le };
    g.n++;
    if (l.recu_le > g.dernier) g.dernier = l.recu_le;
    groupes.set(cle, g);
  }
  const lignes = [...groupes.values()].sort((a, b) => b.n - a.n);
  const thematique = new Map(referentiel.thematiques.map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BarreFiltres filtres={filtres} referentiel={referentiel} avecStatut={false} avecRecherche={false} />
        <a href={"/leads/export" + versUrl(filtres)} className={buttonVariants({ variant: "outline" })}>
          <Download /> Export CSV
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        {leads.length} lead{leads.length > 1 ? "s" : ""} hors zone : aucun partenaire ne couvre ces zones.
      </p>
      {lignes.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-xs">Aucun lead hors zone sur la période.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Thématique</th>
                <th className="px-3 py-2 text-left font-medium">Département</th>
                <th className="px-3 py-2 text-right font-medium">Leads</th>
                <th className="px-3 py-2 text-left font-medium">Dernier</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((g) => {
                const t = thematique.get(g.thematique_id);
                return (
                  <tr key={`${g.thematique_id}|${g.departement}`} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        {t && <Pastille couleur={t.couleur} />}
                        {t?.nom}
                      </span>
                    </td>
                    <td className="px-3 py-2">{g.departement ? `${g.departement}${g.region ? ` · ${g.region}` : ""}` : "Inconnu"}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      <Link
                        href={"/leads" + versUrl({ ...filtres, thematique: g.thematique_id, departement: g.departement ?? undefined })}
                        className="text-primary hover:underline"
                      >
                        {g.n}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatJour(dateParis(new Date(g.dernier)))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
