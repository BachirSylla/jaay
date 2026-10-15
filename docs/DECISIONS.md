# Décisions — Jaay

Journal des décisions prises pendant la réalisation. Chaque entrée : date, phase, décision, raison, écart éventuel à `SPEC.md`, `DATA_MODEL.md` ou `DESIGN.md`.

| Date | Phase | Décision | Raison | Écart |
| --- | --- | --- | --- | --- |
| 2026-10-15 | 0 | Next.js 16.4 avec `cacheComponents` (gabarit par défaut) et `src/proxy.ts` (ex-`middleware.ts`). | Version stable actuelle ; le nom `middleware` est déprécié. | CLAUDE.md mis à jour. |
| 2026-10-15 | 0 | Pas de Docker ni de base locale : CLI Supabase en dépendance de dev, liée au projet `jaay-dev`. Les commandes CLI lisent `.env.local` via `scripts/with-env.mjs`. | Choix du propriétaire du projet. | — |
| 2026-10-15 | 0 | `--whatsapp` passe de `#1F8A54` à `#1E8752`. | `#1F8A54` donne 4.36:1 avec du blanc, sous le seuil de 4.5:1. | DESIGN §2 (mis à jour). |
| 2026-10-15 | 0 | Nouveau token `--on-cognac` : blanc en clair, `#12100E` en sombre. | Blanc sur le cognac sombre `#C8783A` = 3.4:1. | DESIGN §2 (ajouté). |
| 2026-10-15 | 0 | Classes Tailwind : `text-muted-foreground` = `--muted` (texte secondaire), `bg-muted` = `--surface-muted`. | Convention shadcn/ui ; sinon les composants shadcn s'affichent mal. | DESIGN §2 (note ajoutée). |
| 2026-10-15 | 0 | Utilitaire `cn` = paquet `cn` (shadcn-ui), au lieu de `clsx` + `tailwind-merge`. | Recommandé par la doc d'installation de shadcn ; publié par shadcn. | — |
| 2026-10-15 | 0 | `/demo` renvoie 404 en production. | Page d'outillage, pas destinée aux utilisateurs. | — |
| 2026-10-15 | 1 | `create_shop(p_name, p_whatsapp_phone default null, p_slug default null)` : slug généré en base (`unaccent`, `[a-z0-9-]`, 40 caractères), suffixes `-2`, `-3`… arbitrés par la contrainte `unique`, slugs réservés, slug figé après création. | Unicité garantie même en cas de créations simultanées ; les liens partagés ne cassent pas. | DATA_MODEL §6 : `p_slug` optionnel et en 3e position. |
| 2026-10-15 | 1 | `profiles.email` (copie de `auth.users.email`, synchronisée par trigger, non modifiable par l'utilisateur). | Afficher l'e-mail des membres sans lire `auth.users` avec la clé secrète. | DATA_MODEL §3.1 : colonne ajoutée. |
| 2026-10-15 | 1 | Privilèges par colonne : `profiles` (update `full_name`, `phone`), `shops` (update `name`, `whatsapp_phone`, `show_public_prices`, `catalog_enabled`, `logo_path`), `shop_members` (update `role`). | RLS filtre les lignes, pas les colonnes : empêche de se donner `is_platform_admin`, de modifier `slug` ou `next_sale_number`. | — |
| 2026-10-15 | 1 | Un seul `owner` par boutique (index unique partiel) ; personne ne crée, ne modifie ni ne retire le owner depuis le client. | SPEC §3 : l'admin ne peut pas retirer le propriétaire. | — |
| 2026-10-15 | 1 | `shops.whatsapp_phone` au format E.164 (`+221771234567`), contrôlé en base ; le formulaire convertit les saisies locales. | Liens `wa.me` fiables. | DATA_MODEL : contrainte ajoutée. |
| 2026-10-15 | 1 | `shops.created_by` : `on delete set null`. | Ne pas bloquer la suppression d'un compte. | DATA_MODEL : précision. |
| 2026-10-15 | 1 | Membre dont l'e-mail a déjà un compte : rattaché à la boutique avec le rôle choisi, sans toucher à son mot de passe ; recherche via `find_user_id_by_email` réservée à `service_role`. Refus si déjà membre. En cas d'échec, le compte n'est supprimé que s'il a été créé dans le même appel. | Décision du propriétaire du projet. | DATA_MODEL §6 : fonction ajoutée. |
| 2026-10-15 | 1 | Catégories par défaut ajoutées à `create_shop` en phase 2 (table créée en phase 2). | La table `categories` n'existe pas en phase 1. | — |
| 2026-10-15 | 1 | `pnpm db:test` = `scripts/db-test.mjs` : chaque fichier pgTAP passe par `supabase db query --linked`, les sorties TAP sont collectées dans une table temporaire et renvoyées par la dernière requête ; échec si `not ok`, diagnostic de `finish()`, nombre de tests ≠ plan, ou erreur SQL. Refuse de tourner si le projet lié n'est pas `jaay-dev`. Vérifié avec un canari et des plans faux. | `supabase test db --linked` exige Docker (image `pg_prove`). | CLAUDE.md §3 : commande `db:test` adaptée. |
