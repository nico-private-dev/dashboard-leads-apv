-- Zones fournies par Nico le 01/10/2026 (modifiables dans l'écran Partenaires).
-- Noms de régions identiques à ceux de la géolocalisation (api-adresse).
insert into public.thematiques (nom, slug, couleur) values ('Marquage publicitaire', 'marquage-publicitaire', '#2E5E8C');

insert into public.attributions (partenaire_id, thematique_id, site_id, type_zone, zone_config)
select p.id, t.id, s.id, z.type_zone, z.zone_config::jsonb
from (values
  ('Valero Loisirs',         'mobil-home',            null,                             'regions', '{"regions":["Normandie","Île-de-France"]}'),
  ('Eco Green',              'panneaux-solaires',     'panneaux-solaires-normandie.fr', 'regions', '{"regions":["Normandie"]}'),
  ('Ma Maison Construction', 'maison-container',      null,                             'regions', '{"regions":["Auvergne-Rhône-Alpes"]}'),
  ('La Tiny House',          'tiny-house',            null,                             'france',  '{}'),
  ('Dekalco',                'marquage-publicitaire', null,                             'regions', '{"regions":["Occitanie"]}')
) as z (partenaire, thematique, domaine, type_zone, zone_config)
join public.partenaires p on p.raison_sociale = z.partenaire
join public.thematiques t on t.slug = z.thematique
left join public.sites s on s.domaine = z.domaine;
