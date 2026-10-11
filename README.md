# API - Plateforme de commande en ligne (Restaurants Ziguinchor)

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner DATABASE_URL, JWT_SECRET, clés Wave/ORS/FCM
npx prisma migrate dev --name init
npm run dev
```

## Structure

```
src/
  config/       # Prisma, Swagger
  middleware/   # JWT, rôles, gestion d'erreurs
  controllers/  # logique métier par ressource
  routes/       # définition des endpoints REST
  sockets/      # WebSocket KDS (Socket.io)
  server.js     # point d'entrée (HTTP + WebSocket)
  app.js        # config Express
```

## Documentation API

Une fois le serveur lancé : http://localhost:4000/api-docs

## Commandes et livraisons

- `POST /api/commandes` accepte `adresseLivraison` pour une commande de type `LIVRAISON` et géocode cette adresse au Sénégal via OpenRouteService.
- `GET /api/commandes/mes-commandes` (CLIENT) retourne l'historique du client connecté.
- `GET /api/commandes/disponibles-livraison` (LIVREUR) retourne les commandes prêtes sans livreur.
- `GET /api/commandes/mes-livraisons` (LIVREUR) retourne ses livraisons en cours.
- `POST /api/livraisons/accepter` accepte `{ "commandeId": "..." }`. L'attribution est atomique ; une commande déjà attribuée renvoie `409`.
- `PATCH /api/livraisons/:id/confirmer` confirme la livraison et finalise la commande, les points de fidélité et le versement de la commission.

La migration `ajout_adresse_livraison` est préparée mais doit être appliquée avant le démarrage de cette version de l'API :

```bash
npx prisma migrate dev --name ajout-adresse-livraison
```

## Ce qui reste à compléter (marqué TODO dans le code)

- Intégration réelle Wave sandbox (paiement + webhook)
- Intégration réelle OpenRouteService (calcul d'itinéraire livreur)
- Déclenchement de `crediterPoints()` + versement de la commission au statut LIVREE
- Génération des coupons de palier fidélité (500 / 1000 points)
- KPIs avancés du dashboard (heure de pointe, plats les plus commandés)
- Tests unitaires et d'intégration (Jest + Supertest, objectif ≥ 60% de couverture)
