# Contexte du projet : plateforme de commande en ligne (restaurants de Ziguinchor)

Projet académique (L3 Ingénierie Informatique, UASZ). Plateforme type Jumia Food / Uber Eats pour les restaurants, dibiteries et fast-foods de Ziguinchor : commande en ligne, KDS cuisine temps réel, livraison, paiement Mobile Money (Wave), fidélité.

## Stack

- **Backend** (`resto-api/`) : Node.js + Express, Socket.io (temps réel), PostgreSQL + Prisma, JWT avec rôles, Swagger/OpenAPI 3.0, tests Jest + Supertest.
- **Frontend** (`resto-frontend/`) : React + Vite, Tailwind, PWA (vite-plugin-pwa), socket.io-client. Thème clair/crème avec accents orange, mobile-first.
- **Services externes** : OpenRouteService (itinéraire et géocodage, URL `https://api.heigit.org/openrouteservice/...`, requêtes POST pour les itinéraires), Wave Checkout (mode simulation automatique si `WAVE_API_KEY` absente), FCM prévu pour les notifications.
- **Environnement de dev** : Windows + PowerShell, PostgreSQL 18 local. Bases : `resto_ziguinchor` (dev) et `resto_ziguinchor_test` (tests, config dans `.env.test`).
- **Git** : branches `main`, `develop`, `feature/*`. Le dépôt GitHub `resto-ziguinchor` contient le backend.

## Rôles

ADMIN, RESPONSABLE_RESTO, CUISINIER, LIVREUR, CLIENT (enum `Role` dans `prisma/schema.prisma`).

## Conventions de code

- Noms en français (utilisateur, commande, plat...). Textes de l'interface en français.
- Backend : une paire `controllers/x.controller.js` + `routes/x.routes.js` par ressource, erreurs via `next(err)`, accès protégé par `verifierJWT` et `requireRole(...)`.
- Dans les routes Express, déclarer les routes littérales (`/mes-commandes`) AVANT `/:id`.
- Frontend : pages dans `src/pages`, appels API centralisés dans `src/api/client.js`, contexts Auth et Cart.
- Ne jamais committer `.env` ni `.env.test` (déjà dans `.gitignore`).

## Règles pour l'agent

- Avant un gros changement, vérifier que `git status` est propre, sinon me le dire.
- Ne pas toucher aux fichiers `.env`.
- Me demander confirmation avant de lancer une migration Prisma.
- Lancer `npm test` côté backend après les changements backend (objectif : couverture ≥ 60 %, actuellement ~67 %).
- Avant d'implémenter quelque chose, vérifier si le code existe déjà dans le dépôt.

## Déjà fait

- Modèle de données Prisma complet, API REST : auth JWT, restaurants, catégories, plats (CRUD + disponibilité temps réel + photo en base64), commandes, paiement Wave (simulation), livraison avec itinéraire OpenRouteService, points de fidélité (1 point / 100 FCFA, crédités au statut LIVREE), séquestre de commission (8 %) versé au statut LIVREE.
- Dashboard restaurateur (CA du jour, nombre de commandes, taux d'annulation, heure de pointe, top 5 plats).
- Frontend : Login, Register, Menu (client), Panier, SuiviCommande (temps réel), Profil, KDS (`/kds`), Dashboard (`/dashboard`), GestionMenu (`/gestion-menu`).

## Changements backend à synchroniser (vérifier s'ils sont déjà dans le dépôt)

1. Modèle `Commande` : champs `adresseLivraison`, `latitudeLivraison`, `longitudeLivraison` (géocodés via OpenRouteService à la création). Nécessite une migration, par exemple `npx prisma migrate dev --name ajout-adresse-livraison`.
2. Nouveaux endpoints : `GET /commandes/mes-commandes` (CLIENT), `GET /commandes/disponibles-livraison` (LIVREUR, commandes de type LIVRAISON au statut PRETE sans livreur), `GET /commandes/mes-livraisons` (LIVREUR, courses EN_LIVRAISON).
3. `POST /livraisons/accepter` utilise les coordonnées enregistrées sur la commande, avec une garde contre la double attribution (409).
4. `PATCH /livraisons/:id/confirmer` passe la commande à LIVREE et déclenche `crediterPoints` + `verserCommission`.

## Reste à faire (cahier des charges), par ordre de priorité

1. **Interface Livreur** (page `/livreur`) : liste des courses disponibles, bouton accepter, course en cours avec distance et durée, bouton confirmer la livraison.
2. **Panier** : champ adresse de livraison (si type LIVRAISON), champ heure souhaitée, choix du paiement (Wave simulé ou paiement à la livraison simulé).
3. **Options de personnalisation des plats** (sans oignon, sauce à part...) : les modèles `GroupeOption` et `Option` existent dans le schéma, mais il n'y a ni CRUD, ni interface, ni prise en compte dans la création de commande (`LigneCommandeOption`).
4. **Fidélité** : paliers (500 pts → coupon 500 FCFA, 1000 pts → coupon 1200 FCFA, expiration 30 jours) et génération de coupons. Il y a un TODO dans `fidelite.controller.js`, plus l'utilisation d'un coupon à la commande.
5. **Historique des commandes client** (page) et **notation du repas et du livreur avec commentaire** : le modèle `Notation` existe, mais il n'y a ni controller, ni routes, ni interface.
6. Versionner le frontend sur GitHub (actuellement seul le backend l'est). Retirer du dépôt les fichiers `.json` de test committés par erreur (`login.json`, `commande.json`...).
7. Divers : page liste des restaurants, icônes PWA réelles, tests supplémentaires, déploiement (Render pour l'API, Vercel pour le frontend).

## Pièges déjà rencontrés

- `Commande.livreurId` référence `Livreur.id`, pas `Utilisateur.id` (faire un upsert du `Livreur` à partir de `req.utilisateur.id`).
- Le `localStorage` est partagé entre onglets : pour tester deux rôles en parallèle, utiliser une fenêtre de navigation privée ou un autre navigateur.
- Dans les composants React, ne pas utiliser un state asynchrone dans un callback de socket (closure périmée) : résoudre la donnée avant de connecter le socket.
- Dashboard : `getHours()` utilise l'heure du serveur, à vérifier en déploiement (fuseau horaire).
- Dans `package.json` du frontend, `"type": "module"` impose les extensions `.cjs` pour `postcss.config` et `tailwind.config`.
