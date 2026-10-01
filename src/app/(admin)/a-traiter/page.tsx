import type { Metadata } from "next";
import { ActionsDoublon, EnvoyerLead, MarquerInvalide } from "@/components/leads/actions-lead";
import { FicheLead } from "@/components/leads/fiche-lead";
import { COLONNES_LISTE, TableLeads, type LigneLead } from "@/components/leads/table-leads";
import { filtreATraiter } from "@/lib/libelles";
import { chargerReferentiel } from "@/lib/referentiel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "À traiter" };

// Boîte de réception quotidienne (brief §9.2) : les plus anciens d'abord.
const SECTIONS = [
  { titre: "À compléter", aide: "Coordonnées manquantes ou traitement en échec : complétez la fiche.", filtre: (l: LigneLead) => l.statut === "a_completer" },
  { titre: "À envoyer", aide: "Partenaire trouvé, envoi manuel (envoi automatique désactivé pour ce partenaire).", filtre: (l: LigneLead) => l.statut === "attribue" },
  { titre: "Doublons à vérifier", aide: "Même téléphone ou email reçu dans les 30 jours.", filtre: (l: LigneLead) => l.statut === "doublon" && !l.doublon_verifie },
  { titre: "Hors zone (7 derniers jours)", aide: "Aucun partenaire ne couvre la zone : à réattribuer à la main ou à laisser dans Non vendus.", filtre: (l: LigneLead) => l.statut === "hors_zone" },
  { titre: "Sans partenaire", aide: "Localisation inconnue : choisissez le partenaire dans la fiche.", filtre: (l: LigneLead) => l.statut === "nouveau" },
];

export default async function PageATraiter({ searchParams }: PageProps<"/a-traiter">) {
  const { lead } = await searchParams;
  const supabase = await createClient();
  const [referentiel, { data: leads, error }] = await Promise.all([
    chargerReferentiel(supabase),
    supabase
      .from("leads")
      .select(COLONNES_LISTE)
      .or(filtreATraiter())
      .order("recu_le"),
  ]);
  if (error) throw new Error(error.message);

  const lienFiche = (id: string) => `/a-traiter?lead=${id}`;
  const nomPartenaire = new Map(referentiel.partenaires.map((p) => [p.id, p.raison_sociale]));

  return (
    <div className="space-y-6">
      {leads.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-xs">Rien à traiter : tout est à jour.</div>
      )}
      {SECTIONS.map((s) => {
        const liste = leads.filter(s.filtre);
        if (!liste.length) return null;
        return (
          <section key={s.titre} className="space-y-2">
            <div>
              <h2 className="font-semibold">
                {s.titre} <span className="text-muted-foreground">({liste.length})</span>
              </h2>
              <p className="text-sm text-muted-foreground">{s.aide}</p>
            </div>
            <TableLeads
              leads={liste}
              referentiel={referentiel}
              lienFiche={lienFiche}
              actions={(l) =>
                l.statut === "doublon" ? (
                  <ActionsDoublon id={l.id} verifie={false} />
                ) : l.statut === "attribue" && l.partenaire_id ? (
                  <EnvoyerLead id={l.id} nom={nomPartenaire.get(l.partenaire_id) ?? "partenaire"} />
                ) : (
                  <MarquerInvalide id={l.id} />
                )
              }
            />
          </section>
        );
      })}
      {typeof lead === "string" && <FicheLead id={lead} urlFermeture="/a-traiter" lienFiche={lienFiche} />}
    </div>
  );
}
