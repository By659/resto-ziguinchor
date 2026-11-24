# RestoClik — API Ziguinchor

API REST Express utilisant Prisma, PostgreSQL, JWT, Socket.IO et Swagger/OpenAPI. L’architecture fournie est conservée.

## Installation locale

Dans ce dossier :

```bash
npm ci
cp .env.example .env
npx prisma generate
```

Renseigner une `DATABASE_URL` locale et un `JWT_SECRET` privé dans `.env`. Pour créer/appliquer les migrations sur une base vide, vérifier la cible et sauvegarder toute base existante avant de lancer :

```bash
npx prisma migrate deploy
```

Puis démarrer :

```bash
npm run dev
```

- Santé : `http://localhost:4000/health`
- API : `http://localhost:4000/api`
- Swagger UI : `http://localhost:4000/api-docs`

## Variables d’environnement

| Variable | Utilisation | Configuration réelle |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL Prisma | Obligatoire, serveur uniquement |
| `JWT_SECRET` | Signature et validation JWT/Socket.IO | Obligatoire, choisir une valeur aléatoire locale/serveur |
| `JWT_EXPIRES_IN` | Durée du JWT | Exemple `7d` |
| `PORT` | Port HTTP | Défaut `4000` |
| `WAVE_API_KEY` | Session Wave Checkout | Sans clé marchande valide, le projet est en démonstration |
| `WAVE_WEBHOOK_SECRET` | Clé de validation du webhook | La vérification de signature reste à implémenter avant production |
| `APP_URL` | URL de retour Wave | À définir dans l’environnement de déploiement |
| `OPENROUTESERVICE_API_KEY` | Géocodage et itinéraires | Facultatif ; les fonctions dépendantes sont indisponibles sans clé |
| `FCM_SERVER_KEY` | Exemple de configuration FCM | La livraison push FCM n’est pas encore implémentée/testée |

Ne commitez jamais `.env` ou `.env.test` et ne placez aucun secret dans React.

## Initialiser le premier administrateur sur Render

L’inscription publique crée toujours un compte `CLIENT`. Pour initialiser l’unique premier administrateur :

1. Crée ton propre compte depuis `/register` avec un mot de passe que tu gardes privé.
2. Dans les variables du service API Render, ajoute `ADMIN_BOOTSTRAP_SECRET` et génère une valeur aléatoire d’au moins 32 caractères. Ne la mets ni dans Git ni dans une conversation.
3. Après le déploiement API et frontend, ouvre `https://resto-ziguinchor.vercel.app/initialiser-admin`, puis saisis le téléphone du compte créé et le secret temporaire.
4. Après le succès, supprime immédiatement `ADMIN_BOOTSTRAP_SECRET` dans Render et redéploie. Le serveur refuse aussi toute nouvelle initialisation dès qu’un administrateur existe.
5. Déconnecte-toi puis reconnecte-toi pour obtenir un jeton contenant le nouveau rôle.

Cette procédure ne crée pas de compte et ne définit ni ne révèle de mot de passe. Elle ne permet que la promotion d’un compte client existant, une seule fois. L’application n’a pas encore d’interface d’administration pour créer des restaurants; l’ajout de données de test doit être fait séparément après l’initialisation.

## Capacités déjà présentes (à distinguer d’une vérification en production)

- Authentification JWT et rôles métier. L’inscription publique crée désormais toujours un rôle `CLIENT` ; les rôles privilégiés sont accordés séparément.
- Restaurants, catégories, plats, options, disponibilité, panier et commande avec recalcul serveur des prix.
- Cycle commande/KDS, événements Socket.IO, livraison, itinéraire ORS, fidélité, coupons, notation et indicateurs restaurateur.
- Le responsable est contrôlé côté serveur pour la modification de son restaurant, de son menu, des commandes et des indicateurs.
- Les détails de commande sont limités au client propriétaire, au responsable propriétaire, au livreur attribué ou à l’administrateur.
- Les changements de statut suivent une transition autorisée ; la mise à jour utilise un compare-and-set pour éviter qu’une même étape soit appliquée deux fois.
- Les coupons fixes et en pourcentage sont inclus dans le recalcul des montants et leur consommation est atomique avec la création de commande.

Les catégories de fonctionnalités ne sont pas toutes testées contre PostgreSQL dans cet environnement. Consulter le rapport d’audit pour les limites, simulations et éléments encore manquants.

## Tests

Le projet fournit une base de données de test séparée. Dans PowerShell, copier le modèle puis renseigner uniquement la base locale de test :

```powershell
Copy-Item .env.test.example .env.test
```

Pour préparer une base de test vide, créez `resto_ziguinchor_test` dans PostgreSQL. Avant de lancer les migrations, contrôlez que `.env.test` pointe sur cette base. Dans PowerShell, depuis `resto-api`, importez temporairement l’URL de test (elle n’est pas inscrite directement dans la ligne de commande), puis exécutez les migrations :

```powershell
$ligne = Get-Content .env.test | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$env:DATABASE_URL = $ligne.Split('=', 2)[1].Trim().Trim('"')
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

Ne pointez jamais vers une base de production. Puis, depuis `resto-api` :

```powershell
npm test -- --runInBand
```

Les tests du scénario intégral manipulent des données. Vérifiez le nom de la base configurée dans `.env.test` avant de les lancer.

## État des intégrations externes

- **Wave** : code de création de session présent si une clé marchande est configurée ; sans cela, simulation uniquement. La signature de webhook n’est pas vérifiée dans le code actuel : ne pas ouvrir le webhook à la production avant ce correctif.
- **Commission** : calcul comptable (8 % par défaut) et suivi de portefeuille ; aucun séquestre financier réel ni reversement bancaire n’est fourni par le code.
- **OpenRouteService** : l’itinéraire dépend d’une clé et de coordonnées validées.
- **FCM** : non opérationnel en l’absence d’intégration serveur complète et de test sur appareil.
- **Cuisinier** : le modèle actuel ne rattache pas un compte `CUISINIER` à un restaurant ; le rattachement précis du salon WebSocket nécessite une évolution de schéma et une migration décidée séparément.
