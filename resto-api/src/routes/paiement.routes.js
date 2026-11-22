const router = require('express').Router();
const { verifierJWT } = require('../middleware/auth');
const ctrl = require('../controllers/paiement.controller');

router.post('/wave/init', verifierJWT, ctrl.initierPaiementWave);
router.post('/wave/webhook', ctrl.webhookWave); // appelé par Wave, pas par un utilisateur connecté

module.exports = router;
