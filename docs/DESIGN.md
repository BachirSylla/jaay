# Design — Jaay

Identité « atelier de maroquinerie » : la sobriété d'une boutique de cuir haut de gamme, la chaleur du cognac, et des chiffres toujours lisibles. Les maquettes de référence sont sur le canevas « Jaay — Maquettes » (claude.ai) ; ce fichier en est la traduction pour le code.

## 1. Principes

1. **Les chiffres d'abord** : montant clé en grand (Bricolage Grotesque, `tabular-nums`), détail en petit dessous.
2. **Une action principale par écran**, en cognac. Tout le reste est neutre.
3. **Le vert émeraude ne sert qu'à l'argent positif** (marge, encaissé, réglé). Le cognac sert à l'action et à la marque. Le rouge brique sert aux alertes (stock bas, marge négative).
4. **Cartes espresso** (fond sombre) réservées aux synthèses importantes : bénéfice net, solde fournisseur.
5. **Pensé pour une main** sur téléphone : actions en bas, cibles ≥ 44 px.
6. Pas d'emoji, pas de dégradés décoratifs, pas d'ombres lourdes.

## 2. Couleurs (tokens)

Définis en variables CSS dans `src/app/globals.css`, exposés à Tailwind (`bg-ground`, `text-ink`, `bg-cognac`…). Thème sombre via la classe `.dark` (et `prefers-color-scheme` par défaut).

Exception de nommage : `--muted` (texte secondaire) s'utilise via `text-muted-foreground`, car `bg-muted` désigne `--surface-muted` (convention shadcn/ui).

| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--ground` | `#F2F2EF` | `#12100E` | Fond de page |
| `--surface` | `#FFFFFF` | `#1C1916` | Cartes, barres |
| `--surface-muted` | `#E7E4DF` | `#262220` | Segments, champs secondaires |
| `--ink` | `#191714` | `#F2EDE7` | Texte principal |
| `--muted` | `#6B655E` | `#A9A097` | Texte secondaire |
| `--subtle` | `#8A847C` | `#7F776F` | Icônes inactives |
| `--line` | `#E3E0DA` | `#2E2824` | Bordures |
| `--line-soft` | `#EEEBE6` | `#25211E` | Séparateurs de liste |
| `--espresso` | `#211A15` | `#0B0907` | Cartes de synthèse, sidebar |
| `--espresso-ink` | `#F7F1EA` | `#F7F1EA` | Texte sur espresso |
| `--espresso-muted` | `#CDBFB0` | `#CDBFB0` | Texte secondaire sur espresso |
| `--gold` | `#F2C894` | `#F2C894` | Accent sur espresso (logo, devise) |
| `--cognac` | `#A85A24` | `#C8783A` | Action principale, marque |
| `--cognac-hover` | `#7E4119` | `#DA8C4C` | Survol |
| `--cognac-soft` | `#FFF9F4` | `#2A1E15` | Champ actif, sélection |
| `--cognac-tint` | `#F6E9DD` | `#33241A` | Pastille d'icône |
| `--emerald` | `#17694F` | `#4FB892` | Argent positif |
| `--emerald-soft` | `#E5F2EC` | `#15302A` | Fond émeraude |
| `--mint` | `#9FD8C2` | `#9FD8C2` | Positif sur espresso |
| `--danger` | `#9A3B12` | `#F08A5D` | Alerte |
| `--danger-soft` | `#FBE3D6` | `#3A1D12` | Fond alerte |
| `--on-cognac` | `#FFFFFF` | `#12100E` | Texte sur fond cognac (blanc sur `#C8783A` = 3.4:1, insuffisant) |

Couleurs fonctionnelles :

| Token | Valeur | Usage |
| --- | --- | --- |
| `--pay-wave` | `#1D7FC2` | Wave |
| `--pay-om` | `#D06F12` | Orange Money (ajusté : validé daltonisme et contraste, clair et sombre) |
| `--pay-cash` | `#2A9D6F` | Espèces (ajusté : `#17694F` trop peu saturé pour un graphique) |
| `--whatsapp` | `#1E8752` | Boutons WhatsApp (texte blanc, contraste ≥ 4.5:1) |

