import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { BarresThematiques, CourbeLeads } from "@/components/graphiques";
import { BarreFiltres } from "@/components/leads/barre-filtres";
import { Button } from "@/components/ui/button";
import { calculerVueEnsemble, type LeadStat } from "@/lib/analytics";
import { appliquerFiltres, lireFiltres, versUrl, type Filtres } from "@/lib/filtres";
import { depuis, formatEuros, formatNombre } from "@/lib/format";
import { bornesPeriode, PERIODES } from "@/lib/periodes";
import { chargerReferentiel } from "@/lib/referentiel";
import { createClient } from "@/lib/supabase/server";
import { resoudreAlerte } from "./actions";

export const metadata: Metadata = { title: "Vue d'ensemble" };

const LOT = 1000; // limite de lignes par requête Supabase

function Tuile({ titre, valeur, detail, href, accent }: { titre: string; valeur: string; detail?: React.ReactNode; href?: string; accent?: boolean }) {
  const contenu = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{titre}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </>
  );
  const classe = "block rounded-xl border bg-card p-4 shadow-xs";
  return href ? (
    <Link href={href} className={`${classe} transition-colors hover:border-primary`}>
      {contenu}
    </Link>
  ) : (
    <div className={classe}>{contenu}</div>
  );
}

function Carte({ titre, children, className = "" }: { titre: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-4 shadow-xs ${className}`}>
      <h2 className="mb-3 text-sm font-semibold">{titre}</h2>
      {children}
    </section>
  );
}

// Liste à barres en HTML : valeurs toujours visibles, pas besoin d'un graphique.
function ListeBarres({ lignes }: { lignes: { nom: string; n: number }[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.n));
  if (!lignes.length) return <p className="text-sm text-muted-foreground">Aucun lead sur la période.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {lignes.map((l) => (
        <li key={l.nom} className="space-y-1">
          <div className="flex justify-between gap-2">
            <span className="truncate">{l.nom}</span>
            <span className="font-medium tabular-nums">{l.n}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(l.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function chargerLeads(supabase: Awaited<ReturnType<typeof createClient>>, filtres: Filtres) {
  const lignes: LeadStat[] = [];
  for (let debut = 0; ; debut += LOT) {
    const { data, error } = await appliquerFiltres(
      supabase.from("leads").select("recu_le, statut, thematique_id, site_id, source_id, partenaire_id, prix_facture, montant_commission"),
      filtres,
      { sansStatut: true },
    )
      .order("recu_le")
      .range(debut, debut + LOT - 1);
    if (error) throw new Error(error.message);
    lignes.push(...data);
    if (data.length < LOT) return lignes;
  }
}

export default async function PageVueEnsemble({ searchParams }: PageProps<"/">) {
  const filtres = lireFiltres(await searchParams);
  const bornes = bornesPeriode(filtres.periode);
  const supabase = await createClient();

  // Les chiffres Leadrs sont agrégés par site : seuls les filtres thématique et site s'y appliquent.
  const leadrsApplicable = !filtres.source && !filtres.partenaire && !filtres.departement;
  let requeteStats = supabase.from("stats_externes").select("site_id, periode_debut, periode_fin, nb_leads, nb_leads_valides, ca_verse");
  if (filtres.site) requeteStats = requeteStats.eq("site_id", filtres.site);

  const [referentiel, leads, precedents, { data: stats }, { data: alertes }] = await Promise.all([
    chargerReferentiel(supabase),
    chargerLeads(supabase, filtres),
    bornes.precedente
      ? appliquerFiltres(supabase.from("leads").select("id", { count: "exact", head: true }), filtres, { bornes: { ...bornes, ...bornes.precedente }, sansStatut: true })
          .neq("statut", "doublon")
          .then((r) => r.count ?? 0)
      : Promise.resolve(null),
    requeteStats,
    supabase.from("alertes").select("id, type, message, created_at, lead_id").eq("resolue", false).order("created_at", { ascending: false }).limit(20),
  ]);

  const sitesThematique = new Set(referentiel.sites.filter((s) => !filtres.thematique || s.thematique_id === filtres.thematique).map((s) => s.id));
  const v = calculerVueEnsemble({
    leads,
    precedents,
    stats: (stats ?? []).filter((s) => sitesThematique.has(s.site_id)),
    ref: referentiel,
    bornes,
    leadrsApplicable,
  });

  const lien = (extra: Record<string, string>) => "/leads" + versUrl({ ...filtres, periode: bornes.code }, extra);
  const libellePeriode = PERIODES.find((p) => p.code === bornes.code)?.label;
  const variation =
    v.variation === null ? undefined : (
      <span className={v.variation >= 0 ? "text-emerald-700" : "text-primary"}>
        {v.variation >= 0 ? "+" : ""}
        {formatNombre(v.variation * 100)} % vs période précédente
      </span>
    );

  return (
    <div className="space-y-4">
      <BarreFiltres filtres={filtres} referentiel={referentiel} avecStatut={false} avecRecherche={false} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tuile titre={`Leads reçus en direct · ${libellePeriode}`} valeur={formatNombre(v.recus)} detail={variation} href={lien({ statut: "sans_doublons" })} />
        <Tuile
          titre="Leads Leadrs (à part)"
          valeur={v.leadrs ? formatNombre(v.leadrs.leads) : "—"}
          detail={
            !v.leadrs
              ? "Non filtrable par source, partenaire ou département"
              : v.leadrs.saisies === 0
                ? "Aucune saisie sur la période"
                : v.leadrs.estime
                  ? "Estimé au prorata des saisies"
                  : `${formatNombre(v.leadrs.valides)} validés`
          }
          href="/stats-leadrs"
        />
        <Tuile titre="Leads attribués" valeur={formatNombre(v.attribues)} detail="Attribution en phase 2" />
        <Tuile
          titre="CA généré"
          valeur={formatEuros(v.caDirect + (v.leadrs?.ca ?? 0))}
          detail={`Leadrs ${formatEuros(v.leadrs?.ca ?? 0)} · direct ${formatEuros(v.caDirect)}`}
        />
        <Tuile titre="À compléter" valeur={formatNombre(v.aCompleter)} href={lien({ statut: "a_completer" })} accent={v.aCompleter > 0} />
        <Tuile titre="Doublons" valeur={formatNombre(v.doublons)} detail="Exclus des leads reçus" href={lien({ statut: "doublon" })} />
        <Tuile titre="Hors zone" valeur={formatNombre(v.horsZone)} href={lien({ statut: "hors_zone" })} />
        <Tuile titre="En attente partenaire" valeur={formatNombre(v.attentePartenaire)} detail="Envoyés ou vus, sans suite" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Carte titre={`Leads reçus en direct, par ${v.granularite}`} className="lg:col-span-2">
          <CourbeLeads donnees={v.courbe} granularite={v.granularite} />
        </Carte>
        <Carte titre="Par thématique">
          <BarresThematiques donnees={v.parThematique} />
        </Carte>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Carte titre="CA par lead : Leadrs vs partenaires directs">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground">Leadrs (par lead validé)</dt>
              <dd className="text-xl font-semibold tabular-nums">{v.leadrs?.caParLead ? formatEuros(v.leadrs.caParLead, true) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Direct (par lead attribué)</dt>
              <dd className="text-xl font-semibold tabular-nums">{v.caParLeadDirect ? formatEuros(v.caParLeadDirect, true) : "—"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Le CA direct sera calculé avec la facturation (phase 3).</p>
        </Carte>
        <Carte titre="Par source">
          <ListeBarres lignes={v.parSource} />
        </Carte>
        <Carte titre="Top 10 sites (direct)">
          <ListeBarres lignes={v.topSites} />
        </Carte>
      </div>

      <Carte titre={`Alertes actives${alertes?.length ? ` (${alertes.length})` : ""}`}>
        {!alertes?.length ? (
          <p className="text-sm text-muted-foreground">Aucune alerte.</p>
        ) : (
          <ul className="divide-y text-sm">
            {alertes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-2">
                <TriangleAlert className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  {a.message}{" "}
                  {a.lead_id && (
                    <Link href={`/leads?periode=tout&lead=${a.lead_id}`} className="text-primary hover:underline">
                      voir le lead
                    </Link>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{depuis(a.created_at)}</span>
                <form action={resoudreAlerte.bind(null, a.id)}>
                  <Button size="sm" variant="outline" type="submit">
                    Résolue
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}
