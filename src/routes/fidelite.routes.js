const router = require('express').Router();
const { verifierJWT } = require('../middleware/auth');
const { mesPoints } = require('../controllers/fidelite.controller');

router.get('/moi', verifierJWT, mesPoints);

module.exports = router;
