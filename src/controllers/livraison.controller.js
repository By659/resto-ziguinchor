const prisma = require('../config/prisma');

// Depuis le 28/09/2026, l'ancienne URL api.openrouteservice.org est coupée : on utilise
// désormais api.heigit.org, avec une requête POST (JSON) au lieu d'un GET avec paramètres.
const ORS_BASE_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson';

function orsEstConfigure() {
  return process.env.OPENROUTESERVICE_API_KEY && process.env.OPENROUTESERVICE_API_KEY !== 'ors_key';
}

// Calcule distance/durée/tracé entre le restaurant et le point de livraison via OpenRouteService.
// Si la clé n'est pas configurée ou que les coordonnées de destination manquent, on saute le calcul
// (distanceKm/dureeEstimeeMin restent null) plutôt que de faire échouer l'acceptation de la course.
async function calculerItineraire(origine, destination) {
  if (!orsEstConfigure() || !destination) return { distanceKm: null, dureeEstimeeMin: null, itineraireGeoJson: null };

  const reponse = await fetch(ORS_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: process.env.OPENROUTESERVICE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [origine.longitude, origine.latitude],
        [destination.longitude, destination.latitude],
      ],
    }),
  });

  const data = await reponse.json();

  if (!reponse.ok || !data.features?.[0]) {
    return { distanceKm: null, dureeEstimeeMin: null, itineraireGeoJson: null };
  }

  const resume = data.features[0].properties.summary;
  return {
    distanceKm: +(resume.distance / 1000).toFixed(2),
    dureeEstimeeMin: Math.round(resume.duration / 60),
    itineraireGeoJson: JSON.stringify(data.features[0].geometry),
  };
}

async function accepterCourse(req, res, next) {
  try {
    // destinationLat/destinationLng : coordonnées du point de livraison.
    // TODO (amélioration schéma) : stocker l'adresse/coordonnées de livraison sur la Commande
    // elle-même à la création, plutôt que de les redemander ici.
    const { commandeId, destinationLat, destinationLng } = req.body;

    // Commande.livreurId référence Livreur.id (pas directement Utilisateur.id) :
    // on retrouve/crée d'abord le profil Livreur associé à l'utilisateur connecté.
    const livreur = await prisma.livreur.upsert({
      where: { utilisateurId: req.utilisateur.id },
      update: {},
      create: { utilisateurId: req.utilisateur.id, statut: 'EN_COURSE' },
    });

    const commande = await prisma.commande.update({
      where: { id: commandeId },
      data: { livreurId: livreur.id, statut: 'EN_LIVRAISON' },
    });

    const restaurant = await prisma.restaurant.findUnique({ where: { id: commande.restaurantId } });

    const destination = destinationLat && destinationLng
      ? { latitude: destinationLat, longitude: destinationLng }
      : null;

    const { distanceKm, dureeEstimeeMin, itineraireGeoJson } = await calculerItineraire(restaurant, destination);

    const livraison = await prisma.livraison.create({
      data: { commandeId, livreurId: livreur.id, distanceKm, dureeEstimeeMin, itineraireGeoJson },
    });

    res.status(201).json(livraison);
  } catch (err) {
    next(err);
  }
}

async function confirmerLivraison(req, res, next) {
  try {
    const livraison = await prisma.livraison.update({
      where: { id: req.params.id },
      data: { confirmeeAt: new Date() },
    });
    res.json(livraison);
  } catch (err) {
    next(err);
  }
}

module.exports = { accepterCourse, confirmerLivraison };
