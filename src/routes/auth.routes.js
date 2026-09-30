const router = require('express').Router();
const { register, login } = require('../controllers/auth.controller');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur (client, livreur, etc.)
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: Utilisateur créé
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion et récupération d'un token JWT
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token JWT retourné
 */
router.post('/login', login);

module.exports = router;
