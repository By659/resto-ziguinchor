const prisma = require('../config/prisma');

async function creerCategorie(req, res, next) {
  try {
    const { nom, ordre, restaurantId } = req.body || {};
    if (typeof nom !== 'string' || !nom.trim() || typeof restaurantId !== 'string') {
      return res.status(400).json({ message: 'Nom de catégorie et restaurant requis' });
    }
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' });
    if (req.utilisateur.role !== 'ADMIN' && restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez gérer que le menu de votre restaurant' });
    }
    const categorie = await prisma.categorie.create({
      data: { nom: nom.trim(), ordre: Number.isInteger(ordre) ? ordre : 0, restaurantId },
    });
    res.status(201).json(categorie);
  } catch (err) { next(err); }
}

module.exports = { creerCategorie };
