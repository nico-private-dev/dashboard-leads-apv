# Brief — Dashboard Leads APV (V1)

## 1. Contexte et objectif

Agence APV exploite des sites de génération de leads sur plusieurs thématiques
(panneaux solaires, pompes à chaleur, mobil-home, marquage publicitaire, maison container,
tiny house…). Les leads arrivent par plusieurs canaux (formulaires Tally, appels traités par
la réceptionniste IA Allo, plateforme Leadrs) et sont aujourd'hui transférés à la main par
email aux partenaires acheteurs, sans suivi.

Objectif : **un seul endroit** pour :
1. recevoir automatiquement tous les leads, quelle que soit la source ;
2. les attribuer au bon partenaire selon la thématique et la zone géographique ;
3. savoir si le partenaire a vu et traité chaque lead ;
4. suivre les volumes (analytics) et ce que chaque partenaire doit payer.

Utilisateurs V1 : 2 admins (Nico, Cyril). Partenaires : espace dédié en phase 3.

---

## 2. Principes clés

### 2.1 Un lead = un socle commun + ses champs spécifiques
Chaque niche a son propre formulaire (le formulaire PV ne pose pas les mêmes questions que
le formulaire mobil-home). On **ne force pas** un format unique :

- **Socle commun** (colonnes en base, car indispensables pour filtrer, dédoublonner et
  attribuer par zone) : nom/prénom, email, téléphone, ville d'intervention, besoin.
- **Champs spécifiques** : tout le reste du formulaire, stocké tel quel dans une colonne
  `champs_specifiques` (JSON, liste ordonnée de `{ label, valeur }`), affiché
  dynamiquement dans la fiche lead. Un nouveau formulaire ou une nouvelle question
  n'exige aucune modification du code.
- **Payload brut** : la donnée reçue telle quelle, conservée pour ne jamais rien perdre.

### 2.2 Hiérarchie Thématique > Site > Source
- **Thématique** : PV, PAC, mobil-home, marquage… Filtrer sur une thématique affiche
  **tous** ses leads, tous sites confondus.
- **Site** : un domaine. Certaines thématiques ont un site par région (PV et PAC : 13 sites
  chacun), les autres un seul site France entière. Le champ `region` du site est donc
  optionnel.
- **Source** : un canal d'entrée précis (un formulaire Tally, un numéro Allo, un import CSV).
  Chaque source a une URL de webhook unique, donc chaque lead arrive déjà rattaché à sa
  thématique et à son site.

### 2.3 Suivi partenaire par boutons "1 clic"
Les partenaires (artisans, constructeurs) ne se connecteront pas à un outil tous les jours.
Le suivi se fait donc **dans l'email** : chaque email de lead contient des boutons
("J'ai contacté le client", "Lead invalide", "Ouvrir mon espace"). Un clic met à jour le
statut sans connexion (lien signé). Le lead passe en "vu" au premier clic.
Ne pas se baser sur le pixel d'ouverture d'email (non fiable, bloqué par Apple Mail).

---

## 3. Sources de leads

### 3.1 Tally (formulaires sur les sites)
- Webhook natif Tally, un par formulaire, vers `POST /api/ingest/tally/[token]`.
- Vérifier la signature (en-tête `Tally-Signature`, HMAC SHA-256 avec le secret de la source).
- Mapping vers le socle commun :
  1. détection auto par type de champ (EMAIL, PHONE_NUMBER) et par label
     (nom, prénom, ville, code postal, besoin/projet/message) ;
  2. mapping manuel possible par source (écran de config) si la détection échoue.
- Tous les autres champs → `champs_specifiques` avec leur label d'origine.

### 3.2 Allo (réceptionniste IA, appels entrants)
- Webhook Allo, topic `CALL_RECEIVED`, un webhook par numéro Allo, vers
  `POST /api/ingest/allo/[token]`. Le numéro Allo est relié à une source (donc à un site
  et une thématique).
- Le webhook fournit : numéro de l'appelant, résumé IA, transcription, lien de
  l'enregistrement.
