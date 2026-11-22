const prisma = require('../config/prisma');
const { transitionAutorisee, calculerMontantsCommande } = require('./commande.regles');

const ORS_GEOCODAGE_URL = 'https://api.heigit.org/pelias/v1/search';

// Génère un numéro de commande lisible pour l'écran KDS
function genererNumero() {
  return `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function geocoderAdresseLivraison(adresse) {
  if (!process.env.OPENROUTESERVICE_API_KEY || process.env.OPENROUTESERVICE_API_KEY === 'ors_key') {
    const err = new Error('Le géocodage OpenRouteService n’est pas configuré');
    err.statusCode = 503;
    throw err;
  }

  const url = new URL(ORS_GEOCODAGE_URL);
  url.searchParams.set('text', adresse);
  url.searchParams.set('boundary.country', 'SN');
  url.searchParams.set('size', '1');

  let reponse;
  try {
    reponse = await fetch(url, {
      headers: { Authorization: process.env.OPENROUTESERVICE_API_KEY },
    });
  } catch (cause) {
    const err = new Error('Impossible de contacter le service de géocodage');
    err.statusCode = 502;
    err.cause = cause;
    throw err;
  }

  if (!reponse.ok) {
    const corps = await reponse.text();
    console.log('Refus du service de géocodage', {
      url: url.toString(),
      status: reponse.status,
      body: corps,
    });
    const err = new Error('Le service de géocodage a refusé la requête');
    err.statusCode = 502;
    throw err;
  }

  let resultat;
  try {
    resultat = await reponse.json();
  } catch (cause) {
    const err = new Error('Réponse invalide du service de géocodage');
    err.statusCode = 502;
    err.cause = cause;
    throw err;
  }

  const coordonnees = resultat.features?.[0]?.geometry?.coordinates;
  if (
    !Array.isArray(coordonnees)
    || coordonnees.length < 2
    || !Number.isFinite(coordonnees[0])
    || !Number.isFinite(coordonnees[1])
    || Math.abs(coordonnees[0]) > 180
    || Math.abs(coordonnees[1]) > 90
  ) {
    const err = new Error('Adresse de livraison introuvable');
    err.statusCode = 422;
    throw err;
  }

  return { longitudeLivraison: coordonnees[0], latitudeLivraison: coordonnees[1] };
}

async function creerCommande(req, res, next) {
  try {
    const { restaurantId, type, lignes, heureSouhaitee, noteClient, adresseLivraison, methodePaiement = 'A_LA_LIVRAISON', couponId } = req.body;
    const clientId = req.utilisateur.id;
    if (!['LIVRAISON', 'SUR_PLACE', 'EMPORTER'].includes(type)) return res.status(400).json({ message: 'Type de commande invalide' });
    if (!Array.isArray(lignes) || lignes.length === 0) return res.status(400).json({ message: 'La commande doit contenir au moins un plat' });
    if (!['WAVE', 'A_LA_LIVRAISON'].includes(methodePaiement)) return res.status(400).json({ message: 'Mode de paiement invalide' });

    let coordonneesLivraison = {};
    if (type === 'LIVRAISON') {
      if (typeof adresseLivraison !== 'string' || !adresseLivraison.trim()) return res.status(400).json({ message: 'Une adresse de livraison est requise' });
      coordonneesLivraison = await geocoderAdresseLivraison(adresseLivraison.trim());
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || !restaurant.actif) return res.status(404).json({ message: 'Restaurant indisponible' });

    const coupon = couponId ? await prisma.coupon.findFirst({ where: { id: couponId, utilisateurId: clientId, utilise: false } }) : null;
    if (coupon && coupon.expireAt && coupon.expireAt <= new Date()) return res.status(409).json({ message: 'Ce coupon a expiré' });
    if (couponId && !coupon) return res.status(409).json({ message: 'Coupon invalide ou déjà utilisé' });
    const ids = lignes.map((ligne) => ligne?.platId).filter(Boolean);
    const plats = await prisma.plat.findMany({ where: { id: { in: ids }, restaurantId, disponible: true }, include: { groupesOptions: { include: { options: true } } } });
    const platsParId = new Map(plats.map((plat) => [plat.id, plat]));
    const lignesValidees = [];
    for (const ligne of lignes) {
      const plat = platsParId.get(ligne?.platId);
      const quantite = Number(ligne?.quantite);
      if (!plat || !Number.isInteger(quantite) || quantite < 1 || quantite > 50) {
        return res.status(409).json({ message: 'Un plat est indisponible, invalide ou ne correspond pas à ce restaurant' });
      }
      const optionIds = Array.isArray(ligne.optionIds) ? [...new Set(ligne.optionIds)] : [];
      const optionsDisponibles = plat.groupesOptions.flatMap((groupe) => groupe.options);
      const optionsChoisies = optionIds.map((id) => optionsDisponibles.find((option) => option.id === id)).filter(Boolean);
      if (optionsChoisies.length !== optionIds.length) return res.status(409).json({ message: `Une option de ${plat.nom} est invalide` });
      for (const groupe of plat.groupesOptions) {
        const nbChoisies = optionsChoisies.filter((option) => option.groupeId === groupe.id).length;
        if (groupe.obligatoire && nbChoisies === 0) return res.status(409).json({ message: `L'option « ${groupe.nom} » est obligatoire pour ${plat.nom}` });
        if (!groupe.choixMultiple && nbChoisies > 1) return res.status(409).json({ message: `Une seule option est autorisée dans « ${groupe.nom} »` });
      }
      const prixOptions = optionsChoisies.reduce((total, option) => total + option.prixSupplement, 0);
      lignesValidees.push({ platId: plat.id, quantite, prixUnitaire: plat.prix + prixOptions, options: { create: optionsChoisies.map((option) => ({ optionId: option.id })) } });
    }

    // Le prix vient exclusivement de la base : le prix envoyé par le navigateur est ignoré.
    let montants;
    try {
      montants = calculerMontantsCommande(lignesValidees, coupon, restaurant.tauxCommission);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const commande = await prisma.$transaction(async (tx) => {
      if (coupon) {
        const filtreCoupon = { id: coupon.id, utilisateurId: clientId, utilise: false };
        if (coupon.expireAt) filtreCoupon.expireAt = { gt: new Date() };
        const reservation = await tx.coupon.updateMany({ where: filtreCoupon, data: { utilise: true } });
        if (reservation.count !== 1) {
          const err = new Error('Ce coupon a déjà été utilisé ou a expiré');
          err.statusCode = 409;
          throw err;
        }
      }

      return tx.commande.create({
        data: {
          numero: genererNumero(), type, heureSouhaitee, noteClient,
          adresseLivraison: type === 'LIVRAISON' ? adresseLivraison.trim() : null,
          ...coordonneesLivraison,
          montantTotal: montants.montantTotal,
          montantCommission: montants.montantCommission,
          clientId, restaurantId,
          lignes: { create: lignesValidees },
          paiement: { create: { methode: methodePaiement, montant: montants.montantTotal, statut: 'EN_ATTENTE' } },
        },
        include: { lignes: true, paiement: true },
      });
    });
    req.app.get('io').to(`resto:${restaurantId}`).emit('nouvelle_commande', commande);
    res.status(201).json(commande);
  } catch (err) {
    next(err);
  }
}

