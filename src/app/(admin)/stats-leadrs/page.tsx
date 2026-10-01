import type { Metadata } from "next";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { formatEuros, formatJour, formatNombre, formatPeriode } from "@/lib/format";
import { ajouterJours, bornesMois, dateParis, lundi } from "@/lib/periodes";
import { createClient } from "@/lib/supabase/server";
import { FormulaireStats, type LigneSaisie } from "./formulaire-stats";

export const metadata: Metadata = { title: "Stats Leadrs" };

// Leadrs ne filtre qu'à la semaine, au mois ou depuis toujours : on saisit donc par semaine ou par mois.
function periodeChoisie(sp: Record<string, string | string[] | undefined>) {
  const aujourdhui = dateParis(new Date());
  if (sp.type === "mois") {
    const mois = typeof sp.mois === "string" && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : aujourdhui.slice(0, 7);
    return { type: "mois" as const, mois, ...bornesMois(mois) };
  }
  // Par défaut : la dernière semaine complète (lundi → dimanche).
  const ref = typeof sp.semaine === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.semaine) ? sp.semaine : ajouterJours(aujourdhui, -7);
  const debut = lundi(ref);
  return { type: "semaine" as const, mois: debut.slice(0, 7), debut, fin: ajouterJours(debut, 6) };
}

export default async function PageStatsLeadrs({ searchParams }: PageProps<"/stats-leadrs">) {
  const p = periodeChoisie(await searchParams);
  const supabase = await createClient();
  const [{ data: sites }, { data: stats }] = await Promise.all([
    supabase.from("sites").select("id, nom, region").eq("collecte", "leadrs").eq("actif", true).order("nom"),
    supabase.from("stats_externes").select("*").eq("plateforme", "leadrs").order("periode_debut", { ascending: false }),
  ]);
  if (!sites || !stats) throw new Error("Chargement impossible.");

  const lignes: LigneSaisie[] = sites.map((s) => {
    const exacte = stats.find((x) => x.site_id === s.id && x.periode_debut === p.debut && x.periode_fin === p.fin);
    const autre = stats.find((x) => x.site_id === s.id && x !== exacte && x.periode_debut <= p.fin && x.periode_fin >= p.debut);
    return {
      site_id: s.id,
      nom: s.nom,
      region: s.region,
      nb: exacte?.nb_leads ?? null,
      valides: exacte?.nb_leads_valides ?? null,
      ca: exacte?.ca_verse ?? null,
      chevauchement: autre ? formatPeriode(autre.periode_debut, autre.periode_fin) : null,
    };
  });

  const nomSite = new Map(sites.map((s) => [s.id, s.region ?? s.nom]));
  const total = stats.reduce(
    (t, x) => ({ nb: t.nb + x.nb_leads, valides: t.valides + (x.nb_leads_valides ?? 0), ca: t.ca + Number(x.ca_verse ?? 0) }),
    { nb: 0, valides: 0, ca: 0 },
  );

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <form className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="type" value="semaine" />
            <label className="space-y-1 text-sm">
              <span className="block text-muted-foreground">Semaine contenant le</span>
              <Input type="date" name="semaine" defaultValue={p.type === "semaine" ? p.debut : ""} className="bg-card" />
            </label>
            <button className="h-8 rounded-lg border bg-card px-3 text-sm hover:bg-muted">Saisir la semaine</button>
          </form>
          <form className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="type" value="mois" />
            <label className="space-y-1 text-sm">
              <span className="block text-muted-foreground">Mois</span>
              <Input type="month" name="mois" defaultValue={p.mois} className="bg-card" />
            </label>
            <button className="h-8 rounded-lg border bg-card px-3 text-sm hover:bg-muted">Saisir le mois</button>
          </form>
        </div>
        <h2 className="font-semibold">
          {p.type === "semaine" ? "Semaine" : "Mois"} {formatPeriode(p.debut, p.fin)}
        </h2>
        <FormulaireStats debut={p.debut} fin={p.fin} lignes={lignes} />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Historique des saisies</h2>
        <p className="text-sm text-muted-foreground">
          Total saisi : {formatNombre(total.nb)} leads, {formatNombre(total.valides)} validés, {formatEuros(total.ca)} versés
          {total.valides > 0 && ` · ${formatEuros(total.ca / total.valides, true)} par lead validé`}
        </p>
        {stats.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-xs">Aucune saisie pour l&apos;instant.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Site</th>
                  <th className="px-3 py-2 text-left font-medium">Période</th>
                  <th className="px-3 py-2 text-right font-medium">Leads</th>
                  <th className="px-3 py-2 text-right font-medium">Validés</th>
                  <th className="px-3 py-2 text-right font-medium">CA versé</th>
                  <th className="px-3 py-2 text-right font-medium">CA / lead validé</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((x) => {
                  const type = x.periode_debut.endsWith("-01") && x.periode_fin === bornesMois(x.periode_debut.slice(0, 7)).fin ? "mois" : "semaine";
                  const lien = type === "mois" ? `?type=mois&mois=${x.periode_debut.slice(0, 7)}` : `?type=semaine&semaine=${x.periode_debut}`;
                  return (
                    <tr key={x.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{nomSite.get(x.site_id) ?? "Site inactif"}</td>
                      <td className="px-3 py-2">
                        <Link href={lien} className="hover:text-primary hover:underline">
                          {formatJour(x.periode_debut)} → {formatJour(x.periode_fin)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{x.nb_leads}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{x.nb_leads_valides ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{x.ca_verse !== null ? formatEuros(Number(x.ca_verse)) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {x.ca_verse !== null && x.nb_leads_valides ? formatEuros(Number(x.ca_verse) / x.nb_leads_valides, true) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
