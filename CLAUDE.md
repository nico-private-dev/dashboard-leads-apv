# CLAUDE.md — Dashboard Leads APV

Outil interne d'Agence APV pour centraliser les leads des sites de génération de leads,
gérer les partenaires acheteurs et suivre les analytics. Brief complet : `docs/BRIEF.md`.
Lis-le entièrement avant de coder, puis travaille phase par phase.

## Règles de travail
- Une phase à la fois. Avant chaque phase : propose un plan court, attends validation.
- À la fin de chaque phase : liste ce qui est fait, ce qui reste, et comment tester.
- Toute modif de base de données passe par une migration Supabase versionnée.
- Ne jamais supprimer un lead : on change son statut (invalide, doublon, archivé).
- Ne jamais perdre une donnée entrante : le payload brut est toujours stocké, même si le
  traitement échoue (le lead passe alors en statut `a_completer`).
- Interface 100 % en français. Dates au format français. Fuseau horaire : Europe/Paris
  pour tous les calculs de périodes (même si l'utilisateur est à l'étranger).
- Code en TypeScript strict. Validation des entrées avec Zod.

## Stack
Next.js (App Router) · TypeScript · Supabase (Postgres, Auth, RLS, Edge Functions ou routes API)
· Tailwind · shadcn/ui · Recharts · TanStack Table · Resend + React Email · libphonenumber-js
· API Anthropic (extraction des appels Allo) · Hébergement Vercel · Domaine : app.agence-apv.fr

## Charte APV
- Rouge APV `#C0504C` : boutons principaux, élément actif du menu, liens importants.
- Jaune APV `#FDCE41` : accents, badges, surlignage. Jamais en texte sur fond blanc
  (illisible) ; toujours en fond avec texte foncé.
- Fond de page blanc cassé `#FAF8F5`, cartes et tableaux en blanc `#FFFFFF`.
- Texte principal `#1F1F1F`, texte secondaire `#6B6B6B`, bordures `#E8E4DE`.
- Police : Montserrat (via next/font), 400 / 500 / 600 / 700.
- Style : sobre, dense, lisible. Coins arrondis 10-12px, ombres très légères.
- Responsive : la liste des leads et la fiche lead doivent être utilisables sur mobile.

## Sécurité
- RLS activée sur toutes les tables.
- Rôle `admin` (Nico, Cyril) : accès total.
- Rôle `partenaire` : uniquement ses leads, jamais le payload brut ni les données internes
  (prix, notes internes, autres partenaires).
- Webhooks : token unique par source dans l'URL + vérification de signature quand dispo.
- Secrets uniquement en variables d'environnement.

@AGENTS.md
