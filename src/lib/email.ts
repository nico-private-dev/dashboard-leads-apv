import "server-only";
import { render } from "@react-email/components";
import { Resend } from "resend";

export type ResultatEmail = { simule?: boolean; id?: string; erreur?: string };

// Envoi via Resend. Sans RESEND_API_KEY (domaine pas encore vérifié), l'email est « simulé » :
// affiché dans le terminal de `pnpm dev` avec ses liens, pour tester tout le parcours en local.
export async function envoyerEmail({ a, copie = [], objet, contenu }: { a: string[]; copie?: string[]; objet: string; contenu: React.ReactElement }): Promise<ResultatEmail> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    const texte = await render(contenu, { plainText: true });
    console.info(`\n[EMAIL SIMULÉ] À : ${a.join(", ")}${copie.length ? ` · Cc : ${copie.join(", ")}` : ""}\nObjet : ${objet}\n${texte}\n`);
    return { simule: true };
  }
  const { data, error } = await new Resend(cle).emails.send({
    from: process.env.EMAIL_FROM ?? "APV Leads <leads@agence-apv.fr>",
    to: a,
    cc: copie.length ? copie : undefined,
    subject: objet,
    react: contenu,
  });
  return error ? { erreur: error.message } : { id: data?.id };
}

export function emailsAdmins() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}
