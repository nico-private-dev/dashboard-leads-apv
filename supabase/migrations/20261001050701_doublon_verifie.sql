-- « À traiter » liste les doublons pas encore vérifiés par un admin (brief §9.2).
alter table public.leads add column doublon_verifie boolean not null default false;
create index on public.leads (statut) where statut in ('nouveau', 'a_completer', 'hors_zone', 'doublon');
