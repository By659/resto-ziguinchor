# RestoClik — état de reprise et conformité au TP

**Mise à jour le 17 octobre 2026 — audit et reprise visuelle du projet fourni.** Le ZIP original n’a pas été modifié ; le dossier de travail est une copie extraite. Aucun secret local n’a été lu, aucune migration ni écriture en base n’a été exécutée. L’utilisateur indique avoir déjà créé le `.env` du frontend dans son environnement ; aucun fichier `.env` n’est inclus dans l’archive livrable.

## 1. Architecture réellement présente

| Partie | Constat |
|---|---|
| API | Node.js + Express 4, JavaScript CommonJS, Jest/Supertest |
| Données | PostgreSQL via Prisma 5 ; quatre migrations existantes ; pas de migration ajoutée |
| Authentification | JWT (`jsonwebtoken`), mots de passe avec `bcryptjs`, rôles dans l’enum Prisma |
| Temps réel | Socket.IO ; serveur d’événement de commande et KDS React |
| Interface | React 18 + Vite, React Router, Socket.IO Client, Vite PWA/Workbox |
| Services | Wave Checkout avec branche de démonstration si la clé manque ; OpenRouteService optionnel ; FCM non achevé |
| Docs/tests existants | Swagger UI, OpenAPI et Postman présents ; plusieurs tests backend, pas de suite frontend visible |

La stack conseillée dans le TP (Spring Boot/React/PostgreSQL) diffère de la stack réelle (Express/React/PostgreSQL). **La réécrire en Spring Boot aurait remplacé l’API fournie et ajouté un backend concurrent ; cette migration n’était pas nécessaire aux corrections retenues et n’a pas été faite.**

## 2. Fonctionnalités déjà repérées dans le code

L’archive contient des pages client (accueil, menu, panier, inscription/connexion, suivi, profil, historique), un espace responsable (dashboard, gestion du menu), le KDS et une page livreur. L’API contient les ressources d’authentification, restaurants/recherche, menu/plats/options, commandes, paiements, livraisons, fidélité/coupons, notations et demandes d’accès. Le schéma possède des snapshots de prix de lignes, des options de personnalisation, une commission et un portefeuille comptable.

Il s’agit d’une **inspection de code** : sans PostgreSQL, clés externes et comptes réels, la présence de code ne prouve pas que l’ensemble fonctionne en production.

## 3. Modifications réalisées dans cette reprise

### API et sécurité

- L’inscription publique ignore désormais tout rôle fourni par le navigateur et crée toujours un `CLIENT`. Nom, téléphone et mot de passe de 8 caractères minimum sont validés avant l’écriture. Les rôles restaurateur/livreur restent attribués par le flux distinct de demande/approbation.
- Le détail d’une commande est réservé au client qui la possède, au responsable du restaurant propriétaire, au livreur qui lui est attribué ou à l’administrateur.
- Le responsable ne peut plus consulter/modifier les commandes, le KDS, les statistiques, le restaurant, les catégories ou les plats d’un autre établissement par simple changement d’identifiant.
- Les opérations de création/modification de plats acceptent une liste de champs explicite, valident le prix et vérifient la catégorie du même restaurant. La disponibilité doit être un booléen.
- Les transitions de commande sont centralisées, refusent les sauts/reprises d’états terminaux, et la remise d’une livraison doit passer par la confirmation du livreur. La mise à jour emploie un compare-and-set pour empêcher la répétition concurrente d’une étape.
- Les montants de commande sont arrondis en FCFA entiers, le coupon fixe ou en pourcentage est calculé côté serveur, le taux de commission est vérifié et le coupon est réservé dans la même transaction que la commande.
- Le canal WebSocket exige un JWT. Un responsable ne rejoint que le salon de son restaurant ; un utilisateur non autorisé est refusé. Le KDS fournit son token et récupère les commandes périodiquement lors d’une coupure Socket.IO.
- **Limite de schéma importante :** aucun lien entre un cuisinier et un restaurant n’existe. Les comptes `CUISINIER` existants sont authentifiés, mais le salon ne peut pas être restreint à leur établissement sans ajouter une relation et exécuter une migration. Le rôle cuisinier garde pour l’instant l’accès au salon (comme dans le comportement antérieur) ; une affectation stricte reste à réaliser après décision de schéma.

