# Jaay

Gestion d'activité de **dépôt-vente de sacs** : stock confié par les fournisseurs, ventes au prix négocié, dû au fournisseur, retours, dépenses, bénéfice net et catalogue public partageable sur WhatsApp. Application web installable (PWA), multi-boutiques, en français.

- Spécification : [`docs/SPEC.md`](docs/SPEC.md) · Modèle de données : [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) · Design : [`docs/DESIGN.md`](docs/DESIGN.md)
- Décisions prises pendant la réalisation : [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Bilan, limites et mise en production : [`docs/RAPPORT.md`](docs/RAPPORT.md)

## Stack

Next.js 16 (App Router, `cacheComponents`, TypeScript strict) · Tailwind CSS 4 + shadcn/ui · Motion · React Hook Form + Zod · Recharts · Supabase (Postgres, Auth, Storage, RLS, fonctions RPC) · Vitest · Playwright · pgTAP · pnpm.

## Démarrer

Prérequis : Node 22, pnpm 11. **Pas de Docker** : on travaille sur un projet Supabase en ligne dédié au développement.

```bash
cp .env.example .env.local     # puis remplir les valeurs (voir ci-dessous)
pnpm install
pnpm supabase link --project-ref <ref-du-projet-de-dev>
pnpm db:push                   # applique les migrations au projet lié
pnpm db:types                  # régénère src/lib/supabase/database.types.ts
pnpm dev                       # http://localhost:3000
```

Pour essayer avec des données réalistes : `DEMO_EMAIL=… DEMO_PASSWORD=… pnpm db:seed` crée un compte et une boutique de démonstration (fournisseurs, modèles, réceptions, ventes, règlement, retour, dépenses).

### Variables d'environnement

| Variable                                                                | Rôle                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                              | URL du projet Supabase (publique)                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                                  | Clé publique (`sb_publishable_…`)                                                  |
| `SUPABASE_SECRET_KEY`                                                   | Clé secrète (`sb_secret_…`), **serveur uniquement** : création des comptes membres |
| `NEXT_PUBLIC_SITE_URL`                                                  | URL publique de l'app (liens du catalogue, aperçus)                                |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` | CLI Supabase uniquement                                                            |
| `DEMO_EMAIL`, `DEMO_PASSWORD`                                           | Facultatif : compte créé par `pnpm db:seed`                                        |

`.env.local` n'est jamais versionné.

### Réglage obligatoire dans Supabase

**Authentication → Providers → Email : désactiver « Confirm email »**, pour qu'un compte soit utilisable dès l'inscription (aucun e-mail n'est envoyé par l'app). Renseigner aussi **Site URL** avec l'URL de l'app.

## Commandes

| Commande                                       | Effet                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Développement, build et serveur de production                                                               |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint, TypeScript, Prettier                                                                                |
| `pnpm test`                                    | Tests unitaires (Vitest)                                                                                    |
| `pnpm test:e2e`                                | Tests de bout en bout (Playwright, sur le projet de dev ; les comptes `jaay-e2e-*` sont supprimés à la fin) |
| `pnpm supabase migration new <nom>`            | Nouvelle migration SQL                                                                                      |
| `pnpm db:push` · `pnpm db:types`               | Appliquer les migrations · régénérer les types                                                              |
| `pnpm db:test`                                 | Tests pgTAP sur le projet lié (refuse de tourner hors du projet de dev)                                     |
| `pnpm db:seed`                                 | Compte et boutique de démonstration (projet de dev uniquement)                                              |

À la demande :

```bash
SCREENS=1 pnpm exec playwright test screens --project=desktop   # captures 375/768/1280, clair et sombre
pnpm build && pnpm start -p 3100                                   # puis, dans un autre terminal :
PERF=1 PERF_URL=http://localhost:3100 pnpm exec playwright test perf --project=mobile
```

**Ne jamais lancer `pnpm db:test` ni `pnpm db:seed` sur le projet de production.** Les deux scripts vérifient le projet lié et refusent de tourner ailleurs que sur le projet de dev.

## Organisation du code

```
src/app/              pages (fines) : (auth), (public)/b/[slug], s/[shopSlug]/…, manifest, icônes
src/features/<domaine> composants, requêtes serveur, Server Actions, schémas Zod
src/components/       ui (shadcn/ui adaptés), layout (AppShell…), shared (Money, PriceInput…)
src/lib/              format, permissions, supabase (client, server, admin, public, proxy)…
src/messages/fr.ts    tous les textes de l'interface
supabase/migrations   SQL versionné (tables, RLS, fonctions RPC)
supabase/tests        tests pgTAP
e2e/                  tests Playwright, données de démonstration
scripts/              db-test (pgTAP sans Docker), seed-demo, with-env
```

Règles d'architecture : toute table métier a `shop_id` et l'isolation est garantie par RLS ; les écritures sensibles (réceptions, ventes, retours, annulations, règlements) passent uniquement par des fonctions Postgres `security definer` ; rien ne se supprime (annulation avec motif, archivage) ; le rôle `manager` ne reçoit jamais de coût, de marge ni de solde fournisseur.
