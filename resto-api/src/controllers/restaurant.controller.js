const prisma = require('../config/prisma');

function heureEnMinutes(valeur) {
  if (!valeur) return null;
  const [heure, minute] = String(valeur).split(':').map(Number);
  return Number.isFinite(heure) && Number.isFinite(minute) ? heure * 60 + minute : null;
}

function restaurantOuvert(restaurant, date = new Date()) {
  const ouverture = heureEnMinutes(restaurant.heureOuverture); const fermeture = heureEnMinutes(restaurant.heureFermeture);
  if (ouverture === null || fermeture === null) return true;
  const actuelle = date.getHours() * 60 + date.getMinutes();
  return ouverture <= fermeture ? actuelle >= ouverture && actuelle <= fermeture : actuelle >= ouverture || actuelle <= fermeture;
}

function compatibleQuartier(restaurant, adresse, quartier) {
  const recherche = `${adresse || ''} ${quartier || ''}`.trim().toLowerCase();
  if (!recherche) return true;
  const texteRestaurant = `${restaurant.adresse || ''} ${restaurant.quartier || ''}`.toLowerCase();
  const zones = Array.isArray(restaurant.zonesLivraison) ? restaurant.zonesLivraison.map((zone) => String(zone).toLowerCase()) : [];
  // Sans coordonnées validées ni zones configurées, on ne prétend pas calculer une distance exacte.
  if (quartier) return texteRestaurant.includes(String(quartier).toLowerCase()) || zones.some((zone) => String(quartier).toLowerCase().includes(zone) || zone.includes(String(quartier).toLowerCase()));
  return zones.length ? zones.some((zone) => recherche.includes(zone)) : texteRestaurant.includes('ziguinchor');
}

async function rechercherRestaurants(req, res, next) {
  try {
    const { adresse, quartier, heureSouhaitee, page = 1, limit = 12 } = req.query;
    if (!adresse && !quartier) return res.status(400).json({ message: 'Indiquez une adresse ou un quartier pour rechercher.' });
    const dateRecherche = heureSouhaitee ? new Date(heureSouhaitee) : new Date();
    if (heureSouhaitee && Number.isNaN(dateRecherche.getTime())) return res.status(400).json({ message: 'La date ou l’heure demandée est invalide.' });
    const restaurants = await prisma.restaurant.findMany({ where: { actif: true }, include: { categories: { include: { plats: { where: { disponible: true } } } } }, orderBy: { nom: 'asc' } });
    const compatibles = restaurants.filter((restaurant) => compatibleQuartier(restaurant, adresse, quartier) && restaurantOuvert(restaurant, dateRecherche));
    const start = (Math.max(1, Number(page)) - 1) * Math.min(50, Number(limit)); const taille = Math.min(50, Math.max(1, Number(limit)));
    res.json({ page: Math.max(1, Number(page)), limit: taille, total: compatibles.length, precision: quartier ? 'Recherche par quartier/adresse textuelle ; distance exacte non disponible sans coordonnées validées.' : 'Recherche par adresse textuelle ; distance exacte non disponible sans coordonnées validées.', restaurants: compatibles.slice(start, start + taille) });
  } catch (err) { next(err); }
}

async function listerRestaurants(req, res, next) { try { const restaurants = await prisma.restaurant.findMany({ where: { actif: true } }); res.json(restaurants); } catch (err) { next(err); } }
async function monRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { responsableId: req.utilisateur.id } });
    if (!restaurant) return res.status(404).json({ message: 'Aucun restaurant n’est associé à ce compte' });
    res.json(restaurant);
  } catch (err) { next(err); }
}
async function obtenirRestaurant(req, res, next) { try { const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id }, include: { categories: { include: { plats: { include: { groupesOptions: { include: { options: true } } } } } } } }); if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' }); res.json(restaurant); } catch (err) { next(err); } }
async function creerRestaurant(req, res, next) { try { const restaurant = await prisma.restaurant.create({ data: req.body }); res.status(201).json(restaurant); } catch (err) { next(err); } }
async function mettreAJourRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' });
    if (req.utilisateur.role !== 'ADMIN' && restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que votre restaurant' });
    }
    const champs = ['nom', 'adresse', 'quartier', 'zonesLivraison', 'latitude', 'longitude', 'description', 'photoUrl', 'heureOuverture', 'heureFermeture', 'actif'];
    if (req.utilisateur.role === 'ADMIN') champs.push('tauxCommission', 'responsableId');
    const data = Object.fromEntries(champs.filter((cle) => req.body?.[cle] !== undefined).map((cle) => [cle, req.body[cle]]));
    const restaurantMaj = await prisma.restaurant.update({ where: { id: req.params.id }, data });
    res.json(restaurantMaj);
  } catch (err) { next(err); }
}

async function tableauDeBord(req, res, next) {
  try {
    const { restaurantId } = req.params;
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true, responsableId: true } });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' });
    if (req.utilisateur.role !== 'ADMIN' && restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez consulter que les statistiques de votre restaurant' });
    }
    const aujourdHui = new Date(); aujourdHui.setHours(0, 0, 0, 0);
    const commandesDuJour = await prisma.commande.findMany({ where: { restaurantId, createdAt: { gte: aujourdHui } }, include: { lignes: { include: { plat: true } } } });
    const caDuJour = commandesDuJour.filter((c) => c.statut === 'LIVREE').reduce((acc, c) => acc + c.montantTotal, 0);
    const totalCommandes = commandesDuJour.length;
    const annulees = commandesDuJour.filter((c) => c.statut === 'ANNULEE').length;
    const commandesParHeure = {};
    commandesDuJour.forEach((c) => { const heure = new Date(c.createdAt).getHours(); commandesParHeure[heure] = (commandesParHeure[heure] || 0) + 1; });
    const heureDePointe = Object.entries(commandesParHeure).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const quantitesParPlat = {};
    commandesDuJour.forEach((c) => c.lignes.forEach((l) => { quantitesParPlat[l.plat?.nom || 'Plat supprimé'] = (quantitesParPlat[l.plat?.nom || 'Plat supprimé'] || 0) + l.quantite; }));
    const platsPlusCommandes = Object.entries(quantitesParPlat).map(([nom, quantite]) => ({ nom, quantite })).sort((a, b) => b.quantite - a.quantite).slice(0, 5);
    res.json({ caDuJour, totalCommandes, tauxAnnulation: totalCommandes ? (annulees / totalCommandes) * 100 : 0, heureDePointe: heureDePointe === null ? null : Number(heureDePointe), platsPlusCommandes });
  } catch (err) { next(err); }
}
module.exports = { listerRestaurants, monRestaurant, rechercherRestaurants, obtenirRestaurant, creerRestaurant, mettreAJourRestaurant, tableauDeBord, restaurantOuvert, compatibleQuartier };
