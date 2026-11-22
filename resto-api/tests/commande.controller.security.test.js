jest.mock('../src/config/prisma', () => ({
  commande: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const prisma = require('../src/config/prisma');
const { changerStatut, obtenirCommande } = require('../src/controllers/commande.controller');

function reponseMock() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('contrôle d’accès aux commandes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('un client ne consulte pas la commande d’un autre client', async () => {
    prisma.commande.findUnique.mockResolvedValue({
      id: 'cmd-1', clientId: 'client-proprietaire', restaurant: { responsableId: 'resto-1' },
      livreur: null, lignes: [], paiement: null, livraison: null, notation: null,
    });
    const req = { params: { id: 'cmd-1' }, utilisateur: { id: 'autre-client', role: 'CLIENT' } };
    const res = reponseMock();

    await obtenirCommande(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.commande.updateMany).not.toHaveBeenCalled();
  });

  test('un responsable ne modifie pas une commande appartenant à un autre restaurant', async () => {
    prisma.commande.findUnique.mockResolvedValue({
      id: 'cmd-2', statut: 'EN_ATTENTE', type: 'SUR_PLACE',
      restaurant: { responsableId: 'responsable-proprietaire' },
    });
    const req = {
      params: { id: 'cmd-2' }, body: { statut: 'CONFIRMEE' },
      utilisateur: { id: 'autre-responsable', role: 'RESPONSABLE_RESTO' },
    };
    const res = reponseMock();

    await changerStatut(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.commande.updateMany).not.toHaveBeenCalled();
  });

  test('une transition interdite n’est jamais persistée', async () => {
    prisma.commande.findUnique.mockResolvedValue({
      id: 'cmd-3', statut: 'LIVREE', type: 'SUR_PLACE',
      restaurant: { responsableId: 'responsable-1' },
    });
    const req = {
      params: { id: 'cmd-3' }, body: { statut: 'EN_ATTENTE' },
      utilisateur: { id: 'admin-1', role: 'ADMIN' },
    };
    const res = reponseMock();

    await changerStatut(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.commande.updateMany).not.toHaveBeenCalled();
  });
});
