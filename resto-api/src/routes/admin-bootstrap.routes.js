const router = require('express').Router();
const { initialiserPremierAdmin } = require('../controllers/admin-bootstrap.controller');

router.post('/', initialiserPremierAdmin);

module.exports = router;
