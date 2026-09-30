import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarteAuth } from "@/components/carte-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connexion" };

// Page intermédiaire : les scanners d'emails ouvrent le lien mais ne soumettent pas le formulaire,
// donc le jeton à usage unique n'est consommé que par un vrai clic.
async function confirmer(formData: FormData) {
  "use server";
  const token_hash = String(formData.get("token_hash") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: "email" });
  redirect(error ? "/auth/confirmer?erreur=1" : "/");
}

export default async function PageConfirmer({ searchParams }: PageProps<"/auth/confirmer">) {
  const { token_hash, erreur } = await searchParams;

  if (erreur || typeof token_hash !== "string") {
    return (
      <CarteAuth titre="Lien invalide ou expiré">
        <p className="mb-4 text-sm text-muted-foreground">
          Ce lien a déjà été utilisé ou a expiré. Demandez-en un nouveau, ou utilisez le code reçu par email.
        </p>
        <Link href="/connexion" className={buttonVariants({ className: "w-full" })}>
          Retour à la connexion
        </Link>
      </CarteAuth>
    );
  }

  return (
    <CarteAuth titre="Connexion au dashboard leads">
      <form action={confirmer}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <Button type="submit" className="w-full">
          Se connecter
        </Button>
      </form>
    </CarteAuth>
  );
}
