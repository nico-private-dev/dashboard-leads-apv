import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin";

// Accès sans session : webhooks (token + signature Tally), tâches planifiées (CRON_SECRET), liens partenaires 1 clic (lien signé).
const PUBLIC_PATHS = ["/connexion", "/auth/", "/api/ingest/", "/api/taches", "/p/"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Rafraîchit la session et vérifie le jeton.
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || isAdminEmail(email)) return response;
  if (!data?.claims?.sub) return NextResponse.redirect(new URL("/connexion", request.url));
  // Autre compte connecté (partenaire) : uniquement son espace. Le layout /espace vérifie le rôle en base.
  if (!pathname.startsWith("/espace")) return NextResponse.redirect(new URL("/espace", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