### Frontend/PWA

- La palette donnée dans l’image est définie dans le thème (`#5A4A0D`, `#7A5E12`, `#A67917`, `#CC961F`, `#EBB84A`, `#F3D789`, `#FFF3D8`). Les pages et fournisseurs existants sont conservés.
- Ajout d’un indicateur hors ligne accessible ; il explique que les pages déjà visitées peuvent rester disponibles, mais qu’une commande nécessite Internet.
- Les couleurs de la PWA ont été harmonisées et l’icône inexistante a été remplacée par un SVG fourni.
- Le dashboard et le KDS des responsables utilisent maintenant l’endpoint authentifié `GET /restaurants/moi` plutôt que le premier résultat public.
- Reprise de l’identité visuelle de la référence Lovable dans le **même frontend React** : accueil, navigation commune, catalogue/fiche restaurant, panier invité, connexion, inscription et demande d’accès ; les photos observées dans la référence sont incluses sous `resto-frontend/public/images/`.
- En-tête responsive ajusté sur les deux captures fournies : bandeau blanc sticky de 62 px, marque or, Connexion, pilule Inscription, sac dans un cercle crème et hamburger simple. À l’ouverture, le hamburger devient un X et affiche les sept liens en colonne sur panneau blanc sans séparateurs.
- Le catalogue garde les appels API existants et affiche clairement les fiches d’exemple seulement comme secours lorsque l’API n’est pas joignable. Le panier garde le vrai `CartContext`, le calcul des coupons et l’API de commande ; les formulaires invités redirigent vers la connexion avant l’envoi.
- Les frais de livraison non présents dans le modèle de données ne sont pas inventés dans les cartes réelles ; l’interface affiche alors « Livraison locale ». Le paiement Wave demeure une simulation selon la configuration existante.

### Tests et documentation

- Ajout de tests sans base pour l’inscription, les transitions, les calculs et les contrôles de propriété/Socket.IO.
- Ajout de `.env.test.example`, d’un README racine et d’une documentation API plus précise.
- OpenAPI mis à jour pour la contrainte de mot de passe et le nouvel endpoint `GET /restaurants/moi`.

## 4. Tests et résultats vérifiables

| Commande | Résultat |
|---|---|
| Tests ciblés sans DB : `npx jest --runInBand --coverage=false tests/auth.middleware.test.js tests/auth.controller.test.js tests/commande.regles.test.js tests/commande.controller.security.test.js tests/resource-access.test.js tests/kds.socket.test.js tests/recherche-restaurant.test.js` | **28 tests passés, 7 suites passées** |
| Build frontend : `npm run build` dans `resto-frontend` | **Réussi** ; Vite produit les ressources, manifeste et Service Worker |
| `public/manus-routes.json` | **JSON valide** après ajout des routes de présentation et conservation des routes métier |
| Parcours navigateur sur la prévisualisation de production | **Vérifiés** : accueil, catalogue, filtre Grillades, fiche restaurant, modal de plat, ajout/retrait du panier, panier invité, connexion/inscription, candidature partenaire, restaurant fermé et redirections d’invité ; aucun formulaire ni commande n’a été envoyé et le panier de test a été vidé |
| En-tête responsive dans Chromium à `1011 × 407` | **Réussi** : navigation desktop masquée, hamburger visible, menu ouvert avec les sept liens et X, panneau bas à 401 px, puis fermeture confirmée |
| `npx prisma generate` dans `resto-api` | Réussi ; génération du client depuis le schéma existant |
| `DATABASE_URL=<URL locale factice> npx prisma validate` | **Schéma Prisma valide** ; aucune connexion DB n’est faite par cette validation |
| `node --check` sur les contrôleurs et tests modifiés ; lecture JSON des routes et XML de l’icône | Réussis |
| Suite complète : `npm test -- --runInBand` | **Non validée** : 7 suites ont passé, la suite d’intégration de commandes a échoué dans cet environnement faute de `.env.test`, `DATABASE_URL` et `JWT_SECRET`. Résultat observé : 28 tests réussis, 9 échecs en cascade de configuration/connexion, 8 suites au total. Aucune base n’a été disponible (`psql`/`pg_isready` absents). |
| Couverture de la suite complète interrompue | **38,78 % statements / 44,04 % lignes** dans le rapport produit ; l’objectif TP de 60 % n’est pas atteint ni revendiqué. Le workflow complet ne peut être validé sans PostgreSQL de test. |
| Audit des dépendances à `npm ci` | Backend : 35 vulnérabilités signalées (5 modérées, 30 élevées) ; frontend : 12 (6 modérées, 6 élevées). Aucun `npm audit fix` automatique n’a été appliqué afin d’éviter une mise à niveau de version non vérifiée. |

