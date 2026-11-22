jest.mock('../src/config/prisma', () => ({
  restaurant: { findUnique: jest.fn() },
  commande: { findUnique: jest.fn() },
}));

const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const initSocket = require('../src/sockets/kds.socket');
const { peutRejoindreCommande, peutRejoindreRestaurant } = initSocket;

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-socket-test';

describe('protection Socket.IO du KDS', () => {
  beforeEach(() => jest.clearAllMocks());

  test('un responsable rejoint seulement le salon de son restaurant', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({ responsableId: 'responsable-1' });
    expect(await peutRejoindreRestaurant({ id: 'responsable-1', role: 'RESPONSABLE_RESTO' }, 'r-1')).toBe(true);
    expect(await peutRejoindreRestaurant({ id: 'autre', role: 'RESPONSABLE_RESTO' }, 'r-1')).toBe(false);
  });

  test('refuse les clients et les restaurants inexistants', async () => {
    expect(await peutRejoindreRestaurant({ id: 'client-1', role: 'CLIENT' }, 'r-1')).toBe(false);
    prisma.restaurant.findUnique.mockResolvedValue(null);
    expect(await peutRejoindreRestaurant({ id: 'admin-1', role: 'ADMIN' }, 'inconnu')).toBe(false);
  });

  test('un client ne rejoint que le salon de sa propre commande', async () => {
    prisma.commande.findUnique.mockResolvedValue({ clientId: 'client-1' });
    expect(await peutRejoindreCommande({ id: 'client-1', role: 'CLIENT' }, 'c-1')).toBe(true);
    expect(await peutRejoindreCommande({ id: 'autre', role: 'CLIENT' }, 'c-1')).toBe(false);
    expect(await peutRejoindreCommande({ id: 'admin-1', role: 'ADMIN' }, 'c-1')).toBe(false);
  });

  test('le socket inscrit le client autorisé dans le salon privé de commande', async () => {
    let connexion;
    const io = { use: jest.fn(), on: jest.fn((event, handler) => { if (event === 'connection') connexion = handler; }) };
    initSocket(io);
    const ecouteurs = {};
    const socket = {
      utilisateur: { id: 'client-1', role: 'CLIENT' },
      on: jest.fn((event, handler) => { ecouteurs[event] = handler; }),
      join: jest.fn(),
    };
    prisma.commande.findUnique.mockResolvedValue({ clientId: 'client-1' });
    connexion(socket);
    const repondre = jest.fn();

    await ecouteurs.rejoindre_commande('c-1', repondre);

    expect(socket.join).toHaveBeenCalledWith('commande:c-1');
    expect(repondre).toHaveBeenCalledWith({ ok: true });
  });

  test('le middleware Socket.IO refuse une connexion sans JWT valide', () => {
    let middleware;
    const io = { use: jest.fn((fn) => { middleware = fn; }), on: jest.fn() };
    initSocket(io);
    const next = jest.fn();

    middleware({ handshake: { auth: {} } }, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/authentification/i) }));
  });

  test('le middleware attache l’identité portée par un JWT signé', () => {
    let middleware;
    const io = { use: jest.fn((fn) => { middleware = fn; }), on: jest.fn() };
    initSocket(io);
    const utilisateur = { id: 'responsable-1', role: 'RESPONSABLE_RESTO' };
    const socket = { handshake: { auth: { token: jwt.sign(utilisateur, process.env.JWT_SECRET) } } };
    const next = jest.fn();

    middleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.utilisateur).toMatchObject(utilisateur);
  });
});
