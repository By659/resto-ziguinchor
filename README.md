# RestoClik — plateforme de commande à Ziguinchor

Reprise du projet fourni : plateforme de commande de repas pour restaurants de Ziguinchor. Ce dépôt utilise **Node.js/Express, Prisma, PostgreSQL, Socket.IO et React/Vite**. Il ne s’agit pas d’une application Spring Boot ; la stack existante est conservée afin d’éviter une réécriture risquée.

## Structure

- `resto-api/` : API REST, JWT, règles métier, Prisma/PostgreSQL, Socket.IO et tests Jest/Supertest.
- `resto-frontend/` : interface React/Vite, pages client, restaurant, cuisine et livreur, panier et PWA.
- `docs/` : OpenAPI, collection Postman, diagrammes Mermaid et bilan d’audit.

## Pré-requis

- Node.js 20+ et npm.
- PostgreSQL 15+ (le projet fourni ciblait PostgreSQL 18).
- Deux bases distinctes : `resto_ziguinchor` et `resto_ziguinchor_test`.

## Installation locale (Windows / PowerShell)

1. Pour une installation neuve, créez les bases dans pgAdmin, ou dans PowerShell si `psql` est dans le `PATH`. **Si `resto_ziguinchor` existe déjà, comme dans l’environnement de l’utilisateur, ne la recréez pas** ; créez uniquement la base de test si elle manque :

   ```powershell
   psql -U postgres -c "CREATE DATABASE resto_ziguinchor;"
   psql -U postgres -c "CREATE DATABASE resto_ziguinchor_test;"
   ```

2. Depuis `resto-api`, créez les fichiers locaux (ils ne doivent pas être commités) seulement s’ils n’existent pas déjà. Ne remplacez aucun `.env` contenant une configuration locale :

   ```powershell
   Copy-Item .env.example .env
   Copy-Item .env.test.example .env.test
   ```

   Renseignez le mot de passe PostgreSQL local dans les deux fichiers et générez une clé JWT locale :

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Collez la sortie uniquement dans `resto-api/.env` comme valeur de `JWT_SECRET`. La valeur de test dans `.env.test` est réservée aux tests locaux.

3. Depuis `resto-api`, installez les dépendances et générez Prisma :

   ```powershell
   npm ci
   npx prisma generate
   ```

4. **Migration de base de données :** avant toute migration, vérifiez que `DATABASE_URL` pointe sur la base locale prévue et faites une sauvegarde si cette base contient déjà des données. Pour la première installation d’une base vide :

   ```powershell
   npx prisma migrate deploy
   ```

   Aucune migration n’a été lancée pendant cette reprise. Ne remplacez pas la base de production par la base de test.

5. Dans un terminal PowerShell, depuis `resto-api`, lancez l’API :

   ```powershell
   npm run dev
   ```

   Vérifiez `http://localhost:4000/health` (réponse attendue `{"status":"ok"}`) et la documentation à `http://localhost:4000/api-docs`.

6. Dans un second terminal, depuis `resto-frontend`, conservez le `.env` déjà créé. Ne copiez `.env.example` vers `.env` que si ce fichier est absent :

   ```powershell
   Copy-Item .env.example .env
   npm ci
   npm run dev
   ```

   Ouvrez l’URL Vite affichée (par défaut `http://localhost:5173`). Vérifiez que `VITE_API_URL` vise `http://localhost:4000/api` et `VITE_SOCKET_URL` vise `http://localhost:4000`.

## Tests

Dans `resto-api`, avec une base `resto_ziguinchor_test` créée et migrée, exécutez :

```powershell
npm test -- --runInBand
```

Jest charge `resto-api/.env.test`. **Ne mettez jamais l’URL de développement ou de production dans ce fichier** : le scénario d’intégration crée et met à jour des comptes, restaurants, commandes et soldes de test. Pour migrer la base de test depuis PowerShell, après avoir vérifié le nom de base de `resto-api/.env.test` :

```powershell
$ligne = Get-Content .env.test | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$env:DATABASE_URL = $ligne.Split('=', 2)[1].Trim().Trim('"')
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

Depuis `resto-frontend` :

```powershell
npm run build
```

## Services externes

- **Wave** : sans clé, le code utilise un mode de démonstration ; aucun paiement réel n’est prétendu. Une intégration marchande exige les identifiants Wave Business côté serveur et une validation de la signature de webhook avant mise en production.
- **OpenRouteService** : la géolocalisation et le calcul d’itinéraire nécessitent une clé serveur. Sans coordonnées ou clé, une distance exacte ne doit pas être affichée comme calculée.
- **FCM** : la variable d’exemple ne constitue pas une intégration opérationnelle. Le projet doit encore configurer et tester Firebase côté serveur.

Ne transmettez aucune clé privée dans Git, dans le frontend ou dans une conversation. Les détails des limites actuelles et les tâches restantes sont dans [`docs/ETAT-DU-PROJET.md`](docs/ETAT-DU-PROJET.md).
