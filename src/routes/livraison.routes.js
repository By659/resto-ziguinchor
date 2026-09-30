const router = require('express').Router();
const { verifierJWT, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/livraison.controller');

router.post('/accepter', verifierJWT, requireRole('LIVREUR'), ctrl.accepterCourse);
router.patch('/:id/confirmer', verifierJWT, requireRole('LIVREUR'), ctrl.confirmerLivraison);

module.exports = router;
