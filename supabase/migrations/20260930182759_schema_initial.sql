-- Schéma initial du dashboard leads APV (brief §5).
-- Valeurs métier en text + check (plus simple à faire évoluer qu'un enum).

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------- partenaires
create table public.partenaires (
  id uuid primary key default gen_random_uuid(),
  raison_sociale text not null,
  contact_nom text,
  contact_email text,
  emails_copie text[] not null default '{}',
  telephone text,
  siret text,
  adresse text,
  site_web text,
  notes text,
  actif boolean not null default true,
  modele text check (modele in ('abonnement', 'commission', 'achat_lead')),
  montant_abonnement_mensuel numeric(10, 2) check (montant_abonnement_mensuel >= 0),
  taux_commission numeric(5, 2) check (taux_commission between 0 and 100),
  prix_lead numeric(10, 2) check (prix_lead >= 0),
  delai_contestation_jours integer not null default 7 check (delai_contestation_jours >= 0),
  date_debut date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profils
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  nom text,
  email text not null,
  role text not null check (role in ('admin', 'partenaire')),
  partenaire_id uuid references public.partenaires (id),
  created_at timestamptz not null default now(),
  check (role = 'admin' or partenaire_id is not null)
);

-- ---------------------------------------------------------------- thématiques, sites, sources
create table public.thematiques (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  slug text not null unique,
  couleur text not null default '#6B6B6B' check (couleur ~ '^#[0-9A-Fa-f]{6}$'),
  multi_sites boolean not null default false,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  thematique_id uuid not null references public.thematiques (id),
  nom text not null,
  domaine text unique,
  pays text not null default 'FR' check (pays ~ '^[A-Z]{2}$'),
  region text,
  -- direct : on reçoit les leads ; leadrs : iframe Leadrs, on ne suit que des chiffres agrégés.
  collecte text not null default 'direct' check (collecte in ('direct', 'leadrs')),
  alerte_silence_jours integer check (alerte_silence_jours > 0),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.sites (thematique_id);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites (id),
  thematique_id uuid not null references public.thematiques (id),
  type text not null check (type in ('tally', 'allo', 'csv', 'manuel', 'generic')),
  nom text not null,
  webhook_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  webhook_secret text,
  config jsonb not null default '{}',
  dernier_lead_le timestamptz,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.sources (site_id);
create index on public.sources (thematique_id);

-- ---------------------------------------------------------------- attributions (utilisées en phase 2)
create table public.attributions (
  id uuid primary key default gen_random_uuid(),
  partenaire_id uuid not null references public.partenaires (id),
  thematique_id uuid not null references public.thematiques (id),
  site_id uuid references public.sites (id),
  type_zone text not null check (type_zone in ('france', 'pays', 'regions', 'departements', 'rayon')),
  zone_config jsonb not null default '{}',
  priorite integer not null default 0,
  envoi_auto boolean not null default false,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.attributions (thematique_id) where actif;
create index on public.attributions (partenaire_id);
create index on public.attributions (site_id);

-- ---------------------------------------------------------------- leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recu_le timestamptz not null default now(),
  source_id uuid references public.sources (id),
  site_id uuid references public.sites (id),
  thematique_id uuid not null references public.thematiques (id),

  prenom text,
  nom text,
  email text,
  telephone text,
  ville text,
  code_postal text,
  departement text,
  region text,
  pays text,
  lat double precision,
  lng double precision,
  geoloc_incertaine boolean not null default false,
  besoin text,

  champs_specifiques jsonb not null default '[]' check (jsonb_typeof(champs_specifiques) = 'array'),
  payload_brut jsonb,

  allo_resume text,
  allo_transcription text,
  allo_enregistrement_url text,

  statut text not null default 'a_completer' check (statut in (
    'nouveau', 'attribue', 'envoye', 'vu', 'contacte', 'devis_envoye', 'signe', 'perdu',
    'a_completer', 'hors_zone', 'doublon', 'invalide', 'non_lead', 'archive'
  )),
  doublon_de uuid references public.leads (id),

  partenaire_id uuid references public.partenaires (id),
  attribue_le timestamptz,
  envoye_le timestamptz,
  vu_le timestamptz,

  montant_devis numeric(12, 2),
  montant_commission numeric(12, 2),
  prix_facture numeric(10, 2),
  statut_facturation text not null default 'non_facturable'
    check (statut_facturation in ('non_facturable', 'a_facturer', 'facture', 'paye', 'conteste')),
  motif_contestation text,

  notes_internes text
);
create index on public.leads (thematique_id, recu_le);
create index on public.leads (site_id, recu_le);
create index on public.leads (partenaire_id, statut);
create index on public.leads (statut);
create index on public.leads (source_id);
create index on public.leads (doublon_de);
create index on public.leads (telephone);
create index on public.leads (email);

-- ---------------------------------------------------------------- historique, stats externes, alertes
create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id),
  type text not null,
  auteur text not null check (auteur in ('admin', 'partenaire', 'systeme')),
  auteur_id uuid references auth.users (id),
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.lead_events (lead_id, created_at);

create table public.stats_externes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id),
  plateforme text not null default 'leadrs' check (plateforme in ('leadrs')),
  periode_debut date not null,
  periode_fin date not null,
  nb_leads integer not null default 0 check (nb_leads >= 0),
  nb_leads_valides integer check (nb_leads_valides between 0 and nb_leads),
  ca_verse numeric(12, 2) check (ca_verse >= 0),
  notes text,
  saisi_par uuid references auth.users (id),
  created_at timestamptz not null default now(),
  check (periode_fin >= periode_debut),
  -- Pas de chevauchement de périodes pour un même site : évite de compter deux fois (semaine + mois).
  exclude using gist (site_id with =, daterange(periode_debut, periode_fin, '[]') with &&)
);

