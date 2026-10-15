# Rapport de réalisation — Jaay

Version du 16 octobre 2026. Les phases 0 à 8 de `CLAUDE.md` sont réalisées, sauf la mise en production elle-même : la section 6 en décrit la procédure. Le code est sur `main` (https://github.com/BachirSylla/jaay), la base est en place sur le projet Supabase de développement `jaay-dev` (`bixrtirfupirfbljsszu`).

Documents liés : [`SPEC.md`](SPEC.md), [`DATA_MODEL.md`](DATA_MODEL.md), [`DESIGN.md`](DESIGN.md), [`DECISIONS.md`](DECISIONS.md) (journal détaillé de toutes les décisions, phase par phase).

---

## 1. Ce qui est livré, écran par écran

Les montants sont en FCFA entiers (`12 500 F`), les dates en heure de Dakar, et tous les textes viennent de `src/messages/fr.ts`. Chaque écran fonctionne à 375, 768 et 1280 px, en clair et en sombre. Les droits sont appliqués en base (RLS et fonctions) **et** masqués dans l'interface.

### Accès et compte

| Écran | Contenu |
| --- | --- |
| **Accueil public** `/` | Accroche, liens « Créer mon compte » et « Se connecter ». |
| **Inscription** `/inscription` | Maquette 6 : nom, e-mail, mot de passe (8 caractères minimum), sans e-mail de confirmation, puis redirection vers `/bienvenue`. |
| **Connexion** `/connexion` | Ouvre la dernière boutique utilisée, sinon la première, sinon `/bienvenue`. Prend en compte `?next=` (chemins internes uniquement). |
| **Bienvenue** `/bienvenue` | Création d'une boutique : nom, WhatsApp facultatif, aperçu en direct du lien public. Sert aussi à créer une boutique supplémentaire. |
| **Hors ligne** `/hors-ligne` | Servie par le service worker quand une navigation échoue sans réseau. |

### Espace boutique `/s/<slug>`

AppShell responsive :
- sidebar espresso à partir de 1024 px ;
- sidebar repliée en icônes entre 768 et 1023 px ;
- barre d'onglets en bas sur téléphone (Accueil, Stock, « + Vente » central, Clients, Plus) ;
- sélecteur de boutique, menu « Plus », transitions de page, squelettes de chargement.

Une boutique inconnue, ou dont l'utilisateur n'est pas membre, donne une page introuvable.

| Écran | Contenu | Gérant |
| --- | --- | --- |
| **Tableau de bord** | Périodes Aujourd'hui / Semaine / Mois. Sur téléphone, carte espresso « Bénéfice net » avec Ventes, Marge et Dépenses. Sur ordinateur, 4 indicateurs. Dû aux fournisseurs, graphique des ventes des 7 derniers jours (meilleur jour en cognac), dernières ventes avec marge, encaissements par mode, stock à surveiller. | Chiffre d'affaires, sacs et ventes **de ses propres ventes** ; ni bénéfice, ni marge, ni dépenses, ni dû fournisseur. |
| **Nouvelle vente** | Maquette 2, l'écran le plus soigné : Particulier / Revendeur (prix pré-remplis adaptés), client recherché ou créé à la volée (sinon « client de passage »), lignes avec stepper limité au stock et prix libre, alerte « sous le prix fournisseur », canal, paiement simple ou divisé en deux, date et note, pied fixe « Encaisser 24 500 F ». Coche animée, toast, retour au tableau de bord. Brouillon conservé sur l'appareil en cas de coupure. | Oui, sans marge ni alerte de coût. |
| **Ventes** | Liste par jour, filtre de période, totaux, marge par vente. | Ses ventes uniquement. |
| **Fiche vente** | Lignes, coût et marge (propriétaire), paiements, client, vendeur. **Partager le reçu** : image PNG via la feuille de partage du téléphone (WhatsApp), sinon téléchargement et WhatsApp avec le reçu en texte. Annulation avec motif. | Pas d'annulation. |
| **Stock** | Grille de cartes avec quantités, badge « Stock bas » ou « Épuisé », recherche sans accents, filtres par catégorie et « Stock bas », boutons « Partager » (catalogue), « Réception » et « Nouveau modèle ». | Lecture seule. |
| **Modèle** (fiche, création) | Photos (compression WebP dans le navigateur, photo principale, suppression), nom, catégorie, couleur (pastilles), prix conseillé et revendeur, seuil de stock bas, visibilité publique, archivage, partage. | Lecture seule. |
| **Réceptions** (liste, création, fiche) | Fournisseur, date, lignes (modèle, quantité, prix fournisseur pré-rempli avec le dernier coût), frais de livraison enregistrés en dépense ; fiche avec progression vendus / rendus / restants ; annulation refusée dès qu'un sac a été vendu ou rendu. | Peut saisir, sans jamais relire les coûts. |
| **Retours** (liste, création, fiche) | Fournisseur choisi, quantités pré-remplies avec le stock restant chez lui, frais de livraison, annulation. | Peut saisir, pas annuler. |
| **Fournisseurs** (liste, fiche) | Maquette 4 : solde dû (ou « Avance »), compteurs Confiés / Vendus / Rendus / En stock, « Régler » (solde avant et après, « Tout régler »), « Rendre les invendus », onglets « Lots en dépôt » et « Historique » (réceptions, retours, règlements annulables), WhatsApp, archivage. | Accès réservé. |
| **Clients** (liste, fiche) | Recherche, filtre Particulier / Revendeur, nombre d'achats et total dépensé, bouton WhatsApp ; fiche avec historique d'achats. | Oui, statistiques limitées à ses ventes. |
| **Dépenses** | Liste par période, totaux par catégorie, ajout (livraison, emballage, publicité, autre, fournisseur facultatif), annulation ; les frais de livraison liés suivent leur réception ou leur retour. | Ajout et lecture. |
| **Rapports** | Aujourd'hui / Semaine / Mois / Période libre ; bénéfice net, CA, marge, dépenses, sacs ; ventes par jour, meilleurs modèles, encaissements, canaux, soldes fournisseurs ; **export CSV** (ventes détaillées avec coût et marge, dépenses), au format Excel français. | Accès réservé. |
| **Paramètres** | Logo, nom, WhatsApp, lien du catalogue, affichage des prix, catalogue activé, catégories, thème. | Accès réservé. |
| **Membres** | Ajout d'un membre (compte créé avec un mot de passe provisoire, ou compte existant rattaché sans toucher à son mot de passe), changement de rôle, retrait ; le propriétaire est intouchable. | Accès réservé. |

### Catalogue public (sans connexion)

| Écran | Contenu |
| --- | --- |
| **Catalogue** `/b/<slug>` | Maquette 5 : en-tête espresso (logo, nom, « Nous écrire sur WhatsApp », « Partager le catalogue »), filtres par catégorie, modèles publics en stock avec prix ou « Prix sur demande », bouton « Commander » (message WhatsApp pré-rempli avec le modèle, le prix et le lien), « Propulsé par Jaay ». |
| **Modèle partagé** `/b/<slug>/<id>` | Photos, description, prix, « Commander sur WhatsApp », « Partager ce modèle ». |
| **Aperçus WhatsApp** | Images Open Graph générées : boutique avec 3 photos, ou modèle avec photo, nom et prix. |

### PWA

L'app est installable sur iOS et Android : manifest, icône « J » doré sur espresso, ouverture sur la dernière boutique, plein écran. Un bandeau signale les coupures réseau, et le service worker affiche une page « Pas de connexion » sans jamais mettre en cache les données de la boutique.

---

## 2. Base de données : migrations et fonctions

### Migrations (dans l'ordre, jamais modifiées après application)

| Migration | Contenu |
| --- | --- |
| `…131204_profiles` | Enum `shop_role`, `profiles` (créé et e-mail synchronisé par triggers sur `auth.users`), privilèges par colonne. |
| `…131206_shops_and_members` | `shops`, `shop_members` (un seul propriétaire), `is_shop_member`, `has_shop_role`, `shares_shop_with`, RLS. |
| `…131208_create_shop` | `create_shop`, `slugify` (avec `unaccent`), slugs réservés. |
| `…131210_member_lookup` | `find_user_id_by_email` (réservée à `service_role`). |
| `…143725_referentials` | `suppliers`, `categories`, `products`, `product_photos`, `customers` ; clés étrangères composites incluant `shop_id`. |
| `…143727_default_categories` | Catégories par défaut, ajoutées aux boutiques existantes ; `create_shop` mise à jour. |
| `…143729_product_photos_storage` | Bucket `product-photos` et ses règles d'accès. |
| `…151329_stock` | `receptions`, `lots`, `expenses` ; `create_reception`, `cancel_reception`, `get_stock`, `get_receptions`, `get_reception_lines`. |
| `…152542_sales` | `sales`, `sale_items`, `sale_item_allocations`, `sale_payments` ; `create_sale` (FIFO), `cancel_sale`, `get_customer_stats` ; verrouillage commun avec `cancel_reception`. |
| `…153938_returns_payments_expenses` | `returns`, `return_items`, `supplier_payments` ; `create_return`, `cancel_return`, `create_supplier_payment`, `cancel_supplier_payment`, `cancel_expense`, `get_supplier_balances`, `get_supplier_lots`, `get_supplier_stock`. |
| `…155805_dashboard` | `get_dashboard`, `get_daily_sales`. |
| `…161416_public_catalog` | `get_public_catalog` (accessible sans connexion), bucket `shop-logos`. |

### Fonctions RPC (toutes `security definer`, `search_path = ''`, rôle vérifié en premier)

| Écriture | Rôle | Lecture | Rôle |
| --- | --- | --- | --- |
| `create_shop` | connecté | `get_stock` | membres (sans coût) |
| `create_reception` | membres | `get_receptions`, `get_reception_lines` | membres (coûts `null` pour le gérant) |
| `cancel_reception` | owner/admin | `get_supplier_stock` | membres (sans coût) |
| `create_sale` | membres | `get_customer_stats` | membres (gérant : ses ventes) |
| `cancel_sale` | owner/admin | `get_supplier_balances`, `get_supplier_lots` | owner/admin |
| `create_return` | membres | `get_dashboard`, `get_daily_sales` | membres (sans coût pour le gérant) |
| `cancel_return` | owner/admin | `get_public_catalog` | anonyme |
| `create_supplier_payment`, `cancel_supplier_payment` | owner/admin | `find_user_id_by_email` | `service_role` |
| `cancel_expense` | owner/admin | | |

**FIFO.** Une vente consomme les lots du plus ancien au plus récent ; les lots sont verrouillés, et le coût du lot est figé sur l'affectation. Une vente impossible ne crée rien et ne consomme pas de numéro. `INSUFFICIENT_STOCK` indique le nombre de sacs réellement disponibles, ce qui permet d'afficher « Il ne reste que 2 sac(s) de … ».

---

## 3. Couverture de tests

| Niveau | Volume | Ce qui est couvert |
| --- | --- | --- |
| **pgTAP** (`pnpm db:test`) | **210 assertions**, 9 fichiers | Isolation entre boutiques sur toutes les tables ; règles des rôles (gérant sans `lots`, `sale_item_allocations` ni `supplier_payments`, et `FORBIDDEN` sur les soldes) ; le gérant ne lit que ses ventes ; **l'exemple FIFO de DATA_MODEL §6** (affectations, coûts 61 000 F, marge 35 000 F, solde, annulation qui ramène A et B à 10) ; stock insuffisant ; paiements ≠ total ; retour limité aux lots du fournisseur ; annulation de réception refusée après une vente ; écritures directes refusées ; catalogue public sans coût et sans prix si demandé ; soldes et avance ; tableau de bord du propriétaire et du gérant ; règles du Storage. |
| **Vitest** (`pnpm test`) | **61 tests**, 11 fichiers | `formatMoney` et dates, montants saisis, téléphones E.164, slugs, permissions, erreurs, estimation FIFO, périodes, pluriels, schémas. |
| **Playwright** (`pnpm test:e2e`) | **34 tests**, sur mobile et ordinateur | Inscription → boutique → membres (création et rattachement) ; droits du gérant ; 404 pour un non-membre ; fournisseurs, modèles avec photo, clients ; réceptions et annulation ; **parcours de vente complet** (vente rapide, revendeur, client créé à la volée, paiement divisé, reçu PNG, annulation) ; compte fournisseur, retour, dépenses ; tableau de bord et export CSV ; catalogue public, aperçus, prix masqués, logo ; installation PWA et vente qui survit à une coupure. |
| **À la demande** | Captures et performance | `screens` : 153 captures (25 écrans × 3 largeurs × 2 thèmes, plus le menu « Plus » et le reçu), avec contrôle de l'absence de défilement horizontal. `perf` : premier affichage sur build de production (voir ci-dessous). |

Comment ces tests sont exécutés :
- **pgTAP, sans Docker** : `supabase test db --linked` exige Docker. Le script `scripts/db-test.mjs` passe donc chaque fichier par `supabase db query --linked` et vérifie les sorties TAP. Sa capacité à détecter un échec a été prouvée avec une assertion volontairement fausse et avec des plans faux.
- **e2e** : les tests créent de vraies données sur le projet de dev (comptes `jaay-e2e-*`, boutiques `zz-*`), supprimées en fin de suite.

**Performance mesurée** (build de production servi en local, Chrome mobile, processeur ralenti 4 fois) :

| Page | 4G | 4G lente |
| --- | --- | --- |
| Connexion | 0,46 s | 0,86 s |
| Catalogue public | 0,44 s | 0,53 s |
| Tableau de bord | 0,93 s | 1,21 s |
| Nouvelle vente | 0,79 s | 0,72 s |

Les valeurs sont des LCP, c'est-à-dire l'affichage du plus grand élément. L'objectif de la SPEC est un premier affichage en moins de 2 s.

---

## 4. Écarts et décisions principales

Le détail, avec la raison de chaque choix, est dans [`DECISIONS.md`](DECISIONS.md). Aucune règle métier de SPEC.md n'a été modifiée. L'essentiel :

**Modèle de données**
- `create_shop(p_name, p_whatsapp_phone, p_slug)` : slug généré en base, unique et figé après création.
- Colonne `profiles.email` synchronisée.
- Rattachement d'un compte existant comme membre.
- Clés étrangères composites incluant `shop_id`, et privilèges par colonne (`slug`, `next_sale_number`, `shop_id`, `is_platform_admin`, `status` non modifiables par le client).
- Téléphones au format international.
- Une vente doit avoir un total positif.
- Annulation des dépenses par fonction RPC.
- Fonctions ajoutées : `get_supplier_stock`, `get_daily_sales`.

**Interface**
- Sidebar repliée sur tablette ; entrée « Rapports » ajoutée à la navigation.
- Marge estimée pendant la vente, réservée à la propriétaire.
- Reçu en image plutôt qu'en lien public.
- Catalogue mis en cache 60 secondes.

**Design**
- `--whatsapp` ajusté à `#1E8752` pour le contraste.
- Nouveaux tokens `--on-cognac` et `--danger-on-espresso`.
- Couleurs de paiement Orange Money et Espèces ajustées après validation du daltonisme et du contraste.
- Convention de nommage `muted`.
- Pas d'écrans de démarrage iOS dédiés.

**Technique**
- Next.js 16 : `cacheComponents` et `proxy.ts`.
- **TanStack Query non utilisé** : rendu serveur, Server Actions et `refresh()` suffisent.
- **Serwist remplacé** par un service worker écrit à la main : Serwist sous Turbopack demandait des dépendances hors stack.
- `pnpm db:test` sans Docker, et `pnpm db:seed` par script plutôt que `seed.sql`.

---

## 5. Ce qui reste à faire, limites connues

**À faire avant ou juste après l'ouverture**
1. **Mise en production** (section 6), non exécutée.
2. **Mot de passe oublié** : aucun parcours de réinitialisation, puisque l'app n'envoie pas d'e-mail. Aujourd'hui, la propriétaire ne peut que retirer puis recréer un membre. Il faudra soit activer un SMTP avec le parcours Supabase, soit ajouter une réinitialisation par la propriétaire, via une Server Action avec la clé secrète.
3. **Profil utilisateur** : il n'y a pas d'écran pour changer son nom, son téléphone ou son mot de passe. Un membre garde son mot de passe provisoire.
4. **Sauvegardes quotidiennes** (SPEC §6) : elles dépendent du plan Supabase (plan Pro pour les sauvegardes quotidiennes).

**Hors périmètre ou non implémenté**
- **Super-admin plateforme** (SPEC §3) : la colonne `is_platform_admin` existe, mais il n'y a ni écran ni fonction.
- **Suppression d'une boutique**, et retrait du propriétaire par lui-même.
- **Correction d'une dépense ou d'un règlement** : seule l'annulation existe, il faut ensuite ressaisir.
- **Rapports** : pas de comparaison avec la période précédente.
- **Photos** : ordre limité à « Photo principale ».
- **Brouillon hors ligne** : seule la vente est conservée sur l'appareil ; réception et retour ne le sont pas.

**Limites techniques**
- **Catalogue désactivé ou inconnu** : la page « introuvable » est renvoyée avec un statut HTTP 200 (accompagné de `noindex`), à cause du rendu partiel de Next 16.
- **Stock du catalogue public** : il est mis à jour en moins d'une minute après une vente.
- **Aperçus WhatsApp** : ils utilisent la copie JPEG des photos, qui n'existe que pour les photos envoyées depuis la phase 7.
- **Polices** : elles sont téléchargées depuis Google Fonts au moment du build, qui a donc besoin d'un accès réseau.
- **Accessibilité** : pas d'audit automatisé (axe n'est pas dans la stack). Les contrôles ont été faits à la main, et les contrastes calculés.
- **Performance** : mesurée en local, à refaire sur Vercel (spec `perf` avec `PERF_URL`).
- **Tests e2e** : ils tournent sur le serveur de dev ; à la première compilation d'une route, de rares lenteurs peuvent survenir (3 workers pour limiter ce risque).

