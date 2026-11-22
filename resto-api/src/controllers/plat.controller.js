const prisma = require('../config/prisma');

async function creerPlat(req, res, next) {
  try {
    const { nom, description, photoUrl, prix, restaurantId, categorieId } = req.body || {};
    if (typeof nom !== 'string' || !nom.trim() || !Number.isFinite(Number(prix)) || Number(prix) < 0) {
      return res.status(400).json({ message: 'Nom du plat et prix valide sont requis' });
    }
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' });
    if (restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez gérer que le menu de votre restaurant' });
    }
    const categorie = await prisma.categorie.findFirst({ where: { id: categorieId, restaurantId } });
    if (!categorie) return res.status(400).json({ message: 'La catégorie ne correspond pas à votre restaurant' });
    const plat = await prisma.plat.create({
      data: { nom: nom.trim(), description, photoUrl, prix: Number(prix), restaurantId, categorieId },
    });
    res.status(201).json(plat);
  } catch (err) { next(err); }
}

// Toggle disponibilité en temps réel (ex: rupture d'un ingrédient)
async function basculerDisponibilite(req, res, next) {
  try {
    const plat = await prisma.plat.findUnique({ where: { id: req.params.id }, include: { restaurant: true } });
    if (!plat) return res.status(404).json({ message: 'Plat introuvable' });
    if (plat.restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez gérer que le menu de votre restaurant' });
    }
    const platMaj = await prisma.plat.update({
      where: { id: req.params.id },
      data: { disponible: !plat.disponible },
    });
    req.app.get('io').to(`resto:${plat.restaurantId}`).emit('plat_dispo_maj', platMaj);
    res.json(platMaj);
  } catch (err) { next(err); }
}

async function mettreAJourPlat(req, res, next) {
  try {
    const existant = await prisma.plat.findUnique({ where: { id: req.params.id }, include: { restaurant: true } });
    if (!existant) return res.status(404).json({ message: 'Plat introuvable' });
    if (existant.restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez gérer que le menu de votre restaurant' });
    }
    const { nom, description, photoUrl, prix, disponible, categorieId } = req.body || {};
    if (prix !== undefined && (!Number.isFinite(Number(prix)) || Number(prix) < 0)) {
      return res.status(400).json({ message: 'Le prix doit être un montant positif valide' });
    }
    if (disponible !== undefined && typeof disponible !== 'boolean') {
      return res.status(400).json({ message: 'La disponibilité doit être un booléen' });
    }
    if (categorieId !== undefined) {
      const categorie = await prisma.categorie.findFirst({ where: { id: categorieId, restaurantId: existant.restaurantId } });
      if (!categorie) return res.status(400).json({ message: 'La catégorie ne correspond pas à votre restaurant' });
    }
    const data = {};
    if (nom !== undefined) data.nom = String(nom).trim();
    if (description !== undefined) data.description = description;
    if (photoUrl !== undefined) data.photoUrl = photoUrl;
    if (prix !== undefined) data.prix = Number(prix);
    if (disponible !== undefined) data.disponible = disponible;
    if (categorieId !== undefined) data.categorieId = categorieId;
    const plat = await prisma.plat.update({ where: { id: req.params.id }, data });
    if (disponible !== undefined) req.app.get('io').to(`resto:${plat.restaurantId}`).emit('plat_dispo_maj', plat);
    res.json(plat);
  } catch (err) { next(err); }
}

async function supprimerPlat(req, res, next) {
  try {
    const plat = await prisma.plat.findUnique({ where: { id: req.params.id }, include: { restaurant: true } });
    if (!plat) return res.status(404).json({ message: 'Plat introuvable' });
    if (plat.restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez gérer que le menu de votre restaurant' });
    }
    await prisma.plat.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { creerPlat, basculerDisponibilite, mettreAJourPlat, supprimerPlat };
