import {
  ChartColumn,
  Globe,
  Handshake,
  Inbox,
  LayoutDashboard,
  MapPinOff,
  Receipt,
  Upload,
  Users,
} from "lucide-react";

export const NAVIGATION = [
  { titre: "Vue d'ensemble", href: "/", icone: LayoutDashboard },
  { titre: "À traiter", href: "/a-traiter", icone: Inbox },
  { titre: "Leads", href: "/leads", icone: Users },
  { titre: "Partenaires", href: "/partenaires", icone: Handshake },
  { titre: "Non vendus", href: "/non-vendus", icone: MapPinOff },
  { titre: "Stats Leadrs", href: "/stats-leadrs", icone: ChartColumn },
  { titre: "Facturation", href: "/facturation", icone: Receipt },
  { titre: "Sites & sources", href: "/sites", icone: Globe },
  { titre: "Import", href: "/import", icone: Upload },
] as const;

export function titrePage(pathname: string) {
  return NAVIGATION.find((n) => n.href === pathname)?.titre ?? "";
}
