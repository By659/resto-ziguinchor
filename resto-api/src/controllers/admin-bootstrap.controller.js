const crypto = require('crypto');
const prisma = require('../config/prisma');

function secretsIdentiques(fourni, attendu) {
  const bufferFourni = Buffer.from(fourni);
  const bufferAttendu = Buffer.from(attendu);
  return bufferFourni.length === bufferAttendu.length
    && crypto.timingSafeEqual(bufferFourni, bufferAttendu);
}

async function initialiserPremierAdmin(req, res, next) {
  const secretAttendu = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (process.env.NODE_ENV !== 'production'
    || !secretAttendu
    || Buffer.byteLength(secretAttendu) < 32) {
    return res.status(404).json({ message: 'Initialisation indisponible.' });
  }

  const secretFourni = req.get('x-admin-bootstrap-secret') || '';
  if (!secretsIdentiques(secretFourni, secretAttendu)) {
    return res.status(403).json({ message: 'Secret d’initialisation invalide.' });
  }

  const telephone = typeof req.body?.telephone === 'string' ? req.body.telephone.trim() : '';
  if (!telephone) return res.status(400).json({ message: 'Le téléphone du compte existant est requis.' });

  try {
    const resultat = await prisma.$transaction(async (tx) => {
      const nombreAdmins = await tx.utilisateur.count({ where: { role: 'ADMIN' } });
      if (nombreAdmins > 0) return 'admin-existant';

      const utilisateur = await tx.utilisateur.findUnique({
        where: { telephone },
        select: { id: true, role: true },
      });
      if (!utilisateur || utilisateur.role !== 'CLIENT') return 'compte-introuvable';

      const promotion = await tx.utilisateur.updateMany({
        where: { id: utilisateur.id, role: 'CLIENT' },
        data: { role: 'ADMIN' },
      });
      return promotion.count === 1 ? 'initialise' : 'conflit';
    }, { isolationLevel: 'Serializable' });

    if (resultat === 'admin-existant') {
      return res.status(409).json({ message: 'Un administrateur existe déjà; initialisation verrouillée.' });
    }
    if (resultat === 'compte-introuvable') {
      return res.status(404).json({ message: 'Compte client introuvable. Crée le compte avant l’initialisation.' });
    }
    if (resultat === 'conflit') {
      return res.status(409).json({ message: 'Le compte a changé; actualise la page et réessaie.' });
    }

    return res.status(201).json({
      message: 'Administrateur initialisé. Déconnecte-toi puis reconnecte-toi pour actualiser ton rôle.',
    });
  } catch (err) {
    if (err.code === 'P2034') {
      return res.status(409).json({ message: 'Initialisation déjà utilisée ou conflit; actualise la page.' });
    }
    return next(err);
  }
}

module.exports = { initialiserPremierAdmin };
