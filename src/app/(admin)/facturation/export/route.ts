import { createClient } from "@/lib/supabase/server";
import { chargerRecap } from "../donnees";

const MODELES: Record<string, string> = { achat_lead: "Achat au lead", commission: "Commission", abonnement: "Abonnement" };
const STATUTS: Record<string, string> = { a_facturer: "À facturer", facture: "Facturé", paye: "Payé", rien: "Rien à facturer" };

function cellule(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const mois = new URL(req.url).searchParams.get("mois") ?? "";
  if (!/^\d{4}-\d{2}$/.test(mois)) return new Response("Mois invalide", { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non connecté", { status: 401 });
  const recap = await chargerRecap(supabase, mois);
  const montant = (n: number) => n.toFixed(2).replace(".", ",");
  const lignes = [
    ["Mois", "Partenaire", "Modèle", "Leads reçus", "Facturables", "Contestés", "Montant dû (€)", "Coût par lead (€)", "Statut"],
    ...recap.map((l) => [mois, l.partenaire.raison_sociale, l.partenaire.modele ? MODELES[l.partenaire.modele] : "", l.leadsRecus, l.leadsFacturables, l.contestes, montant(l.montant), l.coutParLead === null ? "" : montant(l.coutParLead), STATUTS[l.statut]]),
  ];
  return new Response("﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="facturation-${mois}.csv"` },
  });
}
