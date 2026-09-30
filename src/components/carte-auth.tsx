import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Cadre commun des pages de connexion.
export function CarteAuth({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-2 inline-flex w-fit rounded-md bg-primary px-2 py-1 text-sm font-bold text-primary-foreground">
            APV
          </span>
          <CardTitle className="text-lg font-semibold">{titre}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
