# Mise en ligne RestoClik — Render et Vercel

## État de cette préparation

Le projet existant reste dans ses dossiers `resto-api/` et `resto-frontend/`. L’API sait déjà enregistrer les comptes et les commandes dans PostgreSQL. Le présent fichier prépare le déploiement; **aucun service cloud n’a été créé, aucune base distante n’a été modifiée et aucune migration n’a été lancée**.

La base locale `resto_ziguinchor` reste séparée et intacte. Le PostgreSQL Render devra être une **nouvelle base distante**. Cette procédure ne copie pas les comptes, restaurants, menus ou commandes de la base locale. Une copie de données est une opération distincte qui exige une sauvegarde et une confirmation explicite.

## Fichiers préparés

- `render.yaml` configure le service Node de l’API, son dossier racine, son build, son démarrage, son contrôle `/health` et un secret JWT généré côté Render. Il n’inclut ni ressource PostgreSQL, ni commande automatique de migration. Le plan de base et les éventuels frais restent à choisir dans Render.
- `resto-frontend/vercel.json` réécrit les routes React Router vers `index.html`, nécessaire aux liens directs et à l’actualisation d’une page SPA.
- L’API autorise en production uniquement les domaines présents dans `CORS_ORIGIN`; Express applique la liste CORS et Socket.IO vérifie aussi l’origine du handshake via `allowRequest`. En développement local, le comportement existant est conservé.

## Opérations à faire dans les tableaux de bord

### 1. Préparer le dépôt GitHub existant

La copie de travail fournie dans cette archive n’a pas de dossier `.git`. Réintègre les modifications de cette archive dans ton dépôt existant; ne crée pas un second projet RestoClik et ne remplace pas les fichiers déjà travaillés. Le dépôt connecté aux hébergeurs doit contenir à sa racine les dossiers `resto-api/`, `resto-frontend/`, `docs/` et `render.yaml`.

Ne pousse jamais `.env`, `.env.test`, de mot de passe PostgreSQL, de clé JWT ou de clé d’API. Les fichiers `.env.example` sont des modèles, pas des valeurs de production.

### 2. Créer le PostgreSQL Render

Dans Render, crée une base PostgreSQL séparée de la base locale. Choisis toi-même le plan tarifaire et la région; garde la base et le service API dans la même région lorsque c’est possible. N’utilise pas le nom ou l’URL de connexion de la base locale.

Récupère la **connection string interne** fournie par Render et configure-la pour le service API sous `DATABASE_URL` dans le tableau de bord Render. Ne la colle pas dans Git, dans le frontend ou dans une conversation.

### 3. Créer l’API Render

Relie le dépôt GitHub existant à Render et sélectionne le Blueprint `render.yaml` à la racine. Vérifie dans l’aperçu que le service utilise `rootDir: resto-api`, le plan qui te convient et le dépôt attendu avant de lancer le déploiement.

Valeurs de configuration :

- `DATABASE_URL` : connection string interne de la nouvelle base Render.
- `JWT_SECRET` : généré automatiquement par le Blueprint.
- `CORS_ORIGIN` : après avoir créé le site Vercel, renseigne son origine exacte, par exemple `https://restoclik.vercel.app`; plusieurs origines peuvent être séparées par des virgules. N’utilise pas `*` en production.
- `OPENROUTESERVICE_API_KEY` : actuellement la valeur sentinelle `ors_key`; les commandes de livraison resteront indisponibles tant qu’une vraie clé serveur n’est pas ajoutée.

Le Blueprint désactive le déploiement automatique par commit. Tu peux donc vérifier les changements avant chaque déploiement manuel.

### 4. Créer le frontend Vercel

Dans Vercel, relie le même dépôt et choisis **Root Directory** `resto-frontend`. Configure la commande `npm run build` et le dossier de sortie `dist` si Vercel ne les détecte pas automatiquement. `vercel.json` gère les routes profondes comme `/restaurants` et `/historique`.

Dans les variables d’environnement de production Vercel, renseigne :

```text
VITE_API_URL=https://<nom-du-service-render>.onrender.com/api
VITE_SOCKET_URL=https://<nom-du-service-render>.onrender.com
```

Ces valeurs sont injectées lors du build Vite; reconstruis le frontend après tout changement. Une variable `VITE_` est publique dans le JavaScript livré : ne mets aucune clé secrète Wave, PostgreSQL ou JWT dans Vercel.

Après le premier déploiement Vercel, récupère l’origine de production exacte, ajoute-la à `CORS_ORIGIN` dans Render puis redéploie l’API. Si tu ajoutes un domaine personnalisé, ajoute aussi son origine exacte à cette variable.

### 5. Initialiser le schéma distant — arrêt obligatoire avant la commande

Le dépôt contient quatre migrations Prisma versionnées. La nouvelle base Render est vide au départ. Il faudra appliquer ces migrations **uniquement à la base Render**, avec la commande `npx prisma migrate deploy` lancée depuis `resto-api` et avec `DATABASE_URL` réglée sur la connection string distante.

**Ne lance pas cette commande tant que tu n’as pas vérifié l’URL de destination et donné ton accord explicite.** Le projet demande une confirmation avant toute migration. Aucune commande de migration n’est déclenchée par le Blueprint livré.

Si tu veux aussi transférer dans le cloud les restaurants, plats, comptes ou commandes qui se trouvent déjà dans `resto_ziguinchor`, arrête-toi avant cette étape : il faudra d’abord planifier une sauvegarde et une copie contrôlée des données. Cette archive ne le fait pas.

## Vérification après mise en ligne

- Ouvre `https://<nom-du-service-render>.onrender.com/health` : la réponse attendue est `{"status":"ok"}`.
- Vérifie une route profonde Vercel, par exemple `/restaurants`, puis actualise la page : elle doit charger l’application au lieu d’afficher une 404.
- Après migration et accord pour les essais sur la base distante, crée un compte client de test puis une commande avec un plat réellement présent dans cette base. La commande doit ensuite apparaître dans l’historique du même compte et dans le KDS. Ne fais pas d’essai avec une commande Wave réelle : le paiement est encore en mode simulation.

## Étapes fonctionnelles suivantes

L’écran cuisine, le dashboard restaurateur, la page livreur, la commission par défaut de 8 % et les règles de fidélité figurent déjà dans le code. Ils restent à valider contre la base distante après mise en ligne et attribution de rôles de test.

L’étape Wave réelle n’est pas prête à activer : le panier ne démarre pas encore une session Checkout réelle et le webhook actuel ne vérifie pas la signature Wave. Il faudra sécuriser et tester cette étape avant d’activer une clé marchand en production. Ne renseigne pas de clé Wave réelle pour ce premier déploiement.

## Références officielles

- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec) — service web, variables et commandes de déploiement.
- [Deploy a Node.js app with Prisma ORM and PostgreSQL](https://render.com/docs/deploy-prisma-orm) — déploiement Prisma et migrations.
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) — paramètres Vite et déploiement SPA.
- [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json) — réécritures SPA vers `index.html`.
