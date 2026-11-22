const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function register(req, res, next) {
  try {
    const { nom, telephone, email, motDePasse } = req.body || {};
    if (typeof nom !== 'string' || !nom.trim()
      || typeof telephone !== 'string' || !telephone.trim()
      || typeof motDePasse !== 'string' || motDePasse.length < 8) {
      return res.status(400).json({ message: 'Nom, téléphone et mot de passe (8 caractères minimum) sont requis.' });
    }
    const motDePasseHash = await bcrypt.hash(motDePasse, 10);
    const utilisateur = await prisma.utilisateur.create({
      // Les rôles privilégiés ne sont attribués qu'après validation administrative.
      data: { nom: nom.trim(), telephone: telephone.trim(), email: email?.trim() || null, motDePasseHash, role: 'CLIENT' },
    });
    res.status(201).json({ id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { telephone, motDePasse } = req.body;
    const utilisateur = await prisma.utilisateur.findUnique({ where: { telephone } });
    if (!utilisateur) return res.status(401).json({ message: 'Identifiants invalides' });

    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasseHash);
    if (!motDePasseValide) return res.status(401).json({ message: 'Identifiants invalides' });

    const token = jwt.sign(
      { id: utilisateur.id, role: utilisateur.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token, utilisateur: { id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
