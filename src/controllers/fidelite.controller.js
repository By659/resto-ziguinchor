const prisma = require('../config/prisma');

const POINTS_PAR_TRANCHE = 100; // 1 point par 100 FCFA dépensés

// À appeler quand une commande passe au statut LIVREE
async function crediterPoints(commandeId) {
  const commande = await prisma.commande.findUnique({ where: { id: commandeId } });
  const pointsGagnes = Math.floor(commande.montantTotal / POINTS_PAR_TRANCHE);

  await prisma.pointsFidelite.upsert({
    where: { utilisateurId: commande.clientId },
    update: { solde: { increment: pointsGagnes }, totalGagne: { increment: pointsGagnes } },
    create: { utilisateurId: commande.clientId, solde: pointsGagnes, totalGagne: pointsGagnes },
  });

  // TODO: vérifier les paliers (500 -> coupon 500 FCFA, 1000 -> coupon 1200 FCFA)
  // et générer un Coupon avec expiration à 30 jours si un palier est franchi
}

async function mesPoints(req, res, next) {
  try {
    const points = await prisma.pointsFidelite.findUnique({
      where: { utilisateurId: req.utilisateur.id },
    });
    res.json(points || { solde: 0, totalGagne: 0 });
  } catch (err) { next(err); }
}

module.exports = { crediterPoints, mesPoints };