Vignettes de produits sans photo : fond de la couleur du sac (noir `#2A2521`, marron `#8A5530`, caramel `#C99A6B`, sable `#E2D3BE`, bleu nuit `#1F2A44`) avec une icône de sac en trait clair. Dès qu'une photo existe, elle remplace la vignette (`object-fit: cover`).

## 3. Typographie

Chargées avec `next/font/google` (variables `--font-display`, `--font-body`).

| Rôle | Police | Taille / graisse |
| --- | --- | --- |
| Montant héros | Bricolage Grotesque 700 | 38–42 px, `letter-spacing: -1px`, devise « F » en 50 % de la taille, couleur `--gold` sur espresso |
| Titre d'écran | Bricolage Grotesque 700 | 28 px mobile, 32 px ordinateur |
| Titre de section | Bricolage Grotesque 700 | 17–18 px |
| Montant de liste | Bricolage Grotesque 700 ou DM Sans 600 | 14–18 px |
| Corps | DM Sans 400/500 | 14–15 px |
| Libellé, méta | DM Sans 500/600 | 11–13 px |

Tous les montants : `font-variant-numeric: tabular-nums`. Format : `formatMoney(12500)` → `12 500 F`.

## 4. Formes, espacements, ombres

- Rayons : `10px` (petits boutons, segments), `14px` (champs, boutons), `18–20px` (cartes), `24px` (cartes héros), `28–30px` (bas de feuille, en-tête catalogue).
- Espacements : échelle de 4 px ; marges d'écran 20 px (mobile), 32–40 px (ordinateur) ; `gap` 10–18 px entre cartes.
- Bordures : 1 px `--line` sur les cartes claires ; champ actif : 1.5 px `--cognac` sur `--cognac-soft`.
- Ombres : seulement le bouton central « + Vente » (`0 10px 24px rgb(168 90 36 / 0.35)`) et le segment actif (`0 1px 2px rgb(25 23 20 / 0.08)`).

## 5. Mise en page et responsive

| Largeur | Navigation | Mise en page |
| --- | --- | --- |
| < 768 px (téléphone) | Barre d'onglets en bas : Accueil, Stock, **+ Vente** (bouton central cognac surélevé), Clients, Plus | Une colonne, marges 20 px |
| 768–1023 px (tablette) | Barre d'onglets ou sidebar repliée (icônes) | Grilles à 2 colonnes, colonne latérale du tableau de bord sous le contenu |
| ≥ 1024 px (ordinateur) | Sidebar espresso fixe (240–260 px) : logo, sélecteur de boutique, navigation complète | Contenu fluide, `max-width: 1600px` centré ; tableau de bord en 2 colonnes (2/3 + 1/3) |

Navigation complète (sidebar et menu « Plus ») : Tableau de bord, Ventes, Stock, Réceptions, Retours, Fournisseurs, Clients, Dépenses, Catalogue public, Paramètres. Les entrées financières sont masquées pour `manager`.

Tableaux larges : conteneur `overflow-x: auto` ; sur téléphone, les tableaux deviennent des listes de cartes.

## 6. Composants clés

- **Money** : affiche un montant formaté, tailles `sm | md | lg | hero`, variante `positive` (émeraude) / `negative` (danger).
- **StatCard** : libellé, montant, sous-ligne ; variante `espresso` pour la synthèse.
- **SegmentedControl** : fond `--surface-muted`, option active blanche avec ombre légère (périodes, type de client, onglets).
- **ChipGroup** : pilules 34 px ; active = fond `--ink`, texte blanc (canal, filtres).
- **PaymentPicker** : 3 tuiles (pastille de couleur + libellé) ; active = bordure 2 px cognac sur `--cognac-soft` ; lien « Diviser en deux » ouvre une 2e ligne.
- **QuantityStepper** : − / valeur / + ; le + en `--ink`.
- **PriceInput** : grand champ numérique (`inputmode="numeric"`), formatage à la volée, suffixe « F » cognac, indice « Conseillé 8 000 F » à côté ; marge négative → indice en `--danger`.
- **ProductThumb** : photo ou vignette couleur + icône.
- **ProductCard** : vignette 92–130 px, nom (ellipsis), stock, prix ; badge « Stock bas ».
- **StockBadge** : `--danger` sur `--danger-soft`.
- **BottomNav**, **Sidebar**, **PageHeader** (retour, titre, action).
- **EmptyState** : icône, phrase utile, action principale.
- **Skeleton** pour chaque liste et carte.
- **ConfirmDialog** avec saisie du motif (annulations).

