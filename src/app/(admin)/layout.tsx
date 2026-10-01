import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Entete } from "@/components/entete";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAdminEmail } from "@/lib/admin";
import { filtreATraiter } from "@/lib/libelles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  // Second contrôle côté serveur (proxy.ts fait le premier).
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email || !isAdminEmail(email)) redirect("/connexion");

  // Même règle que la page À traiter.
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .or(filtreATraiter());

  return (
    <SidebarProvider>
      <AppSidebar email={email} aTraiter={count ?? 0} />
      <SidebarInset className="min-w-0">
        <Entete />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
