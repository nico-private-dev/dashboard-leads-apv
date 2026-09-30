"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type EtatConnexion = { etape: "email" | "code"; email?: string; message?: string; erreur?: string };

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6}$/);

export async function demanderConnexion(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { etape: "email", erreur: "Adresse email invalide." };
  const email = parsed.data;

  // Même réponse que l'email soit autorisé ou non : on ne révèle pas la liste des admins.
  if (isAdminEmail(email)) {
    if (process.env.NODE_ENV === "development") {
      // ponytail: pas d'envoi d'email en local (DNS non vérifié dans Resend) → lien affiché dans le terminal.
      const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
      if (error) return { etape: "email", erreur: "Erreur Supabase : " + error.message };
      console.info(
        `\n[DEV] Connexion ${email}\n  Lien : ${process.env.NEXT_PUBLIC_APP_URL}/auth/confirmer?token_hash=${data.properties.hashed_token}\n  Code : ${data.properties.email_otp}\n`,
      );
    } else {
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) console.error("signInWithOtp", error.message);
    }
  }

  return {
    etape: "code",
    email,
    message: "Si cette adresse est autorisée, un email de connexion vient d'être envoyé.",
  };
}

export async function verifierCode(_: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const email = emailSchema.safeParse(formData.get("email"));
  const code = codeSchema.safeParse(String(formData.get("code") ?? "").trim());
  if (!email.success) return { etape: "email", erreur: "Adresse email invalide." };
  if (!code.success) return { etape: "code", erreur: "Le code contient 6 chiffres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error) return { etape: "code", erreur: "Code invalide ou expiré." };
  redirect("/");
}

export async function seDeconnecter() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
