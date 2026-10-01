import { STATUTS } from "@/lib/libelles";
import { cn } from "@/lib/utils";

export function BadgeStatut({ statut, className }: { statut: string; className?: string }) {
  const s = STATUTS[statut] ?? { label: statut, classe: "border" };
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium whitespace-nowrap", s.classe, className)}>
      {s.label}
    </span>
  );
}

export function Pastille({ couleur, titre }: { couleur: string; titre?: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: couleur }} title={titre} />;
}
