import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { BoutonCopier } from "@/components/bouton-copier";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { depuis, joursDepuis } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { TYPES_SOURCE } from "@/lib/libelles";
import { FormulaireSite, FormulaireSource, FormulaireThematique } from "./formulaires";

export const metadata: Metadata = { title: "Sites & sources" };

const SILENCE_PAR_DEFAUT = 7; // ponytail: seuil fixe ; le calcul auto (2 × intervalle moyen) arrive avec les alertes planifiées

function urlWebhook(source: Tables<"sources">) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/ingest/${source.type}/${source.webhook_token}`;
}

function EtatSource({ source, site }: { source: Tables<"sources">; site?: Tables<"sites"> }) {
  if (!source.actif) return <Badge variant="outline">Désactivée</Badge>;
  if (!source.dernier_lead_le) return <Badge variant="outline">Aucun lead reçu</Badge>;
  const silence = site?.alerte_silence_jours ?? SILENCE_PAR_DEFAUT;
  const ok = joursDepuis(source.dernier_lead_le) < silence;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-2 rounded-full ${ok ? "bg-emerald-600" : "bg-primary"}`} />
      Dernier lead {depuis(source.dernier_lead_le)}
    </span>
  );
}

function LigneSource({ source, site }: { source: Tables<"sources">; site?: Tables<"sites"> }) {
  const aWebhook = source.type === "tally" || source.type === "generic";
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{source.nom}</span>
          <Badge variant="secondary">{TYPES_SOURCE.find((t) => t.value === source.type)?.label ?? source.type}</Badge>
          <EtatSource source={source} site={site} />
        </div>
        {aWebhook && <code className="block truncate text-xs text-muted-foreground">{urlWebhook(source)}</code>}
      </div>
      <div className="flex gap-2">
        {aWebhook && <BoutonCopier texte={urlWebhook(source)} />}
        <FormulaireSource
          source={source}
          thematiqueId={source.thematique_id}
          declencheur={
            <Button variant="ghost" size="sm" aria-label={`Modifier la source ${source.nom}`}>
              <Pencil />
            </Button>
          }
        />
      </div>
    </li>
  );
}

export default async function PageSites() {
  const supabase = await createClient();
  const [{ data: thematiques }, { data: sites }, { data: sources }] = await Promise.all([
    supabase.from("thematiques").select().order("nom"),
    supabase.from("sites").select().order("nom"),
    supabase.from("sources").select().order("nom"),
  ]);
  if (!thematiques || !sites || !sources) throw new Error("Chargement des sites impossible.");

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <FormulaireThematique
          declencheur={
            <Button>
              <Plus /> Thématique
            </Button>
          }
        />
      </div>

      {thematiques.map((t) => {
        const sitesT = sites.filter((s) => s.thematique_id === t.id);
        const sourcesSansSite = sources.filter((so) => so.thematique_id === t.id && !so.site_id);
        return (
          <section key={t.id} className="rounded-xl border bg-card p-4 shadow-xs">
            <header className="mb-4 flex flex-wrap items-center gap-2">
              <span className="size-3 rounded-full" style={{ backgroundColor: t.couleur }} />
              <h2 className="font-semibold">{t.nom}</h2>
              <span className="text-sm text-muted-foreground">
                {sitesT.length} site{sitesT.length > 1 ? "s" : ""}
              </span>
              {!t.actif && <Badge variant="outline">Inactive</Badge>}
              <div className="ml-auto flex gap-2">
                <FormulaireThematique
                  thematique={t}
                  declencheur={
                    <Button variant="ghost" size="sm" aria-label={`Modifier la thématique ${t.nom}`}>
                      <Pencil />
                    </Button>
                  }
                />
                <FormulaireSite
                  thematiqueId={t.id}
                  thematiques={thematiques}
                  declencheur={
                    <Button variant="outline" size="sm">
                      <Plus /> Site
                    </Button>
                  }
                />
              </div>
            </header>

            <ul className="space-y-3">
              {sitesT.map((s) => {
                const sourcesS = sources.filter((so) => so.site_id === s.id);
                return (
                  <li key={s.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.nom}</span>
                      {s.domaine && (
                        <a
                          href={`https://${s.domaine}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary hover:underline"
                        >
                          {s.domaine}
                        </a>
                      )}
                      {s.collecte === "leadrs" ? (
                        <Badge className="bg-jaune text-jaune-foreground">Leadrs</Badge>
                      ) : (
                        <Badge variant="secondary">Direct</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {s.pays}
                        {s.region ? ` · ${s.region}` : ""}
                      </span>
                      {!s.actif && <Badge variant="outline">Inactif</Badge>}
                      <div className="ml-auto flex gap-2">
                        <FormulaireSite
                          site={s}
                          thematiqueId={t.id}
                          thematiques={thematiques}
                          declencheur={
                            <Button variant="ghost" size="sm" aria-label={`Modifier le site ${s.nom}`}>
                              <Pencil />
                            </Button>
                          }
                        />
                        {s.collecte === "direct" && (
                          <FormulaireSource
                            siteId={s.id}
                            thematiqueId={t.id}
                            declencheur={
                              <Button variant="outline" size="sm">
                                <Plus /> Source
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </div>
                    {s.collecte === "leadrs" ? (
                      <p className="mt-2 text-xs text-muted-foreground">Leads gérés par Leadrs : chiffres saisis dans Stats Leadrs.</p>
                    ) : sourcesS.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {sourcesS.map((so) => (
                          <LigneSource key={so.id} source={so} site={s} />
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Aucune source : ajoutez le formulaire Tally du site.</p>
                    )}
                  </li>
                );
              })}
              {sourcesSansSite.map((so) => (
                <LigneSource key={so.id} source={so} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
