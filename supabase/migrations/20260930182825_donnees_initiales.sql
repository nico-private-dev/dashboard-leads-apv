-- Données initiales : thématiques et sites fournis par Nico le 01/10/2026, profils des 2 admins.
-- Partenaires, tarifs et autres niches : saisis plus tard dans l'interface (ne pas inventer).

insert into public.thematiques (nom, slug, couleur, multi_sites) values
  ('Panneaux solaires', 'panneaux-solaires', '#E8A33D', true),
  ('Mobil-home',        'mobil-home',        '#3B82A0', false),
  ('Dératisation',      'deratisation',      '#8A6A4A', false),
  ('Maison container',  'maison-container',  '#4F7A5A', false),
  ('Tiny house',        'tiny-house',        '#9B6BB3', false);

-- 13 sites PV régionaux : iframe Leadrs, sauf Normandie reçu en direct.
insert into public.sites (thematique_id, nom, domaine, region, collecte)
select t.id, 'PV ' || s.region, s.domaine, s.region, s.collecte
from public.thematiques t,
(values
  ('panneau-solaire-auvergne-rhone-alpes.com',    'Auvergne-Rhône-Alpes',       'leadrs'),
  ('panneaux-solaires-bourgogne-franche-comte.com','Bourgogne-Franche-Comté',    'leadrs'),
  ('panneaux-solaires-bretagne.com',              'Bretagne',                   'leadrs'),
  ('panneaux-solaires-centre-val-de-loire.com',   'Centre-Val de Loire',        'leadrs'),
  ('panneaux-solaires-corse.com',                 'Corse',                      'leadrs'),
  ('panneaux-solaires-grand-est.com',             'Grand Est',                  'leadrs'),
  ('panneaux-solaires-hauts-de-france.com',       'Hauts-de-France',            'leadrs'),
  ('panneaux-solaires-ile-de-france.com',         'Île-de-France',              'leadrs'),
  ('panneaux-solaires-normandie.fr',              'Normandie',                  'direct'),
  ('panneaux-solaires-nouvelle-aquitaine.com',    'Nouvelle-Aquitaine',         'leadrs'),
  ('panneaux-solaires-occitanie.com',             'Occitanie',                  'leadrs'),
  ('panneaux-solaires-pays-loire.com',            'Pays de la Loire',           'leadrs'),
  ('panneauxsolairespaca.com',                    'Provence-Alpes-Côte d''Azur', 'leadrs')
) as s (domaine, region, collecte)
where t.slug = 'panneaux-solaires';

-- Sites uniques, en direct.
insert into public.sites (thematique_id, nom, domaine, region)
select t.id, s.nom, s.domaine, s.region
from (values
  ('mobil-home',       'Mobil-home Normandie',    'achat-mobilhome-normandie.fr', 'Normandie'),
  ('deratisation',     'Dératisation France',     'deratiseur-france.fr',         null),
  ('maison-container', 'Maison container France', 'maison-containeur-france.fr',  null),
  ('tiny-house',       'Tiny house France',       'tiny-house-france.com',        null)
) as s (slug, nom, domaine, region)
join public.thematiques t on t.slug = s.slug;

-- Profils admin (comptes créés en phase 0).
insert into public.profils (id, nom, email, role)
select u.id, case u.email when 'nicolas@agence-apv.fr' then 'Nico' else 'Cyril' end, u.email, 'admin'
from auth.users u
where u.email in ('nicolas@agence-apv.fr', 'cyril@agence-apv.fr');
