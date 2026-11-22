jest.mock('../src/config/prisma', () => ({
  utilisateur: { create: jest.fn() },
}));

const prisma = require('../src/config/prisma');
const { register } = require('../src/controllers/auth.controller');

function reponseMock() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('inscription publique', () => {
  beforeEach(() => jest.clearAllMocks());

  test('ignore une tentative de choisir un rôle privilégié', async () => {
    prisma.utilisateur.create.mockResolvedValue({ id: 'u-1', nom: 'Étudiante', role: 'CLIENT' });
    const req = { body: { nom: 'Étudiante', telephone: '771234567', motDePasse: 'motdepasse123', role: 'ADMIN' } };
    const res = reponseMock();
    const next = jest.fn();

    await register(req, res, next);

    expect(prisma.utilisateur.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nom: 'Étudiante', role: 'CLIENT' }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'u-1', nom: 'Étudiante', role: 'CLIENT' });
    expect(next).not.toHaveBeenCalled();
  });

  test('refuse les champs requis manquants avant l’écriture en base', async () => {
    const req = { body: { nom: 'Test', telephone: '', motDePasse: 'court' } };
    const res = reponseMock();
    const next = jest.fn();

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.utilisateur.create).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
