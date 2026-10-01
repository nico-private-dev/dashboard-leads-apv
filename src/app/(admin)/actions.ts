"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { executerTaches } from "@/lib/taches";

export async function resoudreAlerte(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("alertes").update({ resolue: true, resolue_le: new Date().toISOString() }).eq("id", id);
  revalidatePath("/");
}

// Lance à la main les vérifications de la tâche planifiée (relances, suivis, sites silencieux).
export async function lancerVerifications() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("est_admin");
  if (admin !== true) return;
  await executerTaches();
  revalidatePath("/");
}
