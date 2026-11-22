const jwt = require('jsonwebtoken');

// Vérifie la présence et la validité du token JWT
function verifierJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = payload; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}

// Vérifie que l'utilisateur a l'un des rôles autorisés
// Usage : requireRole('ADMIN', 'RESPONSABLE_RESTO')
function requireRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ message: 'Accès refusé pour ce rôle' });
    }
    next();
  };
}

module.exports = { verifierJWT, requireRole };
