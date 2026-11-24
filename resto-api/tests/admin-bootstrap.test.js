jest.mock('../src/config/prisma', () => ({
  $transaction: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const prisma = require('../src/config/prisma');
const { initialiserPremierAdmin } = require('../src/controllers/admin-bootstrap.controller');

const app = express();
app.use(express.json());
app.post('/admin-bootstrap', initialiserPremierAdmin);
const nodeEnvInitial = process.env.NODE_ENV;
const secretInitial = process.env.ADMIN_BOOTSTRAP_SECRET;

describe('initialisation sécurisée du premier administrateur', () => {
  const secret = 'a'.repeat(40);
  let utilisateur;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_BOOTSTRAP_SECRET = secret;
    utilisateur = {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ id: 'client-1', role: 'CLIENT' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    prisma.$transaction.mockImplementation((operation) => operation({ utilisateur }));
  });

  afterEach(() => {
    if (secretInitial === undefined) delete process.env.ADMIN_BOOTSTRAP_SECRET;
    else process.env.ADMIN_BOOTSTRAP_SECRET = secretInitial;
    if (nodeEnvInitial === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnvInitial;
    jest.clearAllMocks();
  });

  test('promouvoit uniquement le compte client existant après validation du secret', async () => {
    const reponse = await request(app)
      .post('/admin-bootstrap')
      .set('X-Admin-Bootstrap-Secret', secret)
      .send({ telephone: ' 771234567 ' });

    expect(reponse.status).toBe(201);
    expect(utilisateur.findUnique).toHaveBeenCalledWith({
      where: { telephone: '771234567' },
      select: { id: true, role: true },
    });
    expect(utilisateur.updateMany).toHaveBeenCalledWith({
      where: { id: 'client-1', role: 'CLIENT' },
      data: { role: 'ADMIN' },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(reponse.body).not.toHaveProperty('telephone');
  });

  test('refuse toute tentative lorsque le secret est absent ou invalide', async () => {
    const invalide = await request(app).post('/admin-bootstrap').set('X-Admin-Bootstrap-Secret', 'incorrect').send({ telephone: '771234567' });
    expect(invalide.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    delete process.env.ADMIN_BOOTSTRAP_SECRET;
    const desactive = await request(app).post('/admin-bootstrap').set('X-Admin-Bootstrap-Secret', secret).send({ telephone: '771234567' });
    expect(desactive.status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    process.env.ADMIN_BOOTSTRAP_SECRET = 'trop-court';
    const faible = await request(app).post('/admin-bootstrap').set('X-Admin-Bootstrap-Secret', 'trop-court').send({ telephone: '771234567' });
    expect(faible.status).toBe(404);
  });

  test('verrouille le bootstrap si un administrateur existe déjà', async () => {
    utilisateur.count.mockResolvedValue(1);

    const reponse = await request(app)
      .post('/admin-bootstrap')
      .set('X-Admin-Bootstrap-Secret', secret)
      .send({ telephone: '771234567' });

    expect(reponse.status).toBe(409);
    expect(utilisateur.findUnique).not.toHaveBeenCalled();
    expect(utilisateur.updateMany).not.toHaveBeenCalled();
  });

  test('ne promeut pas un compte absent ou déjà privilégié', async () => {
    utilisateur.findUnique.mockResolvedValue({ id: 'compte-1', role: 'RESPONSABLE_RESTO' });

    const reponse = await request(app)
      .post('/admin-bootstrap')
      .set('X-Admin-Bootstrap-Secret', secret)
      .send({ telephone: '771234567' });

    expect(reponse.status).toBe(404);
    expect(utilisateur.updateMany).not.toHaveBeenCalled();
  });
});
