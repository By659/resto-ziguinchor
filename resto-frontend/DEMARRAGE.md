# Démarrer RestoClik correctement

Ne double-cliquez pas sur `index.html` : Vite doit servir l’application et ses fichiers CSS/JavaScript.

## Méthode recommandée

Depuis ce dossier :

```bash
npm install
npm run build
npm start
```

Ouvrir ensuite :

```text
http://localhost:4173/
```

Pour arrêter le serveur : `Ctrl + C`.

## Développement

Pour travailler avec rechargement automatique :

```bash
npm install
npm run dev
```

Puis ouvrir l’URL affichée par Vite, généralement `http://localhost:5173/`.

## Vérification CSS

Sur la page, ouvrir les outils développeur du navigateur puis vérifier dans l’onglet Réseau qu’un fichier ressemblant à `index-*.css` répond en HTTP 200.

Si l’ancienne page apparaît encore :

1. arrêter tous les anciens serveurs Vite ;
2. relancer `npm start` depuis **ce dossier** `resto-frontend` ;
3. faire `Ctrl + Shift + R` ;
4. si nécessaire, vider les données du site et désenregistrer le service worker RestoClik.
