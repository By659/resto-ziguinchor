const router = require('express').Router();
const { verifierJWT, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/demande-acces.controller');
router.use(verifierJWT);
router.post('/', ctrl.creerDemande);
router.get('/moi', ctrl.mesDemandes);
router.get('/', requireRole('ADMIN'), ctrl.listerDemandes);
router.patch('/:id', requireRole('ADMIN'), ctrl.traiterDemande);
module.exports = router;