- **Extraction** : appel à l'API Anthropic (modèle Haiku, rapide et peu cher) sur le résumé
  + transcription pour extraire le socle commun en JSON (nom, email, ville, besoin) et
  classer l'appel : `lead`, `non_lead` (démarchage, erreur, client existant),
  `incomplet`. Le téléphone vient directement du webhook.
- Si l'extraction échoue ou est incomplète : statut `a_completer`, jamais de perte.
- Dans la fiche lead : afficher le résumé, la transcription (repliable) et un lecteur audio.

### 3.3 Leadrs (sites PV et PAC régionaux, sauf PV Normandie)
Les formulaires de ces 25 sites (12 PV + 13 PAC) sont des iframes fournies par Leadrs : les leads partent
directement chez Leadrs, APV ne reçoit pas les données individuelles. On ne crée donc
**pas** de leads individuels pour ces sites. On suit leurs **chiffres agrégés** :
- Table `stats_externes` (voir section 5) : une ligne par site et par période
  (semaine ou mois), avec nombre de leads, nombre de leads validés et CA versé par Leadrs.
- Saisie manuelle rapide (écran "Stats Leadrs" : un tableau des 25 sites, une ligne par
  site, on remplit les colonnes de la période) + import CSV si l'espace Leadrs permet
  un export.
- Dans les analytics, ces volumes sont affichés **à part** ("Leads Leadrs"), jamais
  mélangés au total des leads gérés en direct, avec une option "inclure Leadrs" dans
  les totaux par thématique.
- Indicateur clé : **CA par lead** Leadrs vs partenaire direct (ex. PV Normandie).
  Sert à décider s'il vaut mieux sortir d'autres régions de Leadrs.
- L'alerte "site silencieux" fonctionne sur ces sites à partir des stats saisies
  (aucun lead sur une période complète).
- Si Leadrs propose plus tard un webhook ou une API, on ajoutera un type de source
  `leadrs` sans changer le reste.

### 3.4 Anciens leads et saisie manuelle
- **Import CSV générique** : upload → choix de la source/site → écran de mapping des
  colonnes vers le socle commun (colonnes restantes → champs spécifiques) → aperçu →
  import. La date d'origine du lead est conservée (`recu_le`), le dédoublonnage s'applique.
- **Saisie manuelle** : formulaire "Ajouter un lead" (lead reçu par téléphone direct, email…).

### 3.5 Webhook générique
`POST /api/ingest/generic/[token]` qui accepte un JSON simple, pour tout futur outil
(Make, n8n, autre formulaire).

---

## 4. Traitement à l'arrivée d'un lead

Dans l'ordre, pour chaque lead entrant :
1. Stocker le payload brut immédiatement.
2. Extraire le socle commun (mapping Tally, IA pour Allo, mapping CSV).
3. Normaliser : téléphone au format international (libphonenumber-js, défaut FR, BE
   selon le pays du site), email en minuscules, nom en casse propre.
4. Géolocaliser la ville : API gratuite `api-adresse.data.gouv.fr` (France) → code postal,
   département, région, coordonnées GPS. Pour la Belgique : champ pays + ville/CP sans
   géocodage en V1 (ou Nominatim si simple).
5. Dédoublonner : même téléphone normalisé OU même email, même thématique, sous 30 jours →
   statut `doublon`, lien vers le lead d'origine. Rien n'est supprimé, un admin peut
   annuler le marquage.
6. Attribuer (voir section 6).
7. Journaliser chaque étape dans `lead_events`.

---

## 5. Modèle de données (Supabase / Postgres)

Noms indicatifs, à affiner en migration.

**profils** — utilisateurs connectés
- id (= auth.users.id), nom, email, role (`admin` | `partenaire`), partenaire_id (nullable)

