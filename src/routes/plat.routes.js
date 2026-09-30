const router = require('express').Router();
const { verifierJWT, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/plat.controller');

router.post('/', verifierJWT, requireRole('RESPONSABLE_RESTO'), ctrl.creerPlat);
router.patch('/:id', verifierJWT, requireRole('RESPONSABLE_RESTO'), ctrl.mettreAJourPlat);

/**
 * @swagger
 * /plats/{id}/disponibilite:
 *   patch:
 *     summary: Active/désactive un plat en temps réel
 *     tags: [Plats]
 */
router.patch(
  '/:id/disponibilite',
  verifierJWT,
  requireRole('RESPONSABLE_RESTO'),
  ctrl.basculerDisponibilite
);

module.exports = router;
