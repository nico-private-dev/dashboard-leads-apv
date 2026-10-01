"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// Panneau latéral piloté par l'URL (?lead=…) : lien partageable, bouton retour du navigateur OK.
export function PanneauLead({ urlFermeture, titre, children }: { urlFermeture: string; titre: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Sheet open onOpenChange={(o) => !o && router.push(urlFermeture, { scroll: false })}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetTitle className="sr-only">{titre}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
