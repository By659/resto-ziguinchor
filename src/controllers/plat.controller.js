const prisma = require('../config/prisma');

async function creerPlat(req, res, next) {
  try {
    const plat = await prisma.plat.create({ data: req.body });
    res.status(201).json(plat);
  } catch (err) { next(err); }
}

// Toggle disponibilité en temps réel (ex: rupture d'un ingrédient)
async function basculerDisponibilite(req, res, next) {
  try {
    const plat = await prisma.plat.findUnique({ where: { id: req.params.id } });
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
    const plat = await prisma.plat.update({ where: { id: req.params.id }, data: req.body });
    res.json(plat);
  } catch (err) { next(err); }
}

async function supprimerPlat(req, res, next) {
  try {
    await prisma.plat.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { creerPlat, basculerDisponibilite, mettreAJourPlat, supprimerPlat };
