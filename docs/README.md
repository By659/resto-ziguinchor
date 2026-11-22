# Documentation technique — RestoClik Ziguinchor

## Architecture

```mermaid
flowchart LR
  Client[Client React PWA] -->|REST + JWT| API[API Express]
  Client -->|Socket.io| API
  Cuisinier[KDS Cuisine] -->|Socket.io| API
  Livreur[Interface livreur] -->|REST| API
  API --> Prisma[Prisma ORM]
  Prisma --> DB[(PostgreSQL)]
  API --> Wave[Wave sandbox]
  API --> ORS[OpenRouteService]
  API --> FCM[FCM / notifications]
```

## Cas d’utilisation

```mermaid
flowchart TB
  Client((Client)) --> Compte[Créer un compte / se connecter]
  Client --> Menu[Consulter le menu]
  Client --> Personnaliser[Personnaliser un plat]
  Client --> Commande[Créer une commande]
  Client --> Paiement[Payer Wave ou à la livraison]
  Client --> Suivi[Suivre la commande]
  Client --> Avis[Noter repas et livreur]
  Client --> Fidelite[Consulter points et coupons]
  Resto((Responsable restaurant)) --> Gestion[Activer / désactiver les plats]
  Resto --> Dashboard[Consulter les KPIs]
  Cuisinier((Cuisinier)) --> KDS[KDS : préparer et marquer prête]
  Livreur((Livreur)) --> Course[Accepter et confirmer une course]
  Admin((Admin)) --> Roles[Gérer les rôles]
```

## Séquence de commande

```mermaid
sequenceDiagram
  participant C as Client
  participant UI as Frontend
  participant API as API Express
  participant DB as PostgreSQL
  participant K as KDS
  participant L as Livreur

  C->>UI: Sélectionne plat + options
  C->>UI: Confirme type, paiement et adresse
  UI->>API: POST /api/commandes
  API->>DB: Valide disponibilités, options et prix serveur
  API->>DB: Crée commande, lignes, options et paiement
  API-->>K: WebSocket nouvelle_commande
  API-->>UI: Commande créée
  K->>API: PATCH statut EN_PREPARATION / PRETE
  API-->>UI: WebSocket statut_commande
  L->>API: POST /api/livraisons/accepter
  L->>API: PATCH /api/livraisons/:id/confirmer
  API->>DB: Passe LIVREE, crédite points et verse la commission
  C->>API: POST /api/notations/commandes/:commandeId
```

## Règles métier principales

- Le prix d'une commande est toujours recalculé depuis PostgreSQL.
- Une ligne peut contenir plusieurs options ; les options obligatoires et exclusives sont contrôlées côté serveur.
- Un coupon appartient à un seul client, expire sous 30 jours et ne peut être utilisé qu'une fois.
- Les points sont crédités au statut `LIVREE` : 1 point par tranche de 100 FCFA.
- La commission par défaut est de 8 % et reste en séquestre jusqu'à confirmation de livraison.
- L'interface client est responsive et dispose d'un Service Worker via Vite PWA.

## Lancement local

Voir les fichiers `resto-api/README.md` et `resto-frontend/README.md`. Les secrets doivent rester dans `.env` et ne doivent pas être commités.