## 5. État des critères prioritaires du TP

| Critère | État constaté |
|---|---|
| KDS en moins de 2 secondes | **Partiellement implémenté** : événements Socket.IO présents et fallback ajouté ; délai réel non mesuré faute d’environnement lancé. |
| WebSocket reçu par le KDS | **Partiellement implémenté** : code d’événement et JWT présents ; test réel multi-clients non effectué. |
| FCM | **Non implémenté / bloqué** : seule une variable d’exemple existe ; aucun envoi push vérifié. |
| Attribution et confirmation du livreur | **Présentes en code**, mais workflow intégral non vérifié avec PostgreSQL. |
| Fidélité | **Présente en code** (barème existant : 1 point/100 FCFA, seuils déjà codés) ; validation DB end-to-end bloquée. Le barème reste à confirmer avec le métier. |
| Coupons | **Partiellement implémentés** : calcul fixe et pourcentage serveur + consommation atomique ajoutés ; règles de plafonds/conditions par restaurant et scénarios DB restent à vérifier. |
| Actualisation menu | **Partiellement implémentée** : disponibilité et événement Socket.IO présents ; test temps réel n’a pas été effectué. |
| Dashboard | **Partiellement implémenté** : CA livré du jour, commandes, annulations, pic d’activité, top plats ; graphiques/évolution et autres KPI du TP ne sont pas complets. |
| OpenAPI/Swagger | **Partiellement implémenté** : Swagger UI et fichiers existent, mais la couverture de toutes les routes/réponses/rôles est incomplète. |
| Authentification/roles | **Présente, renforcée** : JWT/rôles côté API, escalade de rôle à l’inscription bloquée, contrôles propriétaires améliorés. Affectation restaurant des cuisiniers non modélisée. |
| Wave sandbox | **Simulation ou intégration dépendante de clés** ; pas de compte/marchand disponible. Signature de webhook non vérifiée : mise en production bloquée. |
| Commission/reversement | **Suivi comptable simulé** ; 8 % par défaut et portefeuille en base. Pas de véritable séquestre ni paiement de reversement. |
| Offline/PWA | **Partiellement implémenté** : Service Worker Workbox et indicateur hors ligne ajoutés ; commandes hors ligne non confirmées ni mises en file. |
| Tests workflow complet | **Bloqué** par l’absence de PostgreSQL et de `.env.test`. |
| Couverture ≥60 % | **Non atteint** : le rapport observé est 38,78 % statements sur la suite partiellement exécutée. |
| Livrables techniques | **Partiels** : README, OpenAPI, Postman et Mermaid existants ; les cinq diagrammes UML détaillés, collection enrichie et rapport DB end-to-end restent à terminer. |
| Installation/démarrage démontrés | **Partiellement documentés**, non exécutés de bout en bout ici faute de PostgreSQL/variables locales. |

## 6. Actions manuelles à effectuer

