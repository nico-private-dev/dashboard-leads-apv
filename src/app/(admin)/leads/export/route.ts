import { appliquerFiltres, lireFiltres } from "@/lib/filtres";
import { formatDateHeure } from "@/lib/format";
import { STATUTS, STATUTS_FACTURATION } from "@/lib/libelles";
import { dateParis } from "@/lib/periodes";
import { chargerReferentiel } from "@/lib/referentiel";
import { createClient } from "@/lib/supabase/server";

// Export CSV de la liste filtrée (brief §9.3). Séparateur « ; » + BOM : s'ouvre directement dans Excel FR.
const LOT = 1000; // limite de lignes par requête Supabase

function cellule(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Non connecté", { status: 401 });

  const filtres = lireFiltres(Object.fromEntries(new URL(req.url).searchParams));
  const ref = await chargerReferentiel(supabase);
  const thematique = new Map(ref.thematiques.map((t) => [t.id, t.nom]));
  const site = new Map(ref.sites.map((s) => [s.id, s.nom]));
  const source = new Map(ref.sources.map((s) => [s.id, s.nom]));
  const partenaire = new Map(ref.partenaires.map((p) => [p.id, p.raison_sociale]));

  const lignes = [
    ["Reçu le", "Thématique", "Site", "Source", "Prénom", "Nom", "Téléphone", "Email", "Ville", "Code postal", "Département", "Région", "Besoin", "Partenaire", "Statut", "Facturation", "Champs spécifiques"],
  ];
  for (let debut = 0; ; debut += LOT) {
    const { data, error } = await appliquerFiltres(supabase.from("leads").select("*"), filtres)
      .order("recu_le", { ascending: false })
      .range(debut, debut + LOT - 1);
    if (error) return new Response(error.message, { status: 500 });
    for (const l of data) {
      const specifiques = (Array.isArray(l.champs_specifiques) ? l.champs_specifiques : []) as { label: string; valeur: string }[];
      lignes.push([
        formatDateHeure(l.recu_le),
        thematique.get(l.thematique_id) ?? "",
        (l.site_id && site.get(l.site_id)) || "",
        (l.source_id && source.get(l.source_id)) || "Saisie manuelle",
        l.prenom ?? "",
        l.nom ?? "",
        l.telephone ?? "",
        l.email ?? "",
        l.ville ?? "",
        l.code_postal ?? "",
        l.departement ?? "",
        l.region ?? "",
        l.besoin ?? "",
        (l.partenaire_id && partenaire.get(l.partenaire_id)) || "",
        STATUTS[l.statut]?.label ?? l.statut,
        STATUTS_FACTURATION[l.statut_facturation] ?? l.statut_facturation,
        specifiques.map((c) => `${c.label} : ${c.valeur}`).join(" | "),
      ]);
    }
    if (data.length < LOT) break;
  }

  const csv = "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${dateParis(new Date())}.csv"`,
    },
  });
}
