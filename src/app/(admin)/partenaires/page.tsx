import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEuros, formatNombre } from "@/lib/format";
import { bornesPeriode } from "@/lib/periodes";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { FormulairePartenaire } from "./formulaire";

export const metadata: Metadata = { title: "Partenaires" };

function tarif(p: Tables<"partenaires">) {
  if (p.modele === "commission") return `Commission ${formatNombre(Number(p.taux_commission), 2)} % sur la vente`;
  if (p.modele === "achat_lead") return `${formatEuros(Number(p.prix_lead), true)} par lead`;
  if (p.modele === "abonnement") return `Abonnement ${formatEuros(Number(p.montant_abonnement_mensuel))} / mois`;
  return "Modèle à renseigner";
}

export default async function PagePartenaires() {
  const supabase = await createClient();
  const debut30j = bornesPeriode("30j").debut!.toISOString();
  const [{ data: partenaires }, { data: leads30j }] = await Promise.all([
    supabase.from("partenaires").select().order("raison_sociale"),
    supabase.from("leads").select("partenaire_id").not("partenaire_id", "is", null).gte("recu_le", debut30j),
  ]);
  if (!partenaires) throw new Error("Chargement des partenaires impossible.");
  const nb30j = new Map<string, number>();
  for (const l of leads30j ?? []) nb30j.set(l.partenaire_id!, (nb30j.get(l.partenaire_id!) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormulairePartenaire
          declencheur={
            <Button>
              <Plus /> Partenaire
            </Button>
          }
        />
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {partenaires.map((p) => (
          <li key={p.id} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{p.raison_sociale}</h2>
                  {!p.actif && <Badge variant="outline">Inactif</Badge>}
                </div>
                <p className={`text-sm font-medium ${p.modele ? "" : "text-primary"}`}>{tarif(p)}</p>
                {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  {p.contact_email ?? "Email de réception à renseigner"}
                  {p.telephone && ` · ${p.telephone}`}
                </p>
              </div>
              <FormulairePartenaire
                partenaire={p}
                declencheur={
                  <Button variant="ghost" size="sm" aria-label={`Modifier ${p.raison_sociale}`}>
                    <Pencil /> Modifier
                  </Button>
                }
              />
            </div>
            <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
              {nb30j.get(p.id) ?? 0} lead(s) reçu(s) sur 30 jours · zones d&apos;attribution en phase 2
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
