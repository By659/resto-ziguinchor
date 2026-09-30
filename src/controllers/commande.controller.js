const prisma = require('../config/prisma');

// Génère un numéro de commande lisible pour l'écran KDS
function genererNumero() {
  return `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function creerCommande(req, res, next) {
  try {
    const { restaurantId, type, lignes, heureSouhaitee, noteClient } = req.body;
    const clientId = req.utilisateur.id;

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

module.exports = { creerCommande, changerStatut, obtenirCommande, commandesRestaurant };
