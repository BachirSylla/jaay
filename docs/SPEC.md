# Cahier des charges — Jaay

Version validée le 14 octobre 2026.

## 1. Contexte et objectifs

Jaay remplace le suivi informel d'une activité de vente de sacs en dépôt-vente par un outil simple, beau et rapide, utilisé au quotidien depuis un téléphone, une tablette ou un ordinateur.

Objectifs :

1. Savoir à tout moment combien de sacs de chaque modèle sont en stock confié.
2. Enregistrer une vente en moins de 20 secondes, avec un prix négocié libre.
3. Connaître en temps réel le montant dû au fournisseur, quel que soit le rythme des paiements.
4. Mesurer le bénéfice net (marge sur ventes moins dépenses) par période.
5. Partager le catalogue disponible sur WhatsApp et les réseaux sociaux en un clic.
6. Être une plateforme multi-boutiques, revendable à d'autres vendeurs ayant le même modèle d'activité.

## 2. Modèle d'activité : dépôt-vente

La boutique n'achète pas de stock : le fournisseur confie des sacs, la boutique les vend avec sa marge, lui reverse son prix pour chaque sac vendu et lui rend les invendus.

| Terme | Définition |
| --- | --- |
| Réception | Lot de sacs confié par un fournisseur, à une date, avec un prix fournisseur par modèle. |
| Lot | Une ligne de réception : un modèle, une quantité, un prix fournisseur unitaire. Unité de stock. |
| Vente | Sortie de sacs vers un client, au prix réellement négocié, payée immédiatement. |
| Retour | Invendus rendus au fournisseur ; ils ne coûtent rien à la boutique. |
| Règlement | Argent versé au fournisseur, partiel ou total. |
| Dépense | Frais de la boutique, d'abord la livraison pour récupérer ou rendre des sacs. |
| Solde fournisseur | Ce que la boutique doit encore au fournisseur. |

Le fournisseur est payé soit au fil des ventes, soit en une fois au retour des invendus : les deux cas coexistent.

## 3. Utilisateurs, rôles et multi-boutiques

Chaque vendeur a sa boutique isolée. Une boutique regroupe ses membres, fournisseurs, modèles, ventes et dépenses. Aucune donnée n'est visible d'une boutique à l'autre. Un utilisateur peut appartenir à plusieurs boutiques.

| Rôle | Peut faire |
| --- | --- |
| Propriétaire (`owner`) | Tout : paramètres, membres, prix fournisseur, règlements, rapports, annulations. |
| Administrateur (`admin`) | Comme le propriétaire, sauf supprimer la boutique ou retirer le propriétaire. |
| Gérant (`manager`) | Enregistrer ventes, réceptions, retours, dépenses ; gérer les clients ; voir le stock et **ses propres** ventes. Ne voit ni prix fournisseur, ni marge, ni solde fournisseur, ni rapports financiers. |
| Super-admin plateforme | Créer ou suspendre des boutiques, suivre l'usage. Pas d'accès aux données métier par défaut. |

Inscription : un nouveau vendeur crée son compte (un écran : nom, e-mail, mot de passe), puis nomme sa boutique et en devient propriétaire. Il crée lui-même les comptes de ses membres (nom, e-mail, mot de passe provisoire, rôle) ; le membre peut se connecter tout de suite.

## 4. Fonctionnalités MVP

1. **Authentification et boutique**
    - Inscription en un seul écran, sans OTP ni SMS ni validation d'e-mail. À la connexion, l'app s'adapte au rôle.
    - Création de boutique : nom, logo, devise (FCFA par défaut), numéro WhatsApp, affichage des prix dans le catalogue public (oui / non).
    - Gestion des membres et de leur rôle par le propriétaire.
2. **Fournisseurs** — liste, fiche (nom, téléphone, adresse, notes), solde dû en temps réel, historique (réceptions, ventes rattachées, retours, règlements). Plusieurs fournisseurs possibles.
3. **Modèles (catalogue)** — nom, catégorie, couleur, photos, description, prix de vente conseillé et prix revendeur conseillé (indicatifs), seuil de stock bas, visibilité publique, archivage.
4. **Réceptions** — fournisseur, date, lignes modèle + quantité + prix fournisseur unitaire ; frais de livraison optionnels enregistrés en dépense.
5. **Ventes**
    - Vente rapide : choisir les modèles, ajuster quantité et prix, choisir le mode de paiement.
    - Prix pré-rempli (conseillé ou revendeur selon le type de client), toujours modifiable.
    - Client : choisi dans le fichier clients ou créé à la volée ; vente anonyme possible.
    - Canal : WhatsApp, Instagram, Facebook, TikTok, en direct, autre.
    - Paiement : Wave, Orange Money, espèces ; une vente peut combiner deux modes.
    - Annulation avec motif (remet le stock).
    - Reçu partageable sur WhatsApp (image ou lien).