**Prévu dans le modèle, non développé** : crédit client, plusieurs points de vente, achat ferme, abonnements SaaS, paiement en ligne (DATA_MODEL §8).

---

## 6. Passer en production

À réaliser par le propriétaire du projet. Aucune de ces étapes n'a été exécutée.

### 6.1 Projet Supabase de production

1. Créer un nouveau projet Supabase (ex. `jaay-prod`) dans la région la plus proche des utilisatrices : Europe de l'Ouest, par exemple `eu-west-3`, Paris. Conserver le mot de passe de la base.
2. **Auth → Providers → Email** :
   - fournisseur Email activé ;
   - **« Confirm email » désactivé** ;
   - longueur minimale du mot de passe : 8.
3. **Auth → URL Configuration** : **Site URL** = l'URL de production (ex. `https://jaay.app`), ajoutée aussi aux Redirect URLs.
4. **Plan** : le plan Pro est nécessaire pour les sauvegardes quotidiennes (SPEC §6).
5. **Migrations** : appliquer les migrations depuis une copie propre du dépôt :
   ```bash
   pnpm supabase link --project-ref <ref-prod>    # avec le jeton et le mot de passe de prod dans l'environnement
   pnpm db:push                                     # applique les 12 migrations (tables, RLS, RPC, buckets)
   pnpm supabase link --project-ref bixrtirfupirfbljsszu   # revenir immédiatement sur le projet de dev
   ```
   Ne **jamais** lancer `pnpm db:test` ni `pnpm db:seed` en production : les deux refusent de tourner hors du projet de dev.
