import { formatDateHeure } from "@/lib/format";
import { STATUTS } from "@/lib/libelles";
import { dateParis } from "@/lib/periodes";
import { createClient } from "@/lib/supabase/server";

// Export CSV des leads du partenaire connecté (brief §9.8) : mêmes colonnes que son espace.
function cellule(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("espace_leads");
  if (error) return new Response("Non autorisé", { status: 401 });
  const lignes = [
    ["Reçu le", "Thématique", "Prénom", "Nom", "Téléphone", "Email", "Ville", "Code postal", "Besoin", "Statut", "Montant devis", "Réponses"],
    ...data.map((l) => [
      formatDateHeure(l.envoye_le ?? l.recu_le),
      l.thematique,
      l.prenom,
      l.nom,
      l.telephone,
      l.email,
      l.ville,
      l.code_postal,
      l.besoin,
      STATUTS[l.statut]?.label ?? l.statut,
      l.montant_devis,
      ((Array.isArray(l.champs_specifiques) ? l.champs_specifiques : []) as { label: string; valeur: string }[]).map((c) => `${c.label} : ${c.valeur}`).join(" | "),
    ]),
  ];
  return new Response("﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="mes-leads-${dateParis(new Date())}.csv"` },
  });
}
