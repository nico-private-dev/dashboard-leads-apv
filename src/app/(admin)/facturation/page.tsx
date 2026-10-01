import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { formatEuros, formatNombre } from "@/lib/format";
import { dateParis } from "@/lib/periodes";
import { createClient } from "@/lib/supabase/server";
import { BoutonFacturation } from "./boutons";
import { chargerRecap } from "./donnees";

export const metadata: Metadata = { title: "Facturation" };

const MODELES: Record<string, string> = { achat_lead: "Achat au lead", commission: "Commission", abonnement: "Abonnement" };
const STATUTS: Record<string, { label: string; classe: string }> = {
  a_facturer: { label: "À facturer", classe: "bg-jaune text-jaune-foreground" },
  facture: { label: "Facturé", classe: "bg-secondary text-secondary-foreground" },
  paye: { label: "Payé", classe: "bg-emerald-700 text-white" },
  rien: { label: "Rien à facturer", classe: "text-muted-foreground" },
};

// Suivi de facturation (brief §8) : pas de génération de factures, juste ce qui est dû et son statut.
export default async function PageFacturation({ searchParams }: PageProps<"/facturation">) {
  const sp = await searchParams;
  const mois = typeof sp.mois === "string" && /^\d{4}-\d{2}$/.test(sp.mois) ? sp.mois : dateParis(new Date()).slice(0, 7);
  const recap = await chargerRecap(await createClient(), mois);
  const total = recap.reduce((t, l) => t + l.montant, 0);
  const libelleMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${mois}-15T12:00:00Z`));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form className="flex items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="block text-muted-foreground">Mois</span>
            <Input type="month" name="mois" defaultValue={mois} className="bg-card" />
          </label>
          <button className="h-8 rounded-lg border bg-card px-3 text-sm hover:bg-muted">Afficher</button>
        </form>
        <a href={`/facturation/export?mois=${mois}`} className={buttonVariants({ variant: "outline" })}>
          <Download /> Export CSV
        </a>
      </div>

      <p className="text-sm">
        <span className="capitalize">{libelleMois}</span> : <span className="font-semibold">{formatEuros(total, true)}</span> dus au total.
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Partenaire</th>
              <th className="px-3 py-2 text-left font-medium">Modèle</th>
              <th className="px-3 py-2 text-right font-medium">Leads reçus</th>
              <th className="px-3 py-2 text-right font-medium">Facturables</th>
              <th className="px-3 py-2 text-right font-medium">Contestés</th>
              <th className="px-3 py-2 text-right font-medium">Montant dû</th>
              <th className="px-3 py-2 text-left font-medium">Statut</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {recap.map((l) => (
              <tr key={l.partenaire.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{l.partenaire.raison_sociale}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {l.partenaire.modele ? MODELES[l.partenaire.modele] : "À renseigner"}
                  {l.coutParLead !== null && <span className="block text-xs">soit {formatEuros(l.coutParLead, true)} par lead</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.leadsRecus}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNombre(l.leadsFacturables)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.contestes || "—"}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{formatEuros(l.montant, true)}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex h-5 items-center rounded-md px-1.5 text-xs font-medium whitespace-nowrap ${STATUTS[l.statut].classe}`}>
                    {STATUTS[l.statut].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <BoutonFacturation partenaireId={l.partenaire.id} mois={mois} statut={l.statut} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Achat au lead : facturable à la fin du délai de contestation, sauf lead déclaré invalide. Commission : à la signature (montant × taux).
        Abonnement : montant mensuel fixe, avec le coût par lead reçu.
      </p>
    </div>
  );
}
