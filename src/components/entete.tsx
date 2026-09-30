"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { titrePage } from "./navigation";

export function Entete() {
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
      <SidebarTrigger className="md:hidden" />
      <h1 className="text-base font-semibold">{titrePage(usePathname())}</h1>
    </header>
  );
}
