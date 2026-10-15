# CLAUDE.md — Jaay

Ce fichier est lu par Claude Code au début de chaque session. Il décrit le projet, la stack, les conventions et la façon de travailler. Les détails sont dans `docs/` :

- @docs/SPEC.md — cahier des charges validé (fonctionnalités, règles de gestion)
- @docs/DATA_MODEL.md — modèle de données, RLS, fonctions RPC
- @docs/DESIGN.md — identité visuelle, tokens, composants, écrans, responsive

En cas de doute entre ce fichier et `docs/`, `docs/` fait foi sur le métier, ce fichier fait foi sur la technique. En cas de contradiction réelle, demande avant de coder.

---

## 1. Le produit en bref

**Jaay** (« vendre » en wolof) est une app web (PWA) de gestion d'activité de **dépôt-vente de sacs** :

- Un fournisseur **confie** des sacs (lots) à une boutique, avec un prix fournisseur par lot.
- La boutique **vend** à un prix **libre et négocié** à chaque vente (particulier ou revendeur).
- La boutique **reverse** au fournisseur le prix fournisseur des sacs vendus (au fil des ventes ou en une fois) et lui **rend** les invendus.
- La boutique paie des **dépenses** (surtout la livraison pour récupérer ou rendre les sacs).

L'app est **multi-boutiques (SaaS)** dès le départ : chaque vendeur a sa boutique isolée, avec ses membres et leurs rôles (`owner`, `admin`, `manager`). Elle doit être **très belle, fluide et responsive** (téléphone, tablette, ordinateur), et utilisable par des personnes non techniques.

Utilisateurs principaux : la propriétaire de la boutique (usage quotidien sur iPhone), un administrateur (Android, ordinateur), plus tard des gérants.

---

## 2. Stack technique

| Couche | Choix |
| --- | --- |
| Framework | Next.js (dernière version stable), App Router, TypeScript strict |
| UI | Tailwind CSS + shadcn/ui (composants copiés dans `src/components/ui`) |
| Icônes | lucide-react |
| Animations | Motion (`motion/react`) |
| Formulaires | React Hook Form + Zod (`@hookform/resolvers`) |
| Données client | TanStack Query (cache, mutations optimistes) |
| Graphiques | Recharts |
| PWA | Serwist (`@serwist/next`) |
| Backend | Supabase : Postgres, Auth, Storage, RLS, fonctions RPC |
| Client Supabase | `@supabase/supabase-js` + `@supabase/ssr` |
| Tests | Vitest (unitaires), Playwright (e2e), pgTAP via `supabase test db` (base) |
| Qualité | ESLint, Prettier, `tsc --noEmit` |
| Déploiement | Vercel (front), Supabase Cloud (base) |
| Gestionnaire de paquets | pnpm |

N'ajoute pas d'autre dépendance sans le demander et sans expliquer pourquoi.

---

## 3. Commandes

```bash
pnpm install
pnpm dev                     # app sur http://localhost:3000
pnpm lint                    # ESLint
pnpm typecheck               # tsc --noEmit
pnpm test                    # Vitest
pnpm test:e2e                # Playwright
pnpm build                   # build de production

pnpm supabase migration new <nom>   # nouvelle migration SQL
pnpm db:push                         # = supabase db push (applique les migrations au projet dev en ligne)
pnpm db:seed                         # applique supabase/seed.sql au projet dev
pnpm db:types                        # = supabase gen types typescript --linked > src/lib/supabase/database.types.ts
pnpm db:test                         # = scripts/db-test.mjs : tests pgTAP de supabase/tests via supabase db query --linked (sans Docker)
```

Si un script `package.json` manque, crée-le avec ces noms.

**Pas de Docker, pas de base locale.** On travaille directement sur un projet Supabase en ligne dédié au développement (`jaay-dev`). La CLI Supabase est une dépendance de dev du projet (`pnpm add -D supabase`), utilisée via `pnpm supabase …`. Le projet est lié une fois avec `pnpm supabase link --project-ref <ref>` ; la CLI lit `SUPABASE_ACCESS_TOKEN` et `SUPABASE_DB_PASSWORD` dans l'environnement. Ne lance jamais `supabase start` ni `supabase db reset`. Si une commande `--linked` n'existe pas dans la version installée de la CLI, signale-le au lieu de chercher un contournement.

