const router = require('express').Router();
const { verifierJWT } = require('../middleware/auth');
const { mesPoints, mesCoupons } = require('../controllers/fidelite.controller');

router.get('/moi', verifierJWT, mesPoints);
router.get('/mes-coupons', verifierJWT, mesCoupons);

module.exports = router;
