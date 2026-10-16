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

## Sauvegardes

Le workflow [`.github/workflows/backup.yml`](.github/workflows/backup.yml) fait chaque dimanche à 2 h (heure de Dakar) un `pg_dump` de la base (schémas `public`, `auth` et `storage`), le **chiffre** (AES-256) et le garde **30 jours** en artefact GitHub. Il est **désactivé** tant que les réglages ci-dessous ne sont pas faits. Les fichiers des photos et logos restent dans Supabase Storage et ne sont pas dans la sauvegarde.

Le chiffrement est obligatoire : le dépôt est public, et les artefacts d'un dépôt public peuvent être téléchargés par n'importe quel compte GitHub. Passer le dépôt en privé reste recommandé (Settings → General → Danger Zone → Change visibility).

**Activer** (GitHub → dépôt → Settings → Secrets and variables → Actions) :

1. Onglet **Secrets**, « New repository secret » :
   - `SUPABASE_DB_URL` : Supabase → bouton **Connect** → **Session pooler** → l'URI `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres`, avec le mot de passe de la base à la place de `[YOUR-PASSWORD]`.
   - `BACKUP_PASSPHRASE` : une longue phrase de passe aléatoire (32 caractères ou plus). **La garder dans un gestionnaire de mots de passe** : sans elle, les sauvegardes sont illisibles.
2. Onglet **Variables**, « New repository variable » : `BACKUP_ENABLED` = `true`.
3. Onglet **Actions** → « Database backup » → **Run workflow** pour un premier essai, puis vérifier que l'artefact `jaay-backup-<date>` apparaît en bas du résumé.

Pour suspendre les sauvegardes : passer `BACKUP_ENABLED` à `false`.

**Restaurer** (sur un poste avec le client PostgreSQL 17 et `gpg`, fourni avec Git pour Windows) dans un projet Supabase **vide** dont les migrations ont été appliquées (`pnpm db:push`) :

```bash
gpg --decrypt jaay-2026-10-18.dump.gpg > jaay.dump      # demande la phrase de passe
pg_restore --data-only --no-owner -n auth -t users -t identities -f auth.sql jaay.dump
pg_restore --data-only --no-owner -n public -f public.sql jaay.dump
pg_restore --data-only --no-owner -n storage -t objects -f storage.sql jaay.dump
psql "<SUPABASE_DB_URL du projet cible>" --single-transaction -v ON_ERROR_STOP=1 \
  -c "set session_replication_role = replica" -f auth.sql -f public.sql -f storage.sql
```

`session_replication_role = replica` coupe les triggers pendant la restauration (le profil est restauré tel quel au lieu d'être recréé). Les photos sont à recopier séparément depuis l'ancien Storage. Faire un essai de restauration sur un projet jetable une fois les sauvegardes activées.

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
