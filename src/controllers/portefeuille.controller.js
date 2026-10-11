const prisma = require('../config/prisma');

// À appeler quand une commande passe au statut LIVREE
// Crée la transaction en séquestre, puis la verse immédiatement (V1 : pas de délai de vérification)
async function verserCommission(commandeId, db = prisma) {
  const commande = await db.commande.findUnique({ where: { id: commandeId } });

  const portefeuille = await db.portefeuilleRestaurant.upsert({
    where: { restaurantId: commande.restaurantId },
    update: {},
    create: { restaurantId: commande.restaurantId },
  });

  const montantNet = commande.montantTotal - commande.montantCommission;

  await db.transactionPortefeuille.create({
    data: {
      portefeuilleId: portefeuille.id,
      commandeId: commande.id,
      montantBrut: commande.montantTotal,
      montantCommission: commande.montantCommission,
      montantNet,
      statut: 'VERSEE',
      verseeAt: new Date(),
    },
  });

  await db.portefeuilleRestaurant.update({
    where: { id: portefeuille.id },
    data: { solde: { increment: montantNet } },
  });
}

module.exports = { verserCommission };
