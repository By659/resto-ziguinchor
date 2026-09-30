const prisma = require('../config/prisma');

async function listerRestaurants(req, res, next) {
  try {
    const restaurants = await prisma.restaurant.findMany({ where: { actif: true } });
    res.json(restaurants);
  } catch (err) { next(err); }
}

async function obtenirRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: { categories: { include: { plats: true } } },
    });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' });
    res.json(restaurant);
  } catch (err) { next(err); }
}

async function creerRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.create({ data: req.body });
    res.status(201).json(restaurant);
  } catch (err) { next(err); }
}

async function mettreAJourRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(restaurant);
  } catch (err) { next(err); }
}

// KPIs simples pour le tableau de bord restaurateur
async function tableauDeBord(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    const commandesDuJour = await prisma.commande.findMany({
      where: { restaurantId, createdAt: { gte: aujourdHui } },
      include: { lignes: true },
    });

    const caDuJour = commandesDuJour
      .filter((c) => c.statut === 'LIVREE')
      .reduce((acc, c) => acc + c.montantTotal, 0);

    const totalCommandes = commandesDuJour.length;
    const annulees = commandesDuJour.filter((c) => c.statut === 'ANNULEE').length;
    const tauxAnnulation = totalCommandes ? (annulees / totalCommandes) * 100 : 0;

    // TODO: heure de pointe + plats les plus commandés (agrégation sur LigneCommande)

    res.json({ caDuJour, totalCommandes, tauxAnnulation });
  } catch (err) { next(err); }
}

module.exports = {
  listerRestaurants,
  obtenirRestaurant,
  creerRestaurant,
  mettreAJourRestaurant,
  tableauDeBord,
};
