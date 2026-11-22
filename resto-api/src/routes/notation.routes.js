const router = require('express').Router();
const { verifierJWT, requireRole } = require('../middleware/auth');
const { noterCommande } = require('../controllers/notation.controller');

router.post('/commandes/:commandeId', verifierJWT, requireRole('CLIENT'), noterCommande);

module.exports = router;
