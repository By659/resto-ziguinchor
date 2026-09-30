const router = require('express').Router();
const { verifierJWT, requireRole } = require('../middleware/auth');
const {
  creerCommande,
  changerStatut,
  obtenirCommande,
  commandesRestaurant,
} = require('../controllers/commande.controller');

/**
 * @swagger
 * /commandes:
 *   post:
 *     summary: Créer une nouvelle commande (client)
 *     tags: [Commandes]
 *     responses:
 *       201:
 *         description: Commande créée et poussée au KDS
 */
router.post('/', verifierJWT, requireRole('CLIENT'), creerCommande);

/**
 * @swagger
 * /commandes/{id}:
 *   get:
 *     summary: Détail d'une commande
 *     tags: [Commandes]
 */
router.get('/:id', verifierJWT, obtenirCommande);

/**
 * @swagger
 * /commandes/{id}/statut:
 *   patch:
 *     summary: Changer le statut d'une commande (cuisinier, livreur)
 *     tags: [Commandes]
 */
router.patch(
  '/:id/statut',
  verifierJWT,
  requireRole('CUISINIER', 'LIVREUR', 'RESPONSABLE_RESTO'),
  changerStatut
);

/**
 * @swagger
 * /restaurants/{restaurantId}/commandes:
 *   get:
 *     summary: Flux KDS - commandes actives d'un restaurant
 *     tags: [Commandes]
 */
router.get(
  '/restaurant/:restaurantId',
  verifierJWT,
  requireRole('CUISINIER', 'RESPONSABLE_RESTO'),
  commandesRestaurant
);

module.exports = router;
