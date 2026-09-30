const prisma = require('../config/prisma');

async function creerCategorie(req, res, next) {
  try {
    const { nom, ordre, restaurantId } = req.body;
    const categorie = await prisma.categorie.create({
      data: { nom, ordre: ordre || 0, restaurantId },
    });
    res.status(201).json(categorie);
  } catch (err) { next(err); }
}

module.exports = { creerCategorie };
