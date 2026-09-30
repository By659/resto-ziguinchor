const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/restaurants', require('./restaurant.routes'));
router.use('/plats', require('./plat.routes'));
router.use('/commandes', require('./commande.routes'));
router.use('/paiements', require('./paiement.routes'));
router.use('/livraisons', require('./livraison.routes'));
router.use('/fidelite', require('./fidelite.routes'));

module.exports = router;
