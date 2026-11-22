const prisma = require('../config/prisma');

const POINTS_PAR_TRANCHE = 100;
const PALIERS = [
  { seuil: 500, montantFixe: 500 },
  { seuil: 1000, montantFixe: 1200 },
];

function codeCoupon(seuil) {
  return `ZIG-${seuil}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Appelé une seule fois lors du passage effectif d'une commande à LIVREE.
async function crediterPoints(commandeId, db = prisma) {
  const commande = await db.commande.findUnique({ where: { id: commandeId } });
  if (!commande) return;
  const compteAvant = await db.pointsFidelite.findUnique({ where: { utilisateurId: commande.clientId } });
  const pointsGagnes = Math.floor(commande.montantTotal / POINTS_PAR_TRANCHE);
  const totalAvant = compteAvant?.totalGagne || 0;
  const compte = await db.pointsFidelite.upsert({
    where: { utilisateurId: commande.clientId },
    update: { solde: { increment: pointsGagnes }, totalGagne: { increment: pointsGagnes } },
    create: { utilisateurId: commande.clientId, solde: pointsGagnes, totalGagne: pointsGagnes },
  });

  for (const palier of PALIERS) {
    if (totalAvant < palier.seuil && compte.totalGagne >= palier.seuil) {
      await db.coupon.create({
        data: {
          code: codeCoupon(palier.seuil),
          utilisateurId: commande.clientId,
          montantFixe: palier.montantFixe,
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  return compte;
}

async function mesPoints(req, res, next) {
  try {
    const points = await prisma.pointsFidelite.findUnique({ where: { utilisateurId: req.utilisateur.id } });
    res.json(points || { solde: 0, totalGagne: 0 });
  } catch (err) { next(err); }
}

async function mesCoupons(req, res, next) {
  try {
    const coupons = await prisma.coupon.findMany({ where: { utilisateurId: req.utilisateur.id }, orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch (err) { next(err); }
}

module.exports = { crediterPoints, mesPoints, mesCoupons };
