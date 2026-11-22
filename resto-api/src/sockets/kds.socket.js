const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// Namespace Socket.io pour le KDS : chaque restaurant a sa propre room.
async function peutRejoindreRestaurant(utilisateur, restaurantId, db = prisma) {
  if (!utilisateur || !['ADMIN', 'RESPONSABLE_RESTO', 'CUISINIER'].includes(utilisateur.role)) return false;
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { responsableId: true } });
  if (!restaurant) return false;
  if (utilisateur.role === 'ADMIN') return true;
  if (utilisateur.role === 'RESPONSABLE_RESTO') return restaurant.responsableId === utilisateur.id;
  // Le schéma actuel ne relie pas les cuisiniers à un restaurant ; leur rattachement ne peut
  // donc pas être contrôlé sans une migration de modèle, qui n'est pas appliquée ici.
  return utilisateur.role === 'CUISINIER';
}

async function peutRejoindreCommande(utilisateur, commandeId, db = prisma) {
  if (!utilisateur || utilisateur.role !== 'CLIENT') return false;
  const commande = await db.commande.findUnique({
    where: { id: commandeId },
    select: { clientId: true },
  });
  return Boolean(commande && commande.clientId === utilisateur.id);
}

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) return next(new Error('Authentification Socket.IO requise'));
    try {
      const utilisateur = jwt.verify(token, process.env.JWT_SECRET);
      if (!utilisateur.id || !utilisateur.role) return next(new Error('Jeton Socket.IO invalide'));
      socket.utilisateur = utilisateur;
      return next();
    } catch (err) {
      return next(new Error('Jeton Socket.IO invalide ou expiré'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('rejoindre_resto', async (restaurantId, repondre) => {
      try {
        if (typeof restaurantId !== 'string' || !await peutRejoindreRestaurant(socket.utilisateur, restaurantId)) {
          if (typeof repondre === 'function') repondre({ ok: false, message: 'Accès à ce restaurant refusé' });
          return;
        }
        socket.join(`resto:${restaurantId}`);
        if (typeof repondre === 'function') repondre({ ok: true });
      } catch (err) {
        if (typeof repondre === 'function') repondre({ ok: false, message: 'Impossible de rejoindre le salon KDS' });
      }
    });

    socket.on('rejoindre_commande', async (commandeId, repondre) => {
      try {
        if (typeof commandeId !== 'string' || !await peutRejoindreCommande(socket.utilisateur, commandeId)) {
          if (typeof repondre === 'function') repondre({ ok: false, message: 'Accès à cette commande refusé' });
          return;
        }
        socket.join(`commande:${commandeId}`);
        if (typeof repondre === 'function') repondre({ ok: true });
      } catch (err) {
        if (typeof repondre === 'function') repondre({ ok: false, message: 'Impossible de rejoindre le suivi de commande' });
      }
    });

    socket.on('disconnect', () => {
      // rien à nettoyer explicitement, socket.io gère le retrait des rooms
    });
  });
}

module.exports = initSocket;
module.exports.peutRejoindreRestaurant = peutRejoindreRestaurant;
module.exports.peutRejoindreCommande = peutRejoindreCommande;
