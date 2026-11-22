const prisma = require('../config/prisma');

const WAVE_BASE_URL = 'https://api.wave.com';

// Vrai appel à l'API Wave Checkout (nécessite un compte Wave Business vérifié + une clé API réelle).
// Si aucune clé n'est configurée (WAVE_API_KEY absente ou valeur par défaut), on bascule en mode
// simulation pour ne pas bloquer le développement/démo en attendant la validation KYB du compte marchand.
function waveEstConfigure() {
  return process.env.WAVE_API_KEY && process.env.WAVE_API_KEY !== 'sandbox_key';
}

async function initierPaiementWave(req, res, next) {
  try {
    const { commandeId } = req.body;
    const commande = await prisma.commande.findUnique({ where: { id: commandeId } });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });

    if (!waveEstConfigure()) {
      // Mode simulation : aucune clé Wave réelle configurée
      const paiement = await prisma.paiement.create({
        data: { commandeId, methode: 'WAVE', montant: commande.montantTotal, statut: 'EN_ATTENTE' },
      });
      return res.status(201).json({
        paiement,
        mode: 'simulation',
        lienPaiement: null,
        message: "Clé Wave non configurée : compte marchand Wave Business en attente de vérification KYB.",
      });
    }

    // Vraie session de paiement Wave Checkout
    const reponse = await fetch(`${WAVE_BASE_URL}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WAVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(commande.montantTotal),
        currency: 'XOF',
        success_url: `${process.env.APP_URL}/paiement/succes`,
        error_url: `${process.env.APP_URL}/paiement/erreur`,
        client_reference: commande.numero,
      }),
    });

    const session = await reponse.json();
    if (!reponse.ok) {
      const erreur = new Error(session.message || 'Erreur lors de la création de la session Wave');
      erreur.statusCode = reponse.status;
      throw erreur;
    }

    const paiement = await prisma.paiement.create({
      data: {
        commandeId,
        methode: 'WAVE',
        montant: commande.montantTotal,
        statut: 'EN_ATTENTE',
        referenceWave: session.id,
      },
    });

    res.status(201).json({ paiement, mode: 'reel', lienPaiement: session.wave_launch_url });
  } catch (err) {
    next(err);
  }
}

// Webhook appelé par Wave à la confirmation (ou l'échec) du paiement.
// IMPORTANT : en production, il faut vérifier le header "Wave-Signature" (HMAC-SHA256 avec
// WAVE_WEBHOOK_SECRET) avant de faire confiance à ce payload — non fait ici par simplicité (TODO).
async function webhookWave(req, res, next) {
  try {
    const event = req.body; // Wave envoie un objet { type, data }

    if (event.type === 'checkout.session.completed') {
      const session = event.data;
      await prisma.paiement.updateMany({
        where: { referenceWave: session.id },
        data: { statut: 'PAYE', payeAt: new Date() },
      });
    }

    res.json({ recu: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { initierPaiementWave, webhookWave };
