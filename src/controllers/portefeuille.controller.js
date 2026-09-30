const prisma = require('../config/prisma');

// À appeler quand une commande passe au statut LIVREE
// Crée la transaction en séquestre, puis la verse immédiatement (V1 : pas de délai de vérification)
async function verserCommission(commandeId) {
  const commande = await prisma.commande.findUnique({ where: { id: commandeId } });

  const portefeuille = await prisma.portefeuilleRestaurant.upsert({
    where: { restaurantId: commande.restaurantId },
    update: {},
    create: { restaurantId: commande.restaurantId },
  });

  const montantNet = commande.montantTotal - commande.montantCommission;

  await prisma.transactionPortefeuille.create({
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

  await prisma.portefeuilleRestaurant.update({
    where: { id: portefeuille.id },
    data: { solde: { increment: montantNet } },
  });
}

module.exports = { verserCommission };
