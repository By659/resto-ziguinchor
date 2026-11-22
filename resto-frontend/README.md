# RestoClik — Frontend Ziguinchor

Frontend React/Vite mobile-first de la plateforme RestoClik.

## Installation

```bash
npm install
cp .env.example .env
npm run dev
```

Application locale : `http://localhost:5173`

Le fichier `.env` doit contenir :

```env
VITE_API_URL="http://localhost:4000/api"
VITE_SOCKET_URL="http://localhost:4000"
```

## Parcours disponibles

- Accueil avec restaurants, recherche, catégories et menu dynamique.
- Personnalisation des plats : options obligatoires, options multiples et suppléments.
- Panier avec quantités, adresse, heure souhaitée, type de commande et paiement Wave simulé ou à la livraison.
- Coupons fidélité applicables au panier.
- Suivi de commande temps réel via Socket.io.
- Avis après livraison : repas, livreur et commentaire.
- Historique des commandes, points et coupons.
- Espace livreur, KDS cuisine, dashboard restaurateur et gestion du menu.
- Service Worker PWA pour un mode offline partiel et la mise en cache des ressources.

## Build de production

```bash
npm run build
npm run preview
```

Ne jamais versionner le fichier `.env`.
