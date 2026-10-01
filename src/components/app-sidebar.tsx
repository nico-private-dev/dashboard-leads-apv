"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { seDeconnecter } from "@/app/connexion/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAVIGATION } from "./navigation";

export function AppSidebar({ email, aTraiter }: { email: string; aTraiter: number }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">APV</span>
          <span className="font-semibold">Dashboard leads</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAVIGATION.map(({ titre, href, icone: Icone }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={pathname === href}
                  className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                  render={<Link href={href} onClick={() => setOpenMobile(false)} />}
                >
                  <Icone />
                  <span>{titre}</span>
                </SidebarMenuButton>
                {href === "/a-traiter" && aTraiter > 0 && (
                  <SidebarMenuBadge className="bg-jaune text-jaune-foreground peer-data-active/menu-button:text-jaune-foreground">
                    {aTraiter}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
        <form action={seDeconnecter}>
          <SidebarMenuButton type="submit">
            <LogOut />
            <span>Se déconnecter</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