**`pnpm db:test` ne doit jamais être lancé sur le projet de production.** Les tests pgTAP s'exécutent sur le projet lié : ils créent des utilisateurs et des boutiques de test dans une transaction annulée, ce qui n'a sa place que sur `jaay-dev`. Avant de lancer `db:test`, vérifier que le projet lié (`supabase/.temp/project-ref`) est bien celui de développement.

**Dépôt** : https://github.com/BachirSylla/jaay.git (branche `main`).

---

## 4. Structure du projet

```
src/
  app/
    (public)/
      page.tsx                      # page d'accueil marketing minimale
      b/[slug]/page.tsx             # catalogue public d'une boutique
    (auth)/
      connexion/page.tsx
      inscription/page.tsx
    bienvenue/page.tsx              # création de la première boutique
    s/[shopSlug]/                   # espace d'une boutique (protégé)
      layout.tsx                    # AppShell : sidebar (≥1024px) / barre d'onglets (mobile)
      page.tsx                      # tableau de bord
      ventes/ , ventes/nouvelle/
      stock/ , modeles/[id]/
      receptions/ , receptions/nouvelle/
      retours/ , retours/nouveau/
      fournisseurs/ , fournisseurs/[id]/
      clients/ , clients/[id]/
      depenses/
      rapports/
      parametres/ , parametres/membres/
    manifest.ts, sw.ts              # PWA
  components/
    ui/                             # shadcn/ui
    layout/                         # AppShell, Sidebar, BottomNav, PageHeader
    shared/                         # Money, EmptyState, ProductThumb, ConfirmDialog…
  features/
    sales/        { components/, hooks.ts, schemas.ts, queries.ts }
    stock/        …
    receptions/   …
    returns/      …
    suppliers/    …
    customers/    …
    expenses/     …
    dashboard/    …
    catalog/      …
    shop/         …                 # boutique, membres, rôles
  lib/
    supabase/     { client.ts, server.ts, proxy.ts, admin.ts, env.ts, database.types.ts }
    format.ts                       # formatMoney, formatDate, formatQty
    permissions.ts                  # can(role, action)
    utils.ts
  messages/fr.ts                    # tous les textes de l'interface
  proxy.ts                          # (Next.js 16, ex-middleware.ts) rafraîchit la session, protège /s/*
supabase/
  migrations/                       # SQL versionné, une migration par sujet
  seed.sql                          # données de démo (boutique, fournisseur, modèles)
  tests/                            # tests pgTAP
docs/                               # SPEC, DATA_MODEL, DESIGN
```

Règle : le code d'un domaine reste dans `src/features/<domaine>`. Les pages de `src/app` sont fines : elles assemblent les composants de `features`.

---

## 5. Conventions de code

- **Langue** : code, noms de tables, colonnes, fonctions et variables en **anglais**. Textes de l'interface en **français**, centralisés dans `src/messages/fr.ts` (prépare une autre langue plus tard). Les segments d'URL visibles sont en français (`/ventes`, `/fournisseurs`).
- **TypeScript strict**, pas de `any`. Les types de la base viennent de `database.types.ts` (généré, jamais modifié à la main).
- **Montants** : entiers en FCFA (`number` côté TS, `bigint` côté SQL). Jamais de flottants, jamais de décimales. Affichage via `formatMoney(12500)` → `12 500 F` (séparateur espace insécable, suffixe `F`).
- **Dates** : `timestamptz` en base ; affichage avec `Intl.DateTimeFormat('fr-FR')`, fuseau `Africa/Dakar`.
- **Validation** : un schéma Zod par formulaire dans `features/<domaine>/schemas.ts`, réutilisé côté serveur quand il y a une Server Action.
- **Composants** : Server Components par défaut ; `'use client'` seulement pour l'interactivité. Pas de logique métier dans les composants.
- **Nommage** : composants `PascalCase.tsx`, hooks `useXxx`, fichiers utilitaires `kebab-case.ts`.
- **Accessibilité** : vrais `<button>`, `<a>`, `<label>` ; `aria-label` sur les boutons icône ; cibles tactiles ≥ 44 px ; contraste ≥ 4.5:1.
- **Pas de** `console.log` laissé, pas de code commenté mort, pas de TODO sans l'ajouter comme tâche dans la phase concernée (section 9).

---

## 6. Règles d'architecture (non négociables)

