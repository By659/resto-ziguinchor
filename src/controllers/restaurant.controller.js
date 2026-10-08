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
      include: { lignes: { include: { plat: true } } },
    });

    const caDuJour = commandesDuJour
      .filter((c) => c.statut === 'LIVREE')
      .reduce((acc, c) => acc + c.montantTotal, 0);

    const totalCommandes = commandesDuJour.length;
    const annulees = commandesDuJour.filter((c) => c.statut === 'ANNULEE').length;
    const tauxAnnulation = totalCommandes ? (annulees / totalCommandes) * 100 : 0;

    // Heure de pointe : l'heure (0-23) qui a reçu le plus de commandes aujourd'hui.
    // TODO (fuseau horaire) : getHours() utilise l'heure du serveur, pas forcément celle
    // de Ziguinchor (UTC) — à corriger si le serveur de déploiement n'est pas sur UTC/GMT.
    const commandesParHeure = {};
    commandesDuJour.forEach((c) => {
      const heure = new Date(c.createdAt).getHours();
      commandesParHeure[heure] = (commandesParHeure[heure] || 0) + 1;
    });
    let heureDePointe = null;
    let maxCommandes = 0;
    for (const [heure, nb] of Object.entries(commandesParHeure)) {
      if (nb > maxCommandes) {
        maxCommandes = nb;
        heureDePointe = Number(heure);
      }
    }

    // Plats les plus commandés aujourd'hui (top 5, par quantité cumulée)
    const quantitesParPlat = {};
    commandesDuJour.forEach((c) => {
      c.lignes.forEach((l) => {
        const nom = l.plat?.nom || 'Plat supprimé';
        quantitesParPlat[nom] = (quantitesParPlat[nom] || 0) + l.quantite;
      });
    });
    const platsPlusCommandes = Object.entries(quantitesParPlat)
      .map(([nom, quantite]) => ({ nom, quantite }))
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    res.json({ caDuJour, totalCommandes, tauxAnnulation, heureDePointe, platsPlusCommandes });
  } catch (err) { next(err); }
}

module.exports = {
  listerRestaurants,
  obtenirRestaurant,
  creerRestaurant,
  mettreAJourRestaurant,
  tableauDeBord,
};
