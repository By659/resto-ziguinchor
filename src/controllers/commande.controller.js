const prisma = require('../config/prisma');

const ORS_GEOCODAGE_URL = 'https://api.heigit.org/openrouteservice/geocode/search';

// Génère un numéro de commande lisible pour l'écran KDS
function genererNumero() {
  return `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function geocoderAdresseLivraison(adresse) {
  if (!process.env.OPENROUTESERVICE_API_KEY || process.env.OPENROUTESERVICE_API_KEY === 'ors_key') {
    const err = new Error('Le géocodage OpenRouteService n’est pas configuré');
    err.statusCode = 503;
    throw err;
  }

  const url = new URL(ORS_GEOCODAGE_URL);
  url.searchParams.set('text', adresse);
  url.searchParams.set('boundary.country', 'SN');
  url.searchParams.set('size', '1');

  let reponse;
  try {
    reponse = await fetch(url, {
      headers: { Authorization: process.env.OPENROUTESERVICE_API_KEY },
    });
  } catch (cause) {
    const err = new Error('Impossible de contacter le service de géocodage');
    err.statusCode = 502;
    err.cause = cause;
    throw err;
  }

  if (!reponse.ok) {
    const err = new Error('Le service de géocodage a refusé la requête');
    err.statusCode = 502;
    throw err;
  }

  let resultat;
  try {
    resultat = await reponse.json();
  } catch (cause) {
    const err = new Error('Réponse invalide du service de géocodage');
    err.statusCode = 502;
    err.cause = cause;
    throw err;
  }

  const coordonnees = resultat.features?.[0]?.geometry?.coordinates;
  if (
    !Array.isArray(coordonnees)
    || coordonnees.length < 2
    || !Number.isFinite(coordonnees[0])
    || !Number.isFinite(coordonnees[1])
    || Math.abs(coordonnees[0]) > 180
    || Math.abs(coordonnees[1]) > 90
  ) {
    const err = new Error('Adresse de livraison introuvable');
    err.statusCode = 422;
    throw err;
  }

  return { longitudeLivraison: coordonnees[0], latitudeLivraison: coordonnees[1] };
}

async function creerCommande(req, res, next) {
  try {
    const { restaurantId, type, lignes, heureSouhaitee, noteClient, adresseLivraison } = req.body;
    const clientId = req.utilisateur.id;
    let coordonneesLivraison = {};

    if (type === 'LIVRAISON') {
      if (typeof adresseLivraison !== 'string' || !adresseLivraison.trim()) {
        return res.status(400).json({ message: 'Une adresse de livraison est requise' });
      }
      coordonneesLivraison = await geocoderAdresseLivraison(adresseLivraison.trim());
    }

    // TODO: valider la disponibilité des plats + calculer montantTotal/commission
    // à partir des prix stockés côté serveur (jamais faire confiance au prix envoyé par le client)
    const montantTotal = lignes.reduce((acc, l) => acc + l.prixUnitaire * l.quantite, 0);
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    const montantCommission = montantTotal * (restaurant.tauxCommission / 100);

    const commande = await prisma.commande.create({
      data: {
        numero: genererNumero(),
        type,
        heureSouhaitee,
        noteClient,
        adresseLivraison: type === 'LIVRAISON' ? adresseLivraison.trim() : null,
        ...coordonneesLivraison,
        montantTotal,
        montantCommission,
        clientId,
        restaurantId,
        lignes: {
          create: lignes.map((l) => ({
            platId: l.platId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
          })),
        },
      },
      include: { lignes: true },
    });

    // Pousse la commande au KDS en temps réel (voir src/sockets/kds.socket.js)
    req.app.get('io').to(`resto:${restaurantId}`).emit('nouvelle_commande', commande);

    res.status(201).json(commande);
  } catch (err) {
    next(err);
  }
}

async function changerStatut(req, res, next) {
  try {
    const { id } = req.params;
    const { statut } = req.body; // EN_PREPARATION, PRETE, EN_LIVRAISON, LIVREE, ANNULEE

    const data = { statut };
    if (statut === 'CONFIRMEE') data.confirmeeAt = new Date();
    if (statut === 'PRETE') data.preteAt = new Date();
    if (statut === 'LIVREE') data.livreeAt = new Date();

    const commande = await prisma.commande.update({ where: { id }, data });

    req.app.get('io').to(`resto:${commande.restaurantId}`).emit('statut_commande', commande);

    // Déclenché uniquement au passage à LIVREE : séquestre versé + points fidélité crédités
    if (statut === 'LIVREE') {
      const { crediterPoints } = require('./fidelite.controller');
      const { verserCommission } = require('./portefeuille.controller');
      await crediterPoints(commande.id);
      await verserCommission(commande.id);
    }

    res.json(commande);
  } catch (err) {
    next(err);
  }
}

async function obtenirCommande(req, res, next) {
  try {
    const commande = await prisma.commande.findUnique({
      where: { id: req.params.id },
      include: { lignes: { include: { plat: true } }, paiement: true, livraison: true },
    });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
    res.json(commande);
  } catch (err) {
    next(err);
  }
}

// Flux KDS : commandes actives d'un restaurant, triées par ordre d'arrivée
async function commandesRestaurant(req, res, next) {
  try {
    const commandes = await prisma.commande.findMany({
      where: {
        restaurantId: req.params.restaurantId,
        statut: { in: ['CONFIRMEE', 'EN_PREPARATION', 'PRETE'] },
      },
      orderBy: { createdAt: 'asc' },
      include: { lignes: { include: { plat: true } } },
    });
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

async function mesCommandes(req, res, next) {
  try {
    const commandes = await prisma.commande.findMany({
      where: { clientId: req.utilisateur.id },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: true,
        lignes: { include: { plat: true } },
        paiement: true,
        livraison: true,
      },
    });
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

async function commandesDisponiblesLivraison(req, res, next) {
  try {
    const commandes = await prisma.commande.findMany({
      where: { type: 'LIVRAISON', statut: 'PRETE', livreurId: null },
      orderBy: { preteAt: 'asc' },
      include: {
        restaurant: true,
        lignes: { include: { plat: true } },
      },
    });
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  creerCommande,
  changerStatut,
  obtenirCommande,
  commandesRestaurant,
  mesCommandes,
  commandesDisponiblesLivraison,
};
