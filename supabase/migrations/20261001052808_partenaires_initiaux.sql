-- Partenaires et tarifs fournis par Nico le 01/10/2026 (modifiables dans l'écran Partenaires).
-- Commission = % sur la vente ; achat_lead = prix fixe par lead.
insert into public.partenaires (raison_sociale, modele, taux_commission, prix_lead, notes) values
  ('Valero Loisirs',        'commission', 10,   null, 'Mobil-home'),
  ('Eco Green',             'achat_lead', null, 30,   'Panneaux solaires Normandie'),
  ('Ma Maison Construction','commission', 5,    null, 'Maison container'),
  ('La Tiny House',         'commission', 5,    null, 'Tiny house'),
  ('Dekalco',               'achat_lead', null, 50,   'Marquage publicitaire');