1. **Multi-boutiques** : toute table métier a `shop_id`. Toute requête filtre par la boutique active (`shopSlug` dans l'URL → `shop_id`). L'isolation est garantie par **RLS** côté base, jamais seulement par l'interface.
2. **Écritures sensibles uniquement par RPC** : réception, vente, retour, annulation, règlement fournisseur passent par des fonctions Postgres `security definer` (voir `docs/DATA_MODEL.md`). Le client n'écrit jamais directement dans `lots`, `sales`, `sale_items`, `sale_item_allocations`, `sale_payments`, `returns`, `return_items`, `supplier_payments`.
3. **FIFO** : une vente consomme les lots du plus ancien au plus récent ; le `unit_cost` du lot est figé sur l'affectation. Les lots sont verrouillés `for update` dans la transaction.
4. **Rien ne se supprime** : les opérations s'annulent (`status = 'cancelled'` + motif) ; les référentiels s'archivent (`archived_at`).
5. **Rôle `manager`** : ne lit jamais le prix fournisseur, la marge ni le solde fournisseur, et ne voit que ses propres ventes. C'est appliqué en base (RLS + fonctions), et l'interface masque en plus ces éléments via `lib/permissions.ts`.
6. **Clé `service_role`** : uniquement côté serveur, dans `lib/supabase/admin.ts`, pour la création de membres (`auth.admin.createUser`). Jamais exposée au navigateur, jamais en `NEXT_PUBLIC_`.
7. **Fonctions `security definer`** : toujours `set search_path = ''`, noms qualifiés (`public.lots`), et vérification explicite `has_shop_role(...)` en première instruction.
8. **Migrations** : une migration appliquée n'est jamais modifiée ; on en crée une nouvelle. Après chaque migration : `pnpm db:push`, `pnpm db:types`, `pnpm db:test`. Montre-moi le SQL avant le `db:push`.
9. **Évolutivité prévue** (ne pas implémenter, ne pas bloquer) : crédit client (paiements séparés de la vente), plusieurs points de vente, achat ferme, abonnements SaaS. Voir `docs/DATA_MODEL.md` § Évolutivité.

---

## 7. Authentification et comptes

- Inscription **très simple** : un écran, nom + e-mail + mot de passe. Pas d'OTP, pas de SMS, pas de lien magique.
- Dans Supabase (projet cloud) : désactiver « Confirm email » pour que le compte soit utilisable immédiatement. Le documenter dans le README.
- Après inscription : redirection vers `/bienvenue` pour nommer la boutique (appel RPC `create_shop`), puis vers `/s/<slug>`.
- Création d'un membre par le propriétaire : Server Action → `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })` → insertion `shop_members` avec le rôle. Le membre se connecte tout de suite.
- Un utilisateur membre de plusieurs boutiques choisit la boutique dans un sélecteur (sidebar / menu « Plus »).
- `src/proxy.ts` (Next.js 16) rafraîchit la session (`@supabase/ssr`) et redirige vers `/connexion` toute route `/s/*` non authentifiée.

---

## 8. Design et expérience

Tout est détaillé dans `docs/DESIGN.md`. À retenir :

- Identité « atelier de maroquinerie » : fond pierre `#F2F2EF`, encre `#191714`, cartes espresso `#211A15`, accent cognac `#A85A24`, émeraude `#17694F` réservé à l'argent positif (marge, encaissé).
- Typo : **Bricolage Grotesque** (titres, montants) + **DM Sans** (texte), via `next/font/google`. Chiffres en `tabular-nums`.
- Tokens définis une seule fois en variables CSS (`src/app/globals.css`) et exposés à Tailwind. Thème clair **et** sombre.
- **Responsive** : téléphone < 768 px (barre d'onglets en bas + bouton central « + Vente »), tablette 768–1023 px (colonnes qui se replient), ordinateur ≥ 1024 px (sidebar fixe). Contenu limité à `max-width: 1600px`, centré.
- **Fluidité** : transitions de page et micro-interactions avec Motion (150–250 ms, `ease-out`), mises à jour optimistes, squelettes de chargement plutôt que spinners. Respecter `prefers-reduced-motion`.
- La **vente rapide** doit se faire en moins de 20 secondes : c'est l'écran le plus soigné de l'app.

---

## 9. Plan de réalisation (phases)

Travaille **phase par phase**, dans l'ordre. Au début de chaque phase : propose un plan court (fichiers, migrations, composants), attends la validation, puis code. À la fin : liste ce qui a été fait et coche la phase ici.

- [x] **Phase 0 — Socle** : projet Next.js, Tailwind, shadcn/ui, polices, tokens clair/sombre, CLI Supabase liée au projet dev en ligne, clients Supabase (browser/server/admin), ESLint/Prettier/Vitest/Playwright, `src/messages/fr.ts`, `formatMoney`, page de démo des composants de base.
- [ ] **Phase 1 — Comptes et boutiques** : migrations `profiles`, `shops`, `shop_members`, fonctions `is_shop_member`, `has_shop_role`, RPC `create_shop` ; pages connexion, inscription, bienvenue ; AppShell responsive (sidebar + barre d'onglets) ; gestion des membres ; tests pgTAP d'isolation entre boutiques.
- [ ] **Phase 2 — Référentiels** : fournisseurs, catégories (par défaut), modèles (+ photos dans Storage, compressées en WebP côté client), clients ; listes, fiches, formulaires, archivage.
- [ ] **Phase 3 — Stock** : `receptions`, `lots`, RPC `create_reception` / `cancel_reception`, `get_stock` ; écran Stock (grille de cartes, filtres, alerte stock bas) ; écran Nouvelle réception.
- [ ] **Phase 4 — Ventes** : `sales`, `sale_items`, `sale_item_allocations`, `sale_payments`, RPC `create_sale` (FIFO) / `cancel_sale` ; écran Nouvelle vente (particulier/revendeur, prix libre, canal, paiement simple ou divisé) ; liste et détail des ventes ; reçu partageable WhatsApp. Tests pgTAP FIFO complets.
- [ ] **Phase 5 — Retours, règlements, dépenses** : RPC `create_return` / `cancel_return`, `create_supplier_payment` / `cancel_supplier_payment` ; dépenses ; fiche fournisseur avec solde, lots en dépôt, historique.
- [ ] **Phase 6 — Tableau de bord et rapports** : RPC `get_dashboard` (sans coûts pour `manager`) ; tableau de bord mobile et ordinateur ; rapports par période ; export CSV.
- [ ] **Phase 7 — Catalogue public** : `/b/[slug]` rendu serveur, métadonnées Open Graph (aperçu WhatsApp soigné), prix affiché ou « prix sur demande » selon la boutique, bouton « Commander sur WhatsApp » avec message pré-rempli ; partage d'un modèle.
- [ ] **Phase 8 — Finitions** : PWA (manifest, icônes, écran de démarrage, installation iOS/Android), performance (premier affichage < 2 s en 4G), accessibilité, mode sombre vérifié, e2e Playwright du parcours vente, déploiement Vercel + Supabase Cloud, README.

---

## 10. Définition de « terminé »

Une tâche n'est terminée que si :

1. `pnpm lint`, `pnpm typecheck` et `pnpm test` passent ; `pnpm db:test` passe si la base a changé.
2. Les types Supabase sont régénérés après toute migration.
3. L'écran est vérifié à 375 px, 768 px et 1280 px, en clair et en sombre.
4. Les textes sont dans `src/messages/fr.ts`, les montants passent par `formatMoney`.
5. Les droits par rôle sont respectés côté base **et** côté interface.
6. Aucun secret dans le code ; `.env.example` à jour.

---

## 11. Variables d'environnement

Les valeurs réelles vont dans `.env.local` (jamais versionné) ; `.env.example` contient les mêmes noms, vides. Aucune clé n'est écrite dans ce fichier ni dans `docs/`.

```
# Lues par l'app
NEXT_PUBLIC_SUPABASE_URL=                 # https://<ref>.supabase.co — public
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # sb_publishable_… (ou ancienne clé anon) — public
SUPABASE_SECRET_KEY=                      # sb_secret_… (ou ancienne service_role) — SECRET, serveur uniquement
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Lues par la CLI Supabase uniquement
SUPABASE_ACCESS_TOKEN=                    # sbp_… jeton personnel — SECRET
SUPABASE_DB_PASSWORD=                     # mot de passe de la base — SECRET
SUPABASE_PROJECT_REF=                     # identifiant du projet — public
```

Sur Vercel, seules les 4 premières variables sont nécessaires.

---

## 12. Façon de travailler avec moi

- Je suis développeur (Spring Boot / Angular au quotidien) : explique les choix propres à React/Next.js quand ils ne sont pas évidents, sans détailler le reste.
- Réponds-moi en **français**.
- Avant une modification importante (schéma, architecture, nouvelle dépendance), propose et attends mon accord.
- Petits commits cohérents, messages en anglais au format Conventional Commits (`feat(sales): add FIFO allocation in create_sale`).
- Si une règle métier de `docs/SPEC.md` est ambiguë, pose la question au lieu de deviner.