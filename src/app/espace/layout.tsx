import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/connexion/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Mon espace", template: "%s · Mon espace APV" } };

// Espace partenaire (brief §9.8) : lecture uniquement via les fonctions espace_* de la base.
export default async function LayoutEspace({ children }: LayoutProps<"/espace">) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("espace_partenaire");
  const partenaire = data?.[0]?.raison_sociale;
  if (!partenaire) redirect("/connexion");

  return (
    <div className="min-h-svh">
      <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
        <Link href="/espace" className="rounded-md bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">
          APV
        </Link>
        <span className="truncate font-semibold">{partenaire}</span>
        <form action={seDeconnecter} className="ml-auto">
          <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
    </div>
  );
}
