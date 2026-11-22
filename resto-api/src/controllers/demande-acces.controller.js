const prisma = require('../config/prisma');

async function creerDemande(req, res, next) {
  try {
    const { type, donnees = {} } = req.body;
    if (!['RESTAURATEUR', 'LIVREUR'].includes(type)) return res.status(400).json({ message: 'Type de demande invalide.' });
    const existante = await prisma.demandeAcces.findFirst({ where: { utilisateurId: req.utilisateur.id, type, statut: 'EN_ATTENTE' } });
    if (existante) return res.status(409).json({ message: 'Une demande est déjà en attente pour ce parcours.' });
    const demande = await prisma.demandeAcces.create({ data: { utilisateurId: req.utilisateur.id, type, donnees } });
    res.status(201).json(demande);
  } catch (err) { next(err); }
}

async function mesDemandes(req, res, next) {
  try { res.json(await prisma.demandeAcces.findMany({ where: { utilisateurId: req.utilisateur.id }, orderBy: { createdAt: 'desc' } })); } catch (err) { next(err); }
}

async function listerDemandes(req, res, next) {
  try { res.json(await prisma.demandeAcces.findMany({ include: { utilisateur: { select: { id: true, nom: true, telephone: true, email: true } } }, orderBy: { createdAt: 'asc' } })); } catch (err) { next(err); }
}

async function traiterDemande(req, res, next) {
  try {
    const { statut, motifAdmin } = req.body;
    if (!['APPROUVEE', 'REFUSEE'].includes(statut)) return res.status(400).json({ message: 'Statut de traitement invalide.' });
    const demande = await prisma.demandeAcces.update({ where: { id: req.params.id }, data: { statut, motifAdmin } });
    // Le compte reste unique ; le rôle principal est activé uniquement après approbation.
    if (statut === 'APPROUVEE') await prisma.utilisateur.update({ where: { id: demande.utilisateurId }, data: { role: demande.type === 'RESTAURATEUR' ? 'RESPONSABLE_RESTO' : 'LIVREUR' } });
    res.json(demande);
  } catch (err) { next(err); }
}

module.exports = { creerDemande, mesDemandes, listerDemandes, traiterDemande };
