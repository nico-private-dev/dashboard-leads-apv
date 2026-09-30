"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ResultatAction } from "@/components/formulaire-dialog";
import { createClient } from "@/lib/supabase/server";

// Client avec la session de l'admin : la RLS (est_admin) protège chaque écriture.

const texte = z.string().trim();
const optionnel = texte.transform((v) => v || null);
const coche = z.literal("on").optional().transform(Boolean);
const idOptionnel = z.uuid().optional().or(z.literal("").transform(() => undefined));

function slugifier(nom: string) {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function messageErreur(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Cette valeur existe déjà (domaine ou nom en double).";
  return "Erreur : " + error.message;
}

async function enregistrer(table: "thematiques" | "sites" | "sources", id: string | undefined, valeurs: object) {
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from(table).update(valeurs).eq("id", id)
    : await supabase.from(table).insert(valeurs as never);
  if (error) return { erreur: messageErreur(error) };
  revalidatePath("/sites");
  return {};
}

const thematiqueSchema = z.object({
  id: idOptionnel,
  nom: texte.min(1, "Nom obligatoire."),
  couleur: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
  multi_sites: coche,
  actif: coche,
});

export async function enregistrerThematique(fd: FormData): Promise<ResultatAction> {
  const p = thematiqueSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { id, ...valeurs } = p.data;
  return enregistrer("thematiques", id, id ? valeurs : { ...valeurs, slug: slugifier(valeurs.nom) });
}

const siteSchema = z.object({
  id: idOptionnel,
  thematique_id: z.uuid("Thématique obligatoire."),
  nom: texte.min(1, "Nom obligatoire."),
  // « https://www.Exemple.fr/ » → « exemple.fr »
  domaine: texte.transform((v) => v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || null),
  pays: texte.toUpperCase().regex(/^[A-Z]{2}$/, "Pays : code à 2 lettres (FR, BE…)."),
  region: optionnel,
  collecte: z.enum(["direct", "leadrs"]),
  alerte_silence_jours: texte.transform((v) => (v ? Number(v) : null)).pipe(z.number().int().positive("Jours de silence : nombre positif.").nullable()),
  actif: coche,
});

export async function enregistrerSite(fd: FormData): Promise<ResultatAction> {
  const p = siteSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { id, ...valeurs } = p.data;
  return enregistrer("sites", id, valeurs);
}

const sourceSchema = z.object({
  id: idOptionnel,
  site_id: idOptionnel,
  thematique_id: z.uuid(),
  type: z.enum(["tally", "generic", "csv", "manuel"]),
  nom: texte.min(1, "Nom obligatoire."),
  webhook_secret: optionnel,
  actif: coche,
});

export async function enregistrerSource(fd: FormData): Promise<ResultatAction> {
  const p = sourceSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { id, site_id, ...valeurs } = p.data;
  return enregistrer("sources", id, { ...valeurs, site_id: site_id ?? null });
}
