import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Entete } from "@/components/entete";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  // Second contrôle côté serveur (proxy.ts fait le premier).
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email || !isAdminEmail(email)) redirect("/connexion");

  return (
    <SidebarProvider>
      <AppSidebar email={email} />
      <SidebarInset className="min-w-0">
        <Entete />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
