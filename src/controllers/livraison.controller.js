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
    const { commandeId } = req.body;
    if (typeof commandeId !== 'string' || !commandeId) {
      return res.status(400).json({ message: 'L’identifiant de la commande est requis' });
    }

    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: { restaurant: true },
    });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
    if (commande.type !== 'LIVRAISON' || commande.statut !== 'PRETE' || commande.livreurId) {
      return res.status(409).json({ message: 'Cette commande n’est plus disponible à la livraison' });
    }
    if (commande.latitudeLivraison == null || commande.longitudeLivraison == null) {
      return res.status(422).json({ message: 'Les coordonnées de livraison sont manquantes' });
    }

    const destination = {
      latitude: commande.latitudeLivraison,
      longitude: commande.longitudeLivraison,
    };
    const { distanceKm, dureeEstimeeMin, itineraireGeoJson } = await calculerItineraire(
      commande.restaurant,
      destination
    );

    const livraison = await prisma.$transaction(async (tx) => {
      // Commande.livreurId référence Livreur.id, pas Utilisateur.id.
      const livreur = await tx.livreur.upsert({
        where: { utilisateurId: req.utilisateur.id },
        update: { statut: 'EN_COURSE' },
        create: { utilisateurId: req.utilisateur.id, statut: 'EN_COURSE' },
      });

      const attribution = await tx.commande.updateMany({
        where: {
          id: commandeId,
          type: 'LIVRAISON',
          statut: 'PRETE',
          livreurId: null,
        },
        data: { livreurId: livreur.id, statut: 'EN_LIVRAISON' },
      });
      if (attribution.count === 0) {
        const err = new Error('Cette commande vient d’être acceptée par un autre livreur');
        err.statusCode = 409;
        throw err;
      }

      return tx.livraison.create({
        data: { commandeId, livreurId: livreur.id, distanceKm, dureeEstimeeMin, itineraireGeoJson },
      });
    });

    res.status(201).json(livraison);
  } catch (err) {
    next(err);
  }
}

async function confirmerLivraison(req, res, next) {
  try {
    const existante = await prisma.livraison.findUnique({
      where: { id: req.params.id },
      include: { livreur: true },
    });
    if (!existante) return res.status(404).json({ message: 'Livraison introuvable' });
    if (existante.livreur.utilisateurId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Cette livraison ne vous est pas attribuée' });
    }

    const { crediterPoints } = require('./fidelite.controller');
    const { verserCommission } = require('./portefeuille.controller');
    const livraison = await prisma.$transaction(async (tx) => {
      const transition = await tx.commande.updateMany({
        where: {
          id: existante.commandeId,
          statut: 'EN_LIVRAISON',
          livreurId: existante.livreurId,
        },
        data: { statut: 'LIVREE', livreeAt: new Date() },
      });
      if (transition.count === 0) {
        const err = new Error('Cette commande n’est plus en cours de livraison');
        err.statusCode = 409;
        throw err;
      }

      const confirmee = await tx.livraison.update({
        where: { id: existante.id },
        data: { confirmeeAt: new Date() },
      });
      await tx.livreur.update({
        where: { id: existante.livreurId },
        data: { statut: 'DISPONIBLE' },
      });
      await crediterPoints(existante.commandeId, tx);
      await verserCommission(existante.commandeId, tx);
      return confirmee;
    });

    res.json(livraison);
  } catch (err) {
    next(err);
  }
}

async function mesLivraisons(req, res, next) {
  try {
    const livraisons = await prisma.livraison.findMany({
      where: {
        livreur: { utilisateurId: req.utilisateur.id },
        confirmeeAt: null,
        commande: { statut: 'EN_LIVRAISON' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        commande: {
          include: { restaurant: true, lignes: { include: { plat: true } } },
        },
      },
    });
    res.json(livraisons);
  } catch (err) {
    next(err);
  }
}

module.exports = { accepterCourse, confirmerLivraison, mesLivraisons };
