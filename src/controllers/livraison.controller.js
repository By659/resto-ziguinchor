const prisma = require('../config/prisma');
// TODO: client HTTP vers OpenRouteService (calcul d'itinéraire)

async function accepterCourse(req, res, next) {
  try {
    const { commandeId } = req.body;
    const livreurId = req.utilisateur.id;

    await prisma.commande.update({
      where: { id: commandeId },
      data: { livreurId, statut: 'EN_LIVRAISON' },
    });

    // TODO: appeler OpenRouteService avec les coords restaurant + client
    const livraison = await prisma.livraison.create({
      data: { commandeId, livreurId, distanceKm: null, dureeEstimeeMin: null },
    });

    res.status(201).json(livraison);
  } catch (err) { next(err); }
}

async function confirmerLivraison(req, res, next) {
  try {
    const livraison = await prisma.livraison.update({
      where: { id: req.params.id },
      data: { confirmeeAt: new Date() },
    });

    // Le passage de la commande à LIVREE déclenche le séquestre + la fidélité
    // via le contrôleur commande.changerStatut (voir routes/commande.routes.js)
    res.json(livraison);
  } catch (err) { next(err); }
}

module.exports = { accepterCourse, confirmerLivraison };
