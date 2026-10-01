import type { Metadata } from "next";
import { nomComplet } from "@/lib/libelles";
import { verifierLien } from "@/lib/liens";
import { createAdminClient } from "@/lib/supabase/server";
import { ACTIONS_PARTENAIRE, type ActionPartenaire } from "./constantes";
import { FormulaireClic } from "./formulaire-clic";

export const metadata: Metadata = { title: "Suivi du lead" };

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 py-8">
      <span className="inline-flex rounded-md bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">APV</span>
      <div className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">{children}</div>
    </main>
  );
}

// Page ouverte depuis l'email partenaire. Jamais de données internes (prix, notes, payload) : CLAUDE.md.
export default async function PageLienPartenaire({ params, searchParams }: PageProps<"/p/[jeton]">) {
  const { jeton } = await params;
  const { action } = await searchParams;
  const lien = verifierLien(jeton, process.env.LINK_SIGNING_SECRET ?? "");
  if (!lien) {
    return (
      <Cadre>
        <h1 className="font-semibold">Lien expiré</h1>
        <p className="text-sm text-muted-foreground">Ce lien n&apos;est plus valable (60 jours). Contactez l&apos;Agence APV si besoin.</p>
      </Cadre>
    );
  }

  const { data: lead } = await createAdminClient()
    .from("leads")
    .select("prenom, nom, telephone, email, ville, code_postal, besoin, statut, partenaire_id, thematiques(nom)")
    .eq("id", lien.lead)
    .single();
  if (!lead || lead.partenaire_id !== lien.partenaire) {
    return (
      <Cadre>
        <h1 className="font-semibold">Lead indisponible</h1>
        <p className="text-sm text-muted-foreground">Ce lead ne vous est plus attribué.</p>
      </Cadre>
    );
  }

  const initiale = ACTIONS_PARTENAIRE.includes(action as ActionPartenaire) ? (action as ActionPartenaire) : "contacte";
  return (
    <Cadre>
      <div>
        <p className="text-xs text-muted-foreground">{lead.thematiques?.nom}</p>
        <h1 className="text-lg font-semibold">{nomComplet(lead)}</h1>
        <p className="text-sm text-muted-foreground">
          {[lead.telephone, lead.email, [lead.ville, lead.code_postal].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
        </p>
        {lead.besoin && <p className="mt-2 rounded-lg bg-muted/50 p-3 text-sm">{lead.besoin}</p>}
      </div>
      <FormulaireClic jeton={jeton} actionInitiale={initiale} />
    </Cadre>
  );
}
