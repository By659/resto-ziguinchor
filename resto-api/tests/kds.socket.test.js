jest.mock('../src/config/prisma', () => ({
  restaurant: { findUnique: jest.fn() },
}));

const jwt = require('jsonwebtoken');
const prisma = require('../src/config/prisma');
const initSocket = require('../src/sockets/kds.socket');
const { peutRejoindreRestaurant } = initSocket;

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
