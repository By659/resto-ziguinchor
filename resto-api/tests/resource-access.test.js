jest.mock('../src/config/prisma', () => ({
  restaurant: { findUnique: jest.fn(), update: jest.fn() },
  categorie: { findFirst: jest.fn(), create: jest.fn() },
  plat: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  commande: { findMany: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const { mettreAJourRestaurant, tableauDeBord, monRestaurant } = require('../src/controllers/restaurant.controller');
const { creerPlat, basculerDisponibilite } = require('../src/controllers/plat.controller');
const { creerCategorie } = require('../src/controllers/categorie.controller');

function reponseMock() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('propriété des ressources restaurant', () => {
  beforeEach(() => jest.clearAllMocks());

  test('un responsable ne modifie pas les paramètres d’un autre restaurant', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ id: 'r-1', responsableId: 'proprietaire' });
    const res = reponseMock();
    await mettreAJourRestaurant({ params: { id: 'r-1' }, body: { nom: 'Intrusion' }, utilisateur: { id: 'autre', role: 'RESPONSABLE_RESTO' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.restaurant.update).not.toHaveBeenCalled();
  });

  test('le responsable ne consulte pas le dashboard d’un autre restaurant', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ id: 'r-2', responsableId: 'proprietaire' });
    const res = reponseMock();
    await tableauDeBord({ params: { restaurantId: 'r-2' }, utilisateur: { id: 'autre', role: 'RESPONSABLE_RESTO' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.commande.findMany).not.toHaveBeenCalled();
  });

  test('un responsable ne crée pas de plat ou catégorie pour un autre établissement', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ id: 'r-3', responsableId: 'proprietaire' });
    const resCategorie = reponseMock();
    await creerCategorie({ body: { nom: 'Test', restaurantId: 'r-3' }, utilisateur: { id: 'autre', role: 'RESPONSABLE_RESTO' } }, resCategorie, jest.fn());
    expect(resCategorie.status).toHaveBeenCalledWith(403);
    expect(prisma.categorie.create).not.toHaveBeenCalled();

    const resPlat = reponseMock();
    await creerPlat({ body: { nom: 'Test', prix: 1000, restaurantId: 'r-3', categorieId: 'c-1' }, utilisateur: { id: 'autre' } }, resPlat, jest.fn());
    expect(resPlat.status).toHaveBeenCalledWith(403);
    expect(prisma.plat.create).not.toHaveBeenCalled();
  });

  test('le menu « mon restaurant » recherche par responsable authentifié', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ id: 'mon-resto', nom: 'Chez moi' });
    const res = reponseMock();
    await monRestaurant({ utilisateur: { id: 'responsable-1' } }, res, jest.fn());
    expect(prisma.restaurant.findUnique).toHaveBeenCalledWith({ where: { responsableId: 'responsable-1' } });
    expect(res.json).toHaveBeenCalledWith({ id: 'mon-resto', nom: 'Chez moi' });
  });

  test('un responsable ne bascule pas la disponibilité d’un plat étranger', async () => {
    prisma.plat.findUnique.mockResolvedValue({ id: 'p-1', restaurantId: 'r-4', restaurant: { responsableId: 'proprietaire' } });
    const res = reponseMock();
    await basculerDisponibilite({ params: { id: 'p-1' }, utilisateur: { id: 'autre' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.plat.update).not.toHaveBeenCalled();
  });
});