6. **Retours au fournisseur** — invendus par modèle, quantité pré-remplie avec le stock restant ; frais de livraison optionnels.
7. **Règlements fournisseur** — montant, date, mode, note ; solde avant / après.
8. **Dépenses** — catégories livraison (par défaut), emballage, publicité, autre ; rattachement optionnel à un fournisseur, une réception ou un retour.
9. **Tableau de bord et rapports** — aujourd'hui / semaine / mois / période libre : chiffre d'affaires, sacs vendus, marge brute, dépenses, bénéfice net ; stock par modèle avec alerte ; solde par fournisseur ; top modèles ; répartition par canal et par mode de paiement ; export CSV.
10. **Fichier clients** — fiche (nom, téléphone, type, notes), historique d'achats, total dépensé, dernier achat, bouton WhatsApp.
11. **Catalogue public** — page `/b/<slug>` : modèles publics en stock avec photos et, au choix de la boutique, le prix ou « prix sur demande » ; bouton « Commander sur WhatsApp » ; partage d'un modèle en un clic.

## 5. Règles de gestion

**Stock et lots**

- RG1 — Stock d'un modèle = quantités reçues − vendues − retournées, toutes réceptions confondues.
- RG2 — Une vente consomme les lots du plus ancien au plus récent (FIFO). Le prix fournisseur du lot est figé sur l'affectation.
- RG3 — Impossible de vendre ou retourner plus que le stock disponible.
- RG4 — Un retour s'impute sur les lots du fournisseur choisi, du plus ancien au plus récent.

**Prix**

- RG5 — Le prix de vente est libre à chaque vente ; les prix conseillé et revendeur ne servent qu'à pré-remplir.
- RG6 — Une vente sous le prix fournisseur est autorisée mais signalée (marge négative).
- RG7 — Montants en FCFA, entiers, sans décimales.

**Argent**

- RG8 — Dans le MVP, une vente est payée intégralement au moment de la vente. Les paiements sont toutefois enregistrés à part de la vente, pour activer plus tard le crédit client sans refonte.
- RG9 — Le fournisseur peut être réglé au fil des ventes ou en une fois ; l'app gère un solde courant par fournisseur.
- RG10 — Un solde négatif = avance payée par la boutique, affichée comme un avoir.

**Traçabilité**

- RG11 — Une vente, une réception, un retour ou un règlement ne se supprime pas : on l'annule avec un motif ; stock et solde sont recalculés.
- RG12 — Chaque opération enregistre son auteur et sa date de création.

**Formules**

- Solde fournisseur = Σ (quantité affectée × prix fournisseur du lot) sur les ventes actives − Σ règlements actifs.
- Marge brute = Σ quantité × (prix de vente − prix fournisseur du lot).
- Bénéfice net = marge brute − Σ dépenses actives.

## 6. Exigences non fonctionnelles

- **Responsive** : téléphone (375 px), tablette (768 px), ordinateur (1280 px et plus).
- **Design** : soigné, fluide, thème clair et sombre (voir `DESIGN.md`).
- **PWA** installable sur iOS et Android ; fonctionnement en ligne requis, message clair si coupure, sans perte de saisie en cours.
- **Performance** : premier affichage < 2 s en 4G ; vente confirmée < 1 s ; photos compressées avant envoi.
- **Sécurité** : isolation par boutique en base (RLS) ; droits par rôle en base ; calculs sensibles en transaction côté base ; sauvegardes quotidiennes.
- **Langue** : interface en français, textes centralisés.

## 7. Hors périmètre MVP (à ne pas bloquer)

- Abonnements et facturation des boutiques (SaaS payant).
- Paiement en ligne intégré (API Wave / Orange Money), commande directe depuis le catalogue.
- Mode hors ligne complet.
- Plusieurs points de vente par boutique.
- Achat ferme de stock.
- Crédit client (paiements partiels, reste à payer, relances) ; fidélité, codes promo, notifications push.
- Application native.

## 8. Décisions validées

| Sujet | Décision |
| --- | --- |
| Nom de l'app | Jaay |
| Création de compte | Un écran, e-mail + mot de passe, ni OTP ni SMS. Le propriétaire crée les comptes de ses membres. |
| Crédit client | Hors MVP, modèle de données prêt. |
| Appareils | Responsive téléphone, tablette, ordinateur. |
| Fournisseurs | Un seul aujourd'hui, plusieurs gérés dès le MVP. |
| Prix fournisseur | Peut varier, fixé par lot. |
| Gérant | Voit uniquement le stock et ses ventes. |
| Catalogue public | La boutique choisit d'afficher le prix ou non. |
| Clients réguliers | Inclus dans le MVP. |
