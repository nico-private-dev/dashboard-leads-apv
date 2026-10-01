-- Phase 3 : espace partenaire (lecture via fonctions, jamais d'accès direct à la table leads)
-- et facturation mensuelle.

-- Date à laquelle un lead devient facturable (fin du délai de contestation, ou signature).
alter table public.leads add column facturable_le timestamptz;
create index on public.leads (partenaire_id, facturable_le);

-- Statut de facturation mensuel par partenaire (snapshot du montant au moment de facturer).
create table public.factures (
  id uuid primary key default gen_random_uuid(),
  partenaire_id uuid not null references public.partenaires (id),
  mois date not null check (extract(day from mois) = 1),
  montant numeric(12, 2) not null check (montant >= 0),
  nb_leads integer not null default 0,
  statut text not null check (statut in ('facture', 'paye')),
  facture_le timestamptz not null default now(),
  paye_le timestamptz,
  unique (partenaire_id, mois)
);
alter table public.factures enable row level security;
create policy admin_tout on public.factures for all to authenticated
  using ((select public.est_admin())) with check ((select public.est_admin()));

-- Partenaire connecté (null pour un admin ou un inconnu).
create function public.partenaire_courant() returns uuid
language sql stable security definer set search_path = '' as $$
  select partenaire_id from public.profils where id = (select auth.uid()) and role = 'partenaire';
$$;

-- Leads du partenaire connecté : uniquement ceux qui lui ont été envoyés, colonnes non internes
-- (ni payload brut, ni notes internes, ni prix / commission, ni autres partenaires).
create function public.espace_leads()
returns table (
  id uuid, recu_le timestamptz, envoye_le timestamptz, vu_le timestamptz, statut text,
  prenom text, nom text, email text, telephone text, ville text, code_postal text, departement text,
  besoin text, champs_specifiques jsonb, thematique text, montant_devis numeric, motif_contestation text
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.recu_le, l.envoye_le, l.vu_le, l.statut, l.prenom, l.nom, l.email, l.telephone, l.ville,
         l.code_postal, l.departement, l.besoin, l.champs_specifiques, t.nom, l.montant_devis, l.motif_contestation
  from public.leads l
  join public.thematiques t on t.id = l.thematique_id
  where l.partenaire_id = public.partenaire_courant()
    and l.envoye_le is not null
    and l.statut not in ('doublon', 'archive')
  order by l.recu_le desc;
$$;

create function public.espace_partenaire() returns table (raison_sociale text)
language sql stable security definer set search_path = '' as $$
  select raison_sociale from public.partenaires where id = public.partenaire_courant();
$$;

revoke execute on function public.partenaire_courant(), public.espace_leads(), public.espace_partenaire() from public, anon;
grant execute on function public.partenaire_courant(), public.espace_leads(), public.espace_partenaire() to authenticated;