**thematiques**
- id, nom, slug, couleur (pastille dans l'interface), multi_sites (bool), actif

**sites**
- id, thematique_id, nom, domaine, pays (FR/BE), region (nullable), actif,
  alerte_silence_jours (nullable, sinon calcul automatique), created_at

**sources**
- id, site_id (nullable), thematique_id, type (`tally` | `allo` | `csv` | `manuel` |
  `generic`), nom, webhook_token (unique), webhook_secret, config (JSON : numéro Allo,
  mapping des champs…), dernier_lead_le, actif

**partenaires**
- id, raison_sociale, contact_nom, contact_email, emails_copie (liste), telephone, siret,
  adresse, site_web, notes (interne), actif, created_at
- modele (`abonnement` | `commission` | `achat_lead`)
- montant_abonnement_mensuel (ex. 400 €), taux_commission (ex. 10-15 %),
  prix_lead (ex. 20-30 €), delai_contestation_jours (défaut 7), date_debut

**attributions** — règles "quel partenaire reçoit quoi"
- id, partenaire_id, thematique_id, site_id (nullable = tous les sites de la thématique)
- type_zone : `france` | `regions` | `departements` | `rayon`
- zone_config (JSON) : `{ regions: [...] }`, `{ departements: [...] }` ou
  `{ centre: { ville, lat, lng }, rayon_km }`
- priorite, envoi_auto (bool), actif

**leads**
- id, created_at, recu_le (date réelle, importante pour les imports)
- source_id, site_id, thematique_id
- prenom, nom, email, telephone, ville, code_postal, departement, region, pays, lat, lng,
  besoin
- champs_specifiques (JSON), payload_brut (JSON)
- allo_resume, allo_transcription, allo_enregistrement_url
- statut (voir ci-dessous), doublon_de (lead_id)
- partenaire_id, attribue_le, envoye_le, vu_le
- montant_devis, montant_commission, prix_facture
- statut_facturation (`non_facturable` | `a_facturer` | `facture` | `paye` | `conteste`),
  motif_contestation
- notes_internes

Statuts d'un lead :
`nouveau` → `attribue` → `envoye` → `vu` → `contacte` → `devis_envoye` → `signe` | `perdu`
Hors parcours : `a_completer`, `hors_zone`, `doublon`, `invalide`, `non_lead`, `archive`.

**lead_events** — historique complet (la timeline de la fiche lead)
- id, lead_id, type (créé, attribué, email envoyé, clic partenaire, statut changé,
  relance envoyée, note…), auteur (admin, partenaire, système), details (JSON), created_at

**stats_externes** — chiffres agrégés des sites dont on ne reçoit pas les leads (Leadrs)
- id, site_id, plateforme (`leadrs`), periode_debut, periode_fin, nb_leads,
  nb_leads_valides, ca_verse, notes, saisi_par, created_at
- Contrainte d'unicité : (site_id, periode_debut, periode_fin)

**alertes**
- id, type (`site_silencieux` | `lead_non_traite` | `erreur_ingestion`), cible (site,
  lead, source), message, resolue, created_at

Index : leads(thematique_id, recu_le), leads(site_id, recu_le), leads(partenaire_id,
statut), leads(telephone), leads(email).

---

## 6. Attribution aux partenaires

- Pour chaque lead, chercher les règles `attributions` actives de sa thématique (et de son
  site si précisé), puis tester la zone :
  - `france` : toujours vrai ;
  - `regions` / `departements` : selon la géolocalisation du lead ;
  - `rayon` : distance à vol d'oiseau entre le lead et le centre ≤ rayon_km.
    Exemple : "1h30 de route autour de Lyon" ≈ 120 km à vol d'oiseau, valeur ajustable.
- Plusieurs règles valides → la priorité la plus haute gagne.
- Aucune règle valide → statut `hors_zone`. Ces leads alimentent la vue
  **"Leads non vendus"** (par thématique et département) : c'est la liste des zones où
  chercher de nouveaux partenaires.
- `envoi_auto` par règle :
  - `false` (défaut au démarrage) : le lead attend dans la boîte "À traiter", un admin
    vérifie et clique "Envoyer à [partenaire]". Permet de contrôler la qualité au début.
  - `true` : envoi immédiat de l'email.
- Réattribution manuelle possible à tout moment (depuis la fiche lead).

---

## 7. Emails et suivi partenaire (Resend + React Email)

Expéditeur : `leads@agence-apv.fr` (domaine à vérifier dans Resend : SPF, DKIM).

**Email "Nouveau lead"** au partenaire (+ emails en copie) :
- Objet : `Nouveau lead [Thématique] — [Ville]`
- Contenu : socle commun + champs spécifiques + résumé de l'appel si Allo.
- Boutons (liens signés, valables 60 jours, sans connexion) :
  "J'ai contacté le client" · "Lead invalide" (avec motif : faux numéro, hors zone,
  doublon, autre) · "Ouvrir mon espace" (phase 3).
- Premier clic = `vu_le` renseigné.

**Relances automatiques** (tâche planifiée toutes les heures, Vercel Cron ou pg_cron) :
- Lead `envoye` sans aucun clic après 48 h → relance au partenaire + alerte dashboard.
- Modèle `commission` : email de suivi à J+15 et J+30 : "Où en est ce projet ?" avec
  boutons Devis envoyé / Signé (saisie du montant du devis) / Perdu / Toujours en cours.
- Toutes les relances sont journalisées dans `lead_events`.

**Notifications admin** : email à Nico et Cyril pour chaque lead `a_completer`,
`hors_zone` et chaque alerte. Récap quotidien optionnel.

---

## 8. Facturation (suivi, pas de génération de factures)

Selon le modèle du partenaire :
- **Achat au lead** : un lead envoyé devient `a_facturer` à la fin du délai de contestation
  (7 jours par défaut) s'il n'a pas été déclaré invalide. Montant = prix_lead.
- **Commission** : devient `a_facturer` quand le lead passe `signe` avec un montant de
  devis. Montant = montant_devis × taux.
- **Abonnement** : montant fixe mensuel. Afficher quand même le nombre de leads reçus et
  le **coût par lead** pour le partenaire (argument de renouvellement).

Écran "Facturation" : récap par mois et par partenaire (nombre de leads, montant dû,
statut), bouton "marquer facturé / payé", export CSV.

---

## 9. Écrans

Navigation latérale : Vue d'ensemble · À traiter (badge) · Leads · Partenaires ·
Non vendus · Stats Leadrs · Facturation · Sites & sources · Import.

**9.1 Vue d'ensemble (analytics)**
- Sélecteur de période : 7 j · 15 j · 30 j · 3 mois · 6 mois · 12 mois · Tout.
- Filtres : thématique, site, source, partenaire, département.
- Cartes chiffres : leads reçus en direct (avec variation vs période précédente, ex. +12 %),
  leads Leadrs (affichés à part, depuis `stats_externes`),
  leads attribués, leads hors zone, leads en attente d'action partenaire,
  CA généré sur la période.
- Graphiques : courbe des leads (par jour ou semaine selon la période), barres par
  thématique (option "inclure Leadrs"), comparatif CA par lead Leadrs vs partenaires directs, répartition par source (Tally / Allo / import), top 10 sites.
- Bloc alertes actives.

**9.2 À traiter** — la boîte de réception quotidienne
Leads `nouveau` (envoi manuel), `a_completer`, `hors_zone`, doublons à vérifier.
Actions rapides en ligne : envoyer, réattribuer, marquer invalide.

**9.3 Leads**
- Tableau : date, thématique (pastille couleur), site, nom, ville/département, source,
  partenaire, statut, statut facturation.
- Recherche (nom, téléphone, email, ville), filtres combinables, tri, export CSV.
- Fiche lead (panneau latéral) : socle commun, champs spécifiques dynamiques, bloc Allo,
  timeline `lead_events`, actions (attribuer, envoyer/renvoyer, changer statut, note
  interne, marquer doublon/invalide).

**9.4 Partenaires**
- Liste : nom, thématiques, modèle, leads sur 30 j, taux de traitement, montant dû.
- Fiche : infos, modèle économique, règles de zone (édition), leads reçus, délai moyen
  avant 1er clic, taux de leads contestés, historique facturation.

**9.5 Non vendus** — leads `hors_zone` par thématique et département, export CSV
(pour la prospection de nouveaux partenaires).

**9.6 Sites & sources**
- Thématiques → sites → sources. Pour chaque source : URL de webhook (bouton copier),
  date du dernier lead, statut (vert / alerte silence), mapping des champs, bouton "tester".

**9.7 Import** — import CSV avec mapping (voir 3.4).

**9.7 bis Stats Leadrs** — tableau des 25 sites Leadrs, sélection de la période,
saisie en ligne (nb leads, nb validés, CA), import CSV, historique par site.

**9.8 Espace partenaire (phase 3)** — `/espace`
Connexion par lien magique (Supabase Auth, sans mot de passe). Ses leads uniquement,
mise à jour du statut, saisie du montant de devis, export CSV. Même charte APV.

---

## 10. Alertes

- **Site silencieux** : aucun lead depuis X jours. X = `alerte_silence_jours` du site, sinon
  calcul auto (2 × l'intervalle moyen entre leads sur 30 j, minimum 3 jours).
  Objectif : repérer un formulaire cassé.
- **Lead non traité** : 48 h sans action partenaire.
- **Erreur d'ingestion** : webhook reçu mais traitement en échec.

---

## 11. Données initiales (seed)

Thématiques et partenaires connus (modèle économique et tarifs **à renseigner dans
l'interface**, ne pas inventer) :

| Thématique | Sites | Partenaire | Zone |
|---|---|---|---|
| Panneaux solaires (PV) | 13 sites régionaux (dont panneaux-solaires-normandie.fr) | 12 sites en iframe Leadrs (stats agrégées) ; Normandie en direct → partenaire à renseigner | France |
| Pompe à chaleur (PAC) | 13 sites régionaux | Iframe Leadrs (stats agrégées) | France |
| Mobil-home (achat) | 1 site | Valero Loisirs | à confirmer |
| Marquage publicitaire | 1 site | Dekalco | Région Occitanie |
| Maison container | maison-containeur-france.fr | Ma Construction Container | Rayon ~120 km autour de Lyon |
| Tiny house | tiny-house-france.com | La Tiny House | France |
| Panneaux solaires Belgique | panneaux-solaires-belgique.com | à renseigner | Belgique |
| Façade | à confirmer | à confirmer | Toulouse / Haute-Garonne |

Les domaines manquants, partenaires, modèles économiques et tarifs seront saisis par
les admins dans l'interface : prévoir des formulaires d'édition simples partout.

---

## 12. Plan de réalisation

**Phase 0 — Mise en place**
Projet Next.js, Supabase (via MCP), Tailwind + shadcn avec la charte APV, Montserrat,
layout avec navigation, connexion admin par lien magique, déploiement Vercel.
*Terminé quand* : Nico et Cyril se connectent sur l'URL Vercel et voient le layout vide.

**Phase 1 — Leads et analytics**
Migrations (toutes les tables), seed, écran Sites & sources, webhooks Tally / Allo /
générique, traitement complet (section 4), import CSV, saisie manuelle, écran Stats Leadrs, écran Leads + fiche,
écran À traiter, Vue d'ensemble.
*Terminé quand* : un envoi de test Tally et un appel test Allo créent un lead complet,
un CSV d'anciens leads s'importe avec ses dates, et les chiffres de la vue d'ensemble
correspondent à la liste filtrée.

**Phase 2 — Partenaires, attribution, suivi**
Écran Partenaires + règles de zone, moteur d'attribution, écran Non vendus, emails Resend
avec boutons 1 clic, relances, alertes (tâche planifiée).
*Terminé quand* : un lead test à Toulouse part automatiquement chez le bon partenaire,
le clic sur "J'ai contacté" met à jour le statut, et un lead à Lille pour le marquage
tombe en Non vendus.

**Phase 3 — Espace partenaire et facturation**
Rôle partenaire + RLS, espace `/espace`, écran Facturation, exports.
*Terminé quand* : un compte partenaire test ne voit que ses leads (vérifié côté base),
et le récap mensuel calcule correctement les 3 modèles.

---

## 13. Variables d'environnement

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=leads@agence-apv.fr
ANTHROPIC_API_KEY=
ALLO_API_KEY=
LINK_SIGNING_SECRET=        # signature des liens 1 clic
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://app.agence-apv.fr
ADMIN_EMAILS=               # emails de Nico et Cyril
```

## 14. Hors périmètre V1
Suivi UTM / origine des campagnes, génération de factures PDF, carte géographique,
application mobile, intégration directe avec l'API Leadrs.
