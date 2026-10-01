// Liens « 1 clic » des emails partenaires (brief §2.3, §7) : signés HMAC, valables 60 jours, sans connexion.
// Fonctions pures (secret passé en paramètre) : testées par liens.test.ts.
import { createHmac, timingSafeEqual } from "node:crypto";

export const VALIDITE_JOURS = 60;

export type ContenuLien = { lead: string; partenaire: string; expire: number }; // expire : secondes epoch

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function signature(donnees: string, secret: string) {
  return createHmac("sha256", secret).update(donnees).digest();
}

export function signerLien(lead: string, partenaire: string, secret: string, maintenant = Date.now()): string {
  const contenu: ContenuLien = { lead, partenaire, expire: Math.floor(maintenant / 1000) + VALIDITE_JOURS * 86_400 };
  const donnees = b64(JSON.stringify(contenu));
  return `${donnees}.${b64(signature(donnees, secret))}`;
}

export function verifierLien(jeton: string, secret: string, maintenant = Date.now()): ContenuLien | null {
  const [donnees, sig] = jeton.split(".");
  if (!donnees || !sig) return null;
  const attendue = signature(donnees, secret);
  const recue = Buffer.from(sig, "base64url");
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const c = JSON.parse(Buffer.from(donnees, "base64url").toString()) as ContenuLien;
    return c.expire * 1000 > maintenant ? c : null;
  } catch {
    return null;
  }
}