async function changerStatut(req, res, next) {
  try {
    const { id } = req.params;
    const { statut } = req.body || {};
    const existante = await prisma.commande.findUnique({ where: { id }, include: { restaurant: true } });
    if (!existante) return res.status(404).json({ message: 'Commande introuvable' });
    if (req.utilisateur.role === 'RESPONSABLE_RESTO'
      && existante.restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez modifier que les commandes de votre restaurant' });
    }
    if (!transitionAutorisee(existante.statut, statut, existante.type, req.utilisateur.role)) {
      return res.status(409).json({ message: 'Transition de statut interdite pour cette commande' });
    }

    const data = { statut };
    if (statut === 'CONFIRMEE') data.confirmeeAt = new Date();
    if (statut === 'PRETE') data.preteAt = new Date();
    if (statut === 'LIVREE') data.livreeAt = new Date();

    // Compare-and-set : une deuxième requête concurrente ne peut pas réappliquer l'étape.
    const transition = await prisma.commande.updateMany({
      where: { id, statut: existante.statut },
      data,
    });
    if (transition.count !== 1) return res.status(409).json({ message: 'La commande a changé entre-temps ; actualisez son statut' });
    const commande = await prisma.commande.findUnique({ where: { id } });

    req.app.get('io').to(`resto:${commande.restaurantId}`).emit('statut_commande', commande);
    req.app.get('io').to(`commande:${commande.id}`).emit('statut_commande', commande);

    // Déclenché uniquement au passage à LIVREE : séquestre versé + points fidélité crédités
    if (statut === 'LIVREE') {
      const { crediterPoints } = require('./fidelite.controller');
      const { verserCommission } = require('./portefeuille.controller');
      await crediterPoints(commande.id);
      await verserCommission(commande.id);
    }

    res.json(commande);
  } catch (err) {
    next(err);
  }
}

