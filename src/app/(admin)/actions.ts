"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function resoudreAlerte(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("alertes").update({ resolue: true, resolue_le: new Date().toISOString() }).eq("id", id);
  revalidatePath("/");
}
