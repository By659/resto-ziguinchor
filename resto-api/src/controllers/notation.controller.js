const prisma = require('../config/prisma');

async function noterCommande(req, res, next) {
  try {
    const { commandeId } = req.params;
    const { noteRepas, noteLivreur, commentaire } = req.body;
    if (!Number.isInteger(noteRepas) || noteRepas < 1 || noteRepas > 5) return res.status(400).json({ message: 'La note du repas doit être comprise entre 1 et 5' });
    if (noteLivreur != null && (!Number.isInteger(noteLivreur) || noteLivreur < 1 || noteLivreur > 5)) return res.status(400).json({ message: 'La note du livreur doit être comprise entre 1 et 5' });
    const commande = await prisma.commande.findFirst({ where: { id: commandeId, clientId: req.utilisateur.id }, include: { notation: true } });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
    if (commande.statut !== 'LIVREE') return res.status(409).json({ message: 'Cette commande ne peut être notée qu’après livraison' });
    if (commande.notation) return res.status(409).json({ message: 'Cette commande a déjà été notée' });
    const notation = await prisma.notation.create({ data: { commandeId, clientId: req.utilisateur.id, noteRepas, noteLivreur: commande.livreurId ? (noteLivreur ?? null) : null, commentaire: commentaire?.trim() || null } });
    res.status(201).json(notation);
  } catch (err) { next(err); }
}

module.exports = { noterCommande };
