const prisma = require('../config/prisma');
// TODO: importer le SDK/HTTP client Wave sandbox une fois la clé obtenue

async function initierPaiementWave(req, res, next) {
  try {
    const { commandeId } = req.body;
    const commande = await prisma.commande.findUnique({ where: { id: commandeId } });

    // TODO: appeler l'API Wave sandbox pour générer un lien/QR de paiement
    const paiement = await prisma.paiement.create({
      data: {
        commandeId,
        methode: 'WAVE',
        montant: commande.montantTotal,
        statut: 'EN_ATTENTE',
      },
    });

    res.status(201).json({ paiement, lienPaiement: 'https://pay.wave.com/sandbox/xxxx' });
  } catch (err) { next(err); }
}

// Webhook appelé par Wave à la confirmation du paiement
async function webhookWave(req, res, next) {
  try {
    const { referenceWave, statut } = req.body; // format à adapter selon la doc Wave sandbox

    const paiement = await prisma.paiement.updateMany({
      where: { referenceWave },
      data: { statut: statut === 'success' ? 'PAYE' : 'ECHOUE', payeAt: new Date() },
    });

    res.json({ recu: true });
  } catch (err) { next(err); }
}

module.exports = { initierPaiementWave, webhookWave };
