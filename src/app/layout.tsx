import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Dashboard Leads APV", template: "%s · APV" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
