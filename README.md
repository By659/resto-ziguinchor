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

## Ce qui reste à compléter (marqué TODO dans le code)

- Intégration réelle Wave sandbox (paiement + webhook)
- Intégration réelle OpenRouteService (calcul d'itinéraire livreur)
- Déclenchement de `crediterPoints()` + versement de la commission au statut LIVREE
- Génération des coupons de palier fidélité (500 / 1000 points)
- KPIs avancés du dashboard (heure de pointe, plats les plus commandés)
- Tests unitaires et d'intégration (Jest + Supertest, objectif ≥ 60% de couverture)

## Prochaine étape suggérée

Copier `schema.prisma` (généré précédemment) dans `prisma/schema.prisma`, puis lancer la migration.