create table public.alertes (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('site_silencieux', 'lead_non_traite', 'erreur_ingestion')),
  site_id uuid references public.sites (id),
  source_id uuid references public.sources (id),
  lead_id uuid references public.leads (id),
  message text not null,
  details jsonb not null default '{}',
  resolue boolean not null default false,
  resolue_le timestamptz,
  created_at timestamptz not null default now()
);
create index on public.alertes (created_at) where not resolue;
create index on public.alertes (site_id);
create index on public.alertes (source_id);
create index on public.alertes (lead_id);

-- ---------------------------------------------------------------- règles sur les leads

-- CLAUDE.md : on ne supprime jamais un lead, on change son statut.
create function public.interdire_suppression_lead() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Suppression interdite : changer le statut du lead (invalide, doublon, archive).';
end $$;
create trigger leads_pas_de_suppression before delete on public.leads
  for each row execute function public.interdire_suppression_lead();

-- updated_at + journal de chaque changement de statut, quel que soit le chemin (app, SQL, API).
create function public.leads_avant_maj() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.leads_avant_maj();

create function public.journaliser_statut_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lead_events (lead_id, type, auteur, auteur_id, details)
  values (
    new.id, 'statut_change',
    case when auth.uid() is null then 'systeme' else 'admin' end,
    auth.uid(),
    jsonb_build_object('de', old.statut, 'a', new.statut)
  );
  return new;
end $$;
create trigger leads_journal_statut after update of statut on public.leads
  for each row when (old.statut is distinct from new.statut)
  execute function public.journaliser_statut_lead();

-- ---------------------------------------------------------------- RLS
-- Phase 1 : admins uniquement. Les règles partenaire arrivent en phase 3.
create function public.est_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profils where id = (select auth.uid()) and role = 'admin');
$$;
revoke execute on function public.est_admin() from anon;

alter table public.partenaires enable row level security;
alter table public.profils enable row level security;
alter table public.thematiques enable row level security;
alter table public.sites enable row level security;
alter table public.sources enable row level security;
alter table public.attributions enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.stats_externes enable row level security;
alter table public.alertes enable row level security;

create policy admin_tout on public.partenaires for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_tout on public.thematiques for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_tout on public.sites for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_tout on public.sources for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_tout on public.attributions for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_tout on public.stats_externes for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_tout on public.alertes for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));

-- Leads et historique : pas de policy delete (le trigger bloque de toute façon).
create policy admin_lecture on public.leads for select to authenticated using ((select public.est_admin()));
create policy admin_ajout on public.leads for insert to authenticated with check ((select public.est_admin()));
create policy admin_modif on public.leads for update to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy admin_lecture on public.lead_events for select to authenticated using ((select public.est_admin()));
create policy admin_ajout on public.lead_events for insert to authenticated with check ((select public.est_admin()));

-- Chacun lit son profil ; les admins lisent tout. Les profils se gèrent via la clé serveur.
create policy lecture on public.profils for select to authenticated
  using (id = (select auth.uid()) or (select public.est_admin()));