## 7. Écrans de référence (maquettes)

1. **Accueil (téléphone)** : en-tête (logo « J », date, boutique, avatar) ; segment Aujourd'hui / Semaine / Mois ; carte espresso « Bénéfice net » + 3 mini-indicateurs (Ventes, Marge, Dépenses) ; carte « Dû au fournisseur » cliquable ; « Stock à surveiller » ; « Dernières ventes ».
2. **Nouvelle vente** : fermer, titre, numéro ; segment Particulier / Revendeur (change les prix pré-remplis) ; recherche client ; cartes de ligne (vignette, stock, stepper, champ prix + indice) ; « + Ajouter un modèle » ; canal ; paiement ; pied fixe avec nb de sacs, marge, total et bouton « Encaisser 24 500 F ».
3. **Stock** : titre + total, boutons Partager et « + Réception » ; recherche ; filtres ; grille 2 colonnes de cartes produits.
4. **Fiche fournisseur** : retour, nom, bouton WhatsApp ; carte espresso du solde dû, compteurs (Confiés, Vendus, Rendus, En stock), boutons « Régler » et « Rendre invendus » ; onglets « Lots en dépôt » (barre de progression du lot) / « Historique ».
5. **Catalogue public** : en-tête espresso arrondi en bas (logo, nom, accroche, bouton WhatsApp) ; grille de produits avec prix ou « Prix sur demande » et bouton « Commander » ; pied « Propulsé par Jaay ».
6. **Création de compte** : moitié haute espresso (logo Jaay doré, accroche « Votre dépôt-vente, enfin sous contrôle. »), feuille claire avec Nom, E-mail, Mot de passe, bouton « Créer mon compte », lien « Se connecter ».
7. **Tableau de bord (ordinateur)** : sidebar espresso ; en-tête (date, titre, segment de période, « + Nouvelle vente ») ; 4 indicateurs (le bénéfice net en espresso) ; graphique en barres des ventes de la semaine (meilleur jour en cognac) ; tableau des dernières ventes avec marge ; colonne droite : dû aux fournisseurs, encaissements par mode (barre empilée), stock bas.

## 8. Mouvement

- Transitions de page : fondu + translation 8 px, 200 ms `ease-out`.
- Apparition des listes : décalage de 30 ms par élément, maximum 8 éléments animés.
- Retour de pression : `scale(0.97)` au toucher des boutons et cartes.
- Validation d'une vente : coche animée + toast « Vente n° 43 enregistrée », puis retour à l'accueil avec le montant mis à jour (mise à jour optimiste).
- Changement de montant dans les indicateurs : interpolation des chiffres 400 ms.
- Tout est désactivé avec `prefers-reduced-motion: reduce`.

## 9. Ton des textes

Tutoiement évité, vouvoiement simple et chaleureux. Phrases courtes, verbes d'action : « Encaisser », « Régler », « Rendre les invendus », « Partager le catalogue ». Messages d'erreur utiles : « Il ne reste que 2 sacs de ce modèle. » plutôt que « Stock insuffisant ».

## 10. PWA

- Nom : « Jaay », nom court : « Jaay ».
- `theme_color` `#211A15`, `background_color` `#F2F2EF`.
- Icône : « J » doré `#F2C894` sur carré espresso arrondi ; versions 192, 512 et maskable ; `apple-touch-icon` 180.
- `display: standalone`, orientation portrait sur téléphone.