6. Vérifier dans **Storage** que les buckets `product-photos` et `shop-logos` existent et sont publics. Les migrations les créent.
7. Récupérer dans **Project Settings → API** l'URL, la clé publishable et la clé secrète.

### 6.2 Vercel

1. Importer le dépôt GitHub `BachirSylla/jaay` :
   - framework Next.js ;
   - Node 22 ;
   - commande d'installation `pnpm install`, build `pnpm build` ;
   - région des fonctions proche de la base (ex. `cdg1`, Paris).
2. **Variables d'environnement** : seules ces 4 sont nécessaires sur Vercel.

   | Variable | Valeur | Portée |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref-prod>.supabase.co` | Production |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (prod) | Production |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` (prod), **secrète**, jamais préfixée `NEXT_PUBLIC_` | Production |
   | `NEXT_PUBLIC_SITE_URL` | `https://<domaine>` | Production |

   Les variables de la CLI (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`) ne vont **pas** sur Vercel.
3. Brancher le domaine. Si l'URL change, mettre à jour `NEXT_PUBLIC_SITE_URL` sur Vercel et la Site URL dans Supabase.
4. Les images viennent du Storage Supabase. `next.config.ts` autorise automatiquement l'hôte de `NEXT_PUBLIC_SUPABASE_URL`, aucun réglage supplémentaire n'est nécessaire.

### 6.3 Vérifications après déploiement

1. Créer un compte, nommer la boutique et vérifier l'arrivée sur le tableau de bord (ce qui confirme que « Confirm email » est bien désactivé).
2. Ajouter un membre gérant, s'y connecter et vérifier qu'aucun coût n'est visible.
3. Enchaîner fournisseur, modèle avec photo, réception, vente, reçu partagé, puis catalogue public.
4. Coller le lien du catalogue dans WhatsApp et vérifier l'aperçu (image, titre).
5. Installer l'app : sur iPhone, Safari puis Partager → « Sur l'écran d'accueil » ; sur Android, Chrome puis « Installer l'application ».
6. Mesurer la performance réelle : `PERF=1 PERF_URL=https://<domaine> pnpm exec playwright test perf --project=mobile`. Ce test crée un compte `jaay-e2e-*` et une boutique `zz-perf` à supprimer ensuite depuis le tableau Supabase, ou à lancer plutôt sur un déploiement de prévisualisation relié au projet de dev.