async function obtenirCommande(req, res, next) {
  try {
    const commande = await prisma.commande.findUnique({
      where: { id: req.params.id },
      include: {
        restaurant: true,
        livreur: { include: { utilisateur: { select: { id: true } } } },
        lignes: { include: { plat: true, options: { include: { option: true } } } },
        paiement: true, livraison: true, notation: true,
      },
    });
    if (!commande) return res.status(404).json({ message: 'Commande introuvable' });
    const utilisateur = req.utilisateur;
    const autorise = utilisateur.role === 'ADMIN'
      || commande.clientId === utilisateur.id
      || (utilisateur.role === 'RESPONSABLE_RESTO' && commande.restaurant.responsableId === utilisateur.id)
      || (utilisateur.role === 'LIVREUR' && commande.livreur?.utilisateur?.id === utilisateur.id);
    if (!autorise) return res.status(403).json({ message: 'Vous ne pouvez pas consulter cette commande' });
    res.json(commande);
  } catch (err) {
    next(err);
  }
}

// Flux KDS : commandes actives d'un restaurant, triées par ordre d'arrivée
async function commandesRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.restaurantId }, select: { id: true, responsableId: true } });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant introuvable' });
    if (req.utilisateur.role === 'RESPONSABLE_RESTO' && restaurant.responsableId !== req.utilisateur.id) {
      return res.status(403).json({ message: 'Vous ne pouvez consulter que le KDS de votre restaurant' });
    }
    const commandes = await prisma.commande.findMany({
      where: {
        restaurantId: req.params.restaurantId,
        statut: { in: ['CONFIRMEE', 'EN_PREPARATION', 'PRETE'] },
      },
      orderBy: { createdAt: 'asc' },
      include: { lignes: { include: { plat: true } } },
    });
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

async function mesCommandes(req, res, next) {
  try {
    const commandes = await prisma.commande.findMany({
      where: { clientId: req.utilisateur.id },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: true,
        lignes: { include: { plat: true } },
        paiement: true,
        livraison: true,
      },
    });
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

async function commandesDisponiblesLivraison(req, res, next) {
  try {
    const commandes = await prisma.commande.findMany({
      where: { type: 'LIVRAISON', statut: 'PRETE', livreurId: null },
      orderBy: { preteAt: 'asc' },
      include: {
        restaurant: true,
        lignes: { include: { plat: true } },
      },
    });
    res.json(commandes);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  creerCommande,
  changerStatut,
  obtenirCommande,
  commandesRestaurant,
  mesCommandes,
  commandesDisponiblesLivraison,
};
