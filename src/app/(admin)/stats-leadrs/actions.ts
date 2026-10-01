"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ResultatStats = { erreur?: string; message?: string };

const jour = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// « 1 234,50 » → 1234.5 ; vide → null
function nombre(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  return s === "" ? null : Number(s);
}

// Enregistre les chiffres Leadrs d'une période pour tous les sites du tableau (brief §3.3).
export async function enregistrerStats(fd: FormData): Promise<ResultatStats> {
  const debut = jour.safeParse(fd.get("periode_debut"));
  const fin = jour.safeParse(fd.get("periode_fin"));
  if (!debut.success || !fin.success) return { erreur: "Période invalide." };
  const sites = fd.getAll("site_id").map(String);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: existants } = await supabase
    .from("stats_externes")
    .select("id, site_id")
    .eq("periode_debut", debut.data)
    .eq("periode_fin", fin.data)
    .in("site_id", sites);
  const existant = new Map(existants?.map((e) => [e.site_id, e.id]));

  const erreurs: string[] = [];
  let enregistres = 0;
  for (const site_id of sites) {
    const nom = String(fd.get(`nom_${site_id}`));
    const nb = nombre(fd.get(`nb_${site_id}`));
    const valides = nombre(fd.get(`valides_${site_id}`));
    const ca = nombre(fd.get(`ca_${site_id}`));
    const id = existant.get(site_id);

    if (nb === null && valides === null && ca === null) {
      // Ligne vidée : on retire la saisie (ce ne sont pas des leads, rien n'est perdu).
      if (id) await supabase.from("stats_externes").delete().eq("id", id);
      continue;
    }
    if ([nb, valides, ca].some((v) => v !== null && (Number.isNaN(v) || v < 0))) {
      erreurs.push(`${nom} : nombres invalides`);
      continue;
    }
    if (valides !== null && nb !== null && valides > nb) {
      erreurs.push(`${nom} : plus de leads validés que de leads`);
      continue;
    }
    const valeurs = {
      site_id,
      periode_debut: debut.data,
      periode_fin: fin.data,
      nb_leads: nb ?? 0,
      nb_leads_valides: valides,
      ca_verse: ca,
      saisi_par: auth.user?.id,
    };
    const { error } = id
      ? await supabase.from("stats_externes").update(valeurs).eq("id", id)
      : await supabase.from("stats_externes").insert(valeurs);
    if (error?.code === "23P01") erreurs.push(`${nom} : une saisie existe déjà sur une période qui chevauche celle-ci`);
    else if (error) erreurs.push(`${nom} : ${error.message}`);
    else enregistres++;
  }

  revalidatePath("/stats-leadrs");
  revalidatePath("/");
  if (erreurs.length) return { erreur: erreurs.join(" · "), message: enregistres ? `${enregistres} site(s) enregistré(s).` : undefined };
  return { message: `Enregistré (${enregistres} site${enregistres > 1 ? "s" : ""}).` };
}
