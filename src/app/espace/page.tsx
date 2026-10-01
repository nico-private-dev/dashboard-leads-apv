import Link from "next/link";
import { Download } from "lucide-react";
import { FormulaireClic } from "@/app/p/[jeton]/formulaire-clic";
import { BadgeStatut } from "@/components/leads/badge-statut";
import { PanneauLead } from "@/components/leads/panneau-lead";
import { buttonVariants } from "@/components/ui/button";
import { formatDateHeure, formatEuros } from "@/lib/format";
import { nomComplet, STATUTS } from "@/lib/libelles";
import { createClient } from "@/lib/supabase/server";
import { actionEspace } from "./actions";

const FILTRES = [
  { valeur: "", label: "Tous" },
  { valeur: "a_traiter", label: "À traiter" },
  { valeur: "en_cours", label: "En cours" },
  { valeur: "termines", label: "Terminés" },
];
const GROUPES: Record<string, string[]> = {
  a_traiter: ["envoye", "vu"],
  en_cours: ["contacte", "devis_envoye"],
  termines: ["signe", "perdu", "invalide"],
};

export default async function PageEspace({ searchParams }: PageProps<"/espace">) {
  const { filtre, lead: leadOuvert } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("espace_leads");
  if (error) throw new Error(error.message);
  const groupe = typeof filtre === "string" ? GROUPES[filtre] : undefined;
  const leads = groupe ? data.filter((l) => groupe.includes(l.statut)) : data;
  const ouvert = data.find((l) => l.id === leadOuvert);
  const url = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams({ ...(typeof filtre === "string" && filtre && { filtre }), ...extra });
    return "/espace" + (p.size ? "?" + p : "");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Mes leads</h1>
        <a href="/espace/export" className={buttonVariants({ variant: "outline" })}>
          <Download /> Export CSV
        </a>
      </div>
      <nav className="flex flex-wrap gap-2">
        {FILTRES.map((f) => (
          <Link
            key={f.valeur}
            href={f.valeur ? `/espace?filtre=${f.valeur}` : "/espace"}
            className={`rounded-lg border px-3 py-1 text-sm ${(filtre ?? "") === f.valeur ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-xs">Aucun lead.</div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card shadow-xs">
          {leads.map((l) => (
            <li key={l.id}>
              <Link href={url({ lead: l.id })} scroll={false} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{nomComplet(l)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.thematique} · {[l.ville, l.departement && `(${l.departement})`].filter(Boolean).join(" ") || "—"} · reçu le {formatDateHeure(l.envoye_le ?? l.recu_le)}
                  </span>
                </span>
                <BadgeStatut statut={l.statut} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {ouvert && (
        <PanneauLead urlFermeture={url()} titre={nomComplet(ouvert)}>
          <div className="space-y-4 p-5">
            <div className="space-y-1 pr-8">
              <p className="text-xs text-muted-foreground">{ouvert.thematique}</p>
              <h2 className="text-lg font-semibold">{nomComplet(ouvert)}</h2>
              <BadgeStatut statut={ouvert.statut} />
            </div>
            <ul className="space-y-1 text-sm">
              {ouvert.telephone && (
                <li>
                  <a href={`tel:${ouvert.telephone}`} className="text-primary hover:underline">{ouvert.telephone}</a>
                </li>
              )}
              {ouvert.email && (
                <li>
                  <a href={`mailto:${ouvert.email}`} className="break-all text-primary hover:underline">{ouvert.email}</a>
                </li>
              )}
              <li>{[ouvert.ville, ouvert.code_postal].filter(Boolean).join(" ") || "Lieu non précisé"}</li>
            </ul>
            {ouvert.besoin && <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-line">{ouvert.besoin}</p>}
            {Array.isArray(ouvert.champs_specifiques) && ouvert.champs_specifiques.length > 0 && (
              <dl className="space-y-2 text-sm">
                {(ouvert.champs_specifiques as { label: string; valeur: string }[]).map((c, i) => (
                  <div key={i}>
                    <dt className="text-muted-foreground">{c.label}</dt>
                    <dd className="font-medium">{c.valeur}</dd>
                  </div>
                ))}
              </dl>
            )}
            {ouvert.montant_devis !== null && <p className="text-sm">Montant indiqué : {formatEuros(Number(ouvert.montant_devis))}</p>}
            {ouvert.motif_contestation && <p className="text-sm text-primary">Signalé invalide : {ouvert.motif_contestation}</p>}
            <div className="border-t pt-4">
              <FormulaireClic
                key={ouvert.id + ouvert.statut}
                envoyer={actionEspace.bind(null, ouvert.id)}
                actionInitiale={ouvert.statut === "contacte" ? "devis_envoye" : ouvert.statut === "devis_envoye" ? "signe" : "contacte"}
              />
            </div>
            <p className="text-xs text-muted-foreground">Statut actuel : {STATUTS[ouvert.statut]?.label ?? ouvert.statut}</p>
          </div>
        </PanneauLead>
      )}
    </div>
  );
}
