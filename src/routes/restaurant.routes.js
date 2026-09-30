const router = require('express').Router();
const { verifierJWT, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/restaurant.controller');

/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Liste des restaurants actifs
 *     tags: [Restaurants]
 */
router.get('/', ctrl.listerRestaurants);

/**
 * @swagger
 * /restaurants/{id}:
 *   get:
 *     summary: Détail d'un restaurant avec son menu
 *     tags: [Restaurants]
 */
router.get('/:id', ctrl.obtenirRestaurant);

router.post('/', verifierJWT, requireRole('ADMIN'), ctrl.creerRestaurant);
router.patch('/:id', verifierJWT, requireRole('RESPONSABLE_RESTO', 'ADMIN'), ctrl.mettreAJourRestaurant);

/**
 * @swagger
 * /restaurants/{restaurantId}/dashboard:
 *   get:
 *     summary: KPIs du jour (CA, taux d'annulation, nb commandes)
 *     tags: [Restaurants]
 */
router.get(
  '/:restaurantId/dashboard',
  verifierJWT,
  requireRole('RESPONSABLE_RESTO', 'ADMIN'),
  ctrl.tableauDeBord
);

module.exports = router;
// Catégories de menu (ex: "Entrées", "Plats", "Boissons")
const { creerCategorie } = require('../controllers/categorie.controller');
router.post('/categories', verifierJWT, requireRole('RESPONSABLE_RESTO', 'ADMIN'), creerCategorie);