1. L’utilisateur dispose déjà de la base `resto_ziguinchor` : **ne pas la recréer**. Pour les tests d’intégration seulement, créer une base distincte `resto_ziguinchor_test` si elle n’existe pas ; ne jamais tester contre une base de production.
2. Le `.env` du frontend a déjà été créé par l’utilisateur : **ne pas le recopier ni l’écraser**. Vérifier seulement que `VITE_API_URL` vise l’API locale (par défaut `http://localhost:4000/api`) et que `VITE_SOCKET_URL` vise `http://localhost:4000`. Côté `resto-api`, créer/configurer `.env` uniquement s’il n’existe pas encore, et ne pas partager ses valeurs. Pour `.env.test`, utiliser uniquement la base de test et un `JWT_SECRET` de test.
3. Avant toute opération Prisma, vérifier que `DATABASE_URL` désigne la base locale attendue et lancer `npx prisma migrate status`. **Aucune migration n’a été ajoutée par cette reprise visuelle** : ne lance pas de migration sur `resto_ziguinchor` pour ce seul changement. Si Prisma indique des migrations existantes en attente, sauvegarder la base et vérifier ces migrations avant toute application.
4. Lancer `npm run dev` depuis `resto-api`, puis `npm run dev` depuis `resto-frontend` (le `.env` frontend étant déjà créé). Tester `/health`, `/api-docs`, l’inscription client et le menu d’un restaurant réel local.
5. Pour tester l’intégration, migrer **la base de test uniquement** puis exécuter `npm test -- --runInBand` depuis `resto-api`. Avant cela, vérifier que `resto-api/.env.test` désigne bien `resto_ziguinchor_test`. Pour appliquer les migrations à cette base dans PowerShell, depuis `resto-api` :

   ```powershell
   $ligne = Get-Content .env.test | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
   $env:DATABASE_URL = $ligne.Split('=', 2)[1].Trim().Trim('"')
   npx prisma migrate deploy
   Remove-Item Env:DATABASE_URL
   npm test -- --runInBand
   ```

   La commande récupère l’URL depuis le fichier test local au lieu de l’inscrire dans l’historique. Vérifiez son nom de base avant de l’exécuter.
6. Pour Wave, demander l’accès marchand et les paramètres webhook au portail officiel Wave Business ; configurer seulement les clés côté serveur. Ne pas activer le paiement réel tant que la signature du webhook et les retours n’ont pas été testés.
7. Pour FCM, créer/configurer un projet Firebase, une identité serveur et le client de jeton sur appareil ; l’intégration doit être développée avant de la déclarer opérationnelle.
8. Pour une affectation sûre des cuisiniers, décider du modèle de rattachement (un cuisinier à un restaurant ou plusieurs) puis faire valider la migration avant de l’appliquer.
9. Examiner les vulnérabilités par `npm audit` dans chaque dossier, mettre à jour les dépendances par lots et rejouer les tests avant de committer.
10. Le ZIP ne contient ni répertoire Git ni URL de dépôt distant. Vérifier le dépôt GitHub/GitLab réel avant d’ajouter un remote ou de publier ; aucun push ni déploiement n’a été effectué.

## 7. Non réalisé / prochain ordre de priorité

1. Créer/configurer le test PostgreSQL, faire réussir le scénario complet et enrichir la couverture vers 60 %.
2. Ajouter le rattachement cuisinier-restaurant (avec migration approuvée) et contrôler KDS/API par restaurant.
3. Sécuriser le webhook Wave avec sa signature, puis tester l’intégration sandbox ; documenter le statut simulé à défaut.
4. Implémenter et tester FCM serveur, la gestion de jetons et les notifications.
5. Compléter dashboard, historiques d’état, coupons avancés et statistiques attendues.
6. Finir OpenAPI route par route, cinq diagrammes UML et la documentation de déploiement vérifiée.
7. Traiter les alertes `npm audit` de manière contrôlée ; aucune publication ou déploiement n’a été effectué.
