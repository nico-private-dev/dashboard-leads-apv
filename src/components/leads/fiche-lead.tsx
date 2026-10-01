import Link from "next/link";
import { Mail, MapPin, Phone, TriangleAlert } from "lucide-react";
import { LIBELLES_ACTION, type ActionPartenaire } from "@/app/p/[jeton]/constantes";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { EVENEMENTS, nomComplet, STATUTS, STATUTS_FACTURATION, TYPES_SOURCE } from "@/lib/libelles";
import { createClient } from "@/lib/supabase/server";
import { ActionsDoublon, AttributionLead, ChangerStatut, ModifierCoordonnees, NoteInterne } from "./actions-lead";
import { BadgeStatut, Pastille } from "./badge-statut";
import { PanneauLead } from "./panneau-lead";

function Bloc({ titre, action, children }: { titre: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titre}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function detailEvenement(type: string, details: Record<string, unknown>) {
  if (type === "statut_change") {
    const de = STATUTS[String(details.de)]?.label ?? details.de;
    const a = STATUTS[String(details.a)]?.label ?? details.a;
    return `${de} → ${a}`;
  }
  if (typeof details.action === "string") {
    const libelle = LIBELLES_ACTION[details.action as ActionPartenaire] ?? details.action;
    return [libelle, details.motif, details.precision, details.montant && `${details.montant} €`].filter(Boolean).join(" · ");
  }
  if (typeof details.partenaire === "string") return details.partenaire + (details.simule ? " (email simulé en local)" : "");
  if (typeof details.erreur === "string") return details.erreur;
  if (typeof details.motif === "string") return details.motif;
  if (typeof details.source === "string") return details.source;
  return null;
}

// Fiche lead (brief §9.3) affichée en panneau latéral.
export async function FicheLead({ id, urlFermeture, lienFiche }: { id: string; urlFermeture: string; lienFiche: (id: string) => string }) {
  const supabase = await createClient();
  const [{ data: lead }, { data: evenements }, { data: partenaires }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, thematiques(nom, couleur), sites(nom, domaine), sources(nom, type), partenaires(raison_sociale)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("lead_events").select("id, type, auteur, details, created_at").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("partenaires").select("id, raison_sociale").eq("actif", true).order("raison_sociale"),
  ]);

  if (!lead) {
    return (
      <PanneauLead urlFermeture={urlFermeture} titre="Lead introuvable">
        <p className="p-6 text-sm text-muted-foreground">Ce lead n&apos;existe pas.</p>
      </PanneauLead>
    );
  }

  const specifiques = (Array.isArray(lead.champs_specifiques) ? lead.champs_specifiques : []) as { label: string; valeur: string }[];
  const typeSource = TYPES_SOURCE.find((t) => t.value === lead.sources?.type)?.label;

  return (
    <PanneauLead urlFermeture={urlFermeture} titre={nomComplet(lead)}>
      <div className="space-y-4 p-5">
        <header className="space-y-2 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{nomComplet(lead)}</h2>
            <BadgeStatut statut={lead.statut} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {lead.thematiques && (
              <span className="inline-flex items-center gap-1.5">
                <Pastille couleur={lead.thematiques.couleur} />
                {lead.thematiques.nom}
              </span>
            )}
            {lead.sites && <span>{lead.sites.nom}</span>}
            <span>Reçu le {formatDateHeure(lead.recu_le)}</span>
            <span>{lead.sources ? `${typeSource} · ${lead.sources.nom}` : "Saisie manuelle"}</span>
          </div>
        </header>

        {lead.statut === "doublon" && (
          <div className="space-y-2 rounded-lg border border-jaune bg-jaune/15 p-3 text-sm">
            <p>
              Doublon d&apos;un lead reçu dans les 30 jours précédents (même téléphone ou email).{" "}
              {lead.doublon_de && (
                <Link href={lienFiche(lead.doublon_de)} scroll={false} className="font-medium text-primary hover:underline">
                  Voir le lead d&apos;origine
                </Link>
              )}
            </p>
            <ActionsDoublon id={lead.id} verifie={lead.doublon_verifie} />
          </div>
        )}

        <Bloc titre="Coordonnées" action={<ModifierCoordonnees lead={lead} />}>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              {lead.telephone ? (
                <a href={`tel:${lead.telephone}`} className="text-primary hover:underline">
                  {lead.telephone}
                </a>
              ) : (
                <span className="text-muted-foreground">Pas de téléphone</span>
              )}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="break-all text-primary hover:underline">
                  {lead.email}
                </a>
              ) : (
                <span className="text-muted-foreground">Pas d&apos;email</span>
              )}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" />
              <span>
                {[lead.ville, lead.code_postal].filter(Boolean).join(" ") || "Lieu inconnu"}
                {lead.departement && ` · dép. ${lead.departement}`}
                {lead.region && ` · ${lead.region}`}
              </span>
              {lead.geoloc_incertaine && (
                <span className="inline-flex items-center gap-1 text-xs text-primary" title="Ville et code postal ne concordent pas, ou ville introuvable">
                  <TriangleAlert className="size-3.5" /> à vérifier
                </span>
              )}
            </li>
          </ul>
          {lead.besoin && <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">{lead.besoin}</p>}
        </Bloc>

        {specifiques.length > 0 && (
          <Bloc titre="Réponses au formulaire">
            <dl className="space-y-2 text-sm">
              {specifiques.map((c, i) => (
                <div key={i}>
                  <dt className="text-muted-foreground">{c.label}</dt>
                  <dd className="font-medium whitespace-pre-line">{c.valeur}</dd>
                </div>
              ))}
            </dl>
          </Bloc>
        )}

        <Bloc titre="Partenaire">
          <p className="text-sm">
            {lead.partenaires?.raison_sociale ?? <span className="text-muted-foreground">Non attribué</span>}
            {lead.attribue_le && <span className="text-muted-foreground"> · attribué le {formatDateHeure(lead.attribue_le)}</span>}
          </p>
          {(lead.envoye_le || lead.vu_le) && (
            <p className="text-sm text-muted-foreground">
              {lead.envoye_le && `Envoyé le ${formatDateHeure(lead.envoye_le)}`}
              {lead.vu_le ? ` · vu le ${formatDateHeure(lead.vu_le)}` : lead.envoye_le ? " · pas encore vu" : ""}
            </p>
          )}
          {lead.motif_contestation && <p className="text-sm text-primary">Signalé invalide : {lead.motif_contestation}</p>}
          {lead.montant_devis !== null && (
            <p className="text-sm">
              Montant : {formatEuros(Number(lead.montant_devis))}
              {lead.montant_commission !== null && ` · commission ${formatEuros(Number(lead.montant_commission), true)}`}
            </p>
          )}
          <AttributionLead id={lead.id} partenaireId={lead.partenaire_id} partenaires={partenaires ?? []} envoye={Boolean(lead.envoye_le)} />
        </Bloc>

        <Bloc titre="Suivi">
          <ChangerStatut id={lead.id} statut={lead.statut} />
          <p className="text-sm text-muted-foreground">Facturation : {STATUTS_FACTURATION[lead.statut_facturation]}</p>
          <NoteInterne id={lead.id} note={lead.notes_internes} />
        </Bloc>

        <Bloc titre="Historique">
          <ol className="space-y-2 text-sm">
            {evenements?.map((e) => {
              const detail = detailEvenement(e.type, (e.details ?? {}) as Record<string, unknown>);
              return (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>
                      <span className="font-medium">{EVENEMENTS[e.type] ?? e.type}</span>
                      {detail && <span className="text-muted-foreground"> — {detail}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateHeure(e.created_at)} · {e.auteur === "systeme" ? "automatique" : e.auteur}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Bloc>

        <Bloc titre="Données brutes reçues">
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Afficher le payload</summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted/50 p-3">{JSON.stringify(lead.payload_brut, null, 2)}</pre>
          </details>
        </Bloc>
      </div>
    </PanneauLead>
  );
}
