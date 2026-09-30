-- Advisors Supabase : fonctions SECURITY DEFINER exposées via /rest/v1/rpc et FK sans index.

-- Fonction de trigger : personne n'a besoin de l'appeler directement.
revoke execute on function public.journaliser_statut_lead() from public, anon, authenticated;

-- est_admin() : utilisée par les policies RLS, donc exécutable par les connectés uniquement
-- (elle ne révèle que « suis-je admin ? »).
revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated;

create index on public.lead_events (auteur_id);
create index on public.profils (partenaire_id);
create index on public.stats_externes (saisi_par);
