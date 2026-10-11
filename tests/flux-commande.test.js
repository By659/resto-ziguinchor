const request = require('supertest');
const app = require('./testApp');
const prisma = require('../src/config/prisma');

// Suffixe unique pour éviter les collisions de téléphone/email si le test tourne plusieurs fois
const suffixe = Date.now();

const client = { telephone: `700${suffixe}`.slice(0, 12), motDePasse: 'password123', nom: 'Client Test', role: 'CLIENT' };
const responsable = { telephone: `701${suffixe}`.slice(0, 12), motDePasse: 'password123', nom: 'Resto Test', role: 'RESPONSABLE_RESTO' };
const admin = { telephone: `702${suffixe}`.slice(0, 12), motDePasse: 'password123', nom: 'Admin Test', role: 'ADMIN' };
const livreur = { telephone: `703${suffixe}`.slice(0, 12), motDePasse: 'password123', nom: 'Livreur Test', role: 'LIVREUR' };

let tokenClient, tokenResponsable, tokenAdmin, tokenLivreur;
let clientId, responsableId;
let restaurantId, categorieId, platId, commandeId, commandeLivraisonId, livraisonId;

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Flux critique : commande -> KDS -> livraison -> séquestre/fidélité', () => {
  test('inscription des comptes de test', async () => {
    const resClient = await request(app).post('/api/auth/register').send(client);
    expect(resClient.status).toBe(201);
    clientId = resClient.body.id;

    const resResponsable = await request(app).post('/api/auth/register').send(responsable);
    expect(resResponsable.status).toBe(201);
    responsableId = resResponsable.body.id;

    const resAdmin = await request(app).post('/api/auth/register').send(admin);
    expect(resAdmin.status).toBe(201);

    const resLivreur = await request(app).post('/api/auth/register').send(livreur);
    expect(resLivreur.status).toBe(201);
  });

  test('connexion des comptes', async () => {
    const loginClient = await request(app).post('/api/auth/login').send(client);
    expect(loginClient.status).toBe(200);
    tokenClient = loginClient.body.token;

    const loginResponsable = await request(app).post('/api/auth/login').send(responsable);
    tokenResponsable = loginResponsable.body.token;

    const loginAdmin = await request(app).post('/api/auth/login').send(admin);
    tokenAdmin = loginAdmin.body.token;

    const loginLivreur = await request(app).post('/api/auth/login').send(livreur);
    tokenLivreur = loginLivreur.body.token;

    expect(tokenClient).toBeDefined();
    expect(tokenResponsable).toBeDefined();
    expect(tokenAdmin).toBeDefined();
    expect(tokenLivreur).toBeDefined();
  });

  test('un client ne peut pas créer de restaurant (contrôle de rôle)', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ nom: 'Interdit', adresse: 'x', latitude: 0, longitude: 0, heureOuverture: '08:00', heureFermeture: '22:00', responsableId });
    expect(res.status).toBe(403);
  });

  test("création du restaurant, d'une catégorie et d'un plat", async () => {
    const resRestaurant = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nom: 'Resto Test',
        adresse: 'Ziguinchor',
        latitude: 12.5,
        longitude: -16.2,
        heureOuverture: '08:00',
        heureFermeture: '22:00',
        responsableId,
      });
    expect(resRestaurant.status).toBe(201);
    restaurantId = resRestaurant.body.id;

    const resCategorie = await request(app)
      .post('/api/restaurants/categories')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nom: 'Plats', ordre: 1, restaurantId });
    expect(resCategorie.status).toBe(201);
    categorieId = resCategorie.body.id;

    const resPlat = await request(app)
      .post('/api/plats')
      .set('Authorization', `Bearer ${tokenResponsable}`)
      .send({ nom: 'Plat Test', prix: 2500, restaurantId, categorieId });
    expect(resPlat.status).toBe(201);
    platId = resPlat.body.id;
  });

  test('le client crée une commande, la commission est calculée correctement', async () => {
    const res = await request(app)
      .post('/api/commandes')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({
        restaurantId,
        type: 'SUR_PLACE',
        lignes: [{ platId, quantite: 2, prixUnitaire: 2500 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.montantTotal).toBe(5000);
    expect(res.body.montantCommission).toBe(400); // 8% de 5000
    commandeId = res.body.id;
  });

  test('le statut progresse jusqu\u2019à LIVREE', async () => {
    for (const statut of ['CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'LIVREE']) {
      const res = await request(app)
        .patch(`/api/commandes/${commandeId}/statut`)
        .set('Authorization', `Bearer ${tokenResponsable}`)
        .send({ statut });
      expect(res.status).toBe(200);
      expect(res.body.statut).toBe(statut);
    }
  });

  test('les points fidélité ont été crédités (1 point / 100 FCFA)', async () => {
    const res = await request(app).get('/api/fidelite/moi').set('Authorization', `Bearer ${tokenClient}`);
    expect(res.status).toBe(200);
    expect(res.body.solde).toBe(50); // 5000 FCFA / 100
  });

  test('la commission a été versée au portefeuille du restaurant', async () => {
    const portefeuille = await prisma.portefeuilleRestaurant.findUnique({ where: { restaurantId } });
    expect(portefeuille).not.toBeNull();
    expect(portefeuille.solde).toBe(4600); // 5000 - 400 de commission

    const transaction = await prisma.transactionPortefeuille.findUnique({ where: { commandeId } });
    expect(transaction.statut).toBe('VERSEE');
    expect(transaction.montantNet).toBe(4600);
  });

  test('le livreur accepte une commande géocodée et confirme sa livraison une seule fois', async () => {
    const ancienneCleORS = process.env.OPENROUTESERVICE_API_KEY;
    const fetchOriginal = global.fetch;
    process.env.OPENROUTESERVICE_API_KEY = 'cle-test';
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/geocode/search')) {
        return {
          ok: true,
          json: async () => ({ features: [{ geometry: { coordinates: [-16.26, 12.56] } }] }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          features: [{
            properties: { summary: { distance: 3200, duration: 900 } },
            geometry: { type: 'LineString', coordinates: [[-16.2, 12.5], [-16.26, 12.56]] },
          }],
        }),
      };
    });

    try {
      const resCommande = await request(app)
        .post('/api/commandes')
        .set('Authorization', `Bearer ${tokenClient}`)
        .send({
          restaurantId,
          type: 'LIVRAISON',
          adresseLivraison: 'Quartier Nema, Ziguinchor',
          lignes: [{ platId, quantite: 1, prixUnitaire: 2500 }],
        });

      expect(resCommande.status).toBe(201);
      expect(resCommande.body.adresseLivraison).toBe('Quartier Nema, Ziguinchor');
      expect(resCommande.body.latitudeLivraison).toBe(12.56);
      expect(resCommande.body.longitudeLivraison).toBe(-16.26);
      commandeLivraisonId = resCommande.body.id;

      const resHistorique = await request(app)
        .get('/api/commandes/mes-commandes')
        .set('Authorization', `Bearer ${tokenClient}`);
      expect(resHistorique.status).toBe(200);
      expect(resHistorique.body.some((commande) => commande.id === commandeLivraisonId)).toBe(true);

      for (const statut of ['CONFIRMEE', 'EN_PREPARATION', 'PRETE']) {
        const res = await request(app)
          .patch(`/api/commandes/${commandeLivraisonId}/statut`)
          .set('Authorization', `Bearer ${tokenResponsable}`)
          .send({ statut });
        expect(res.status).toBe(200);
      }

      const resDisponibles = await request(app)
        .get('/api/commandes/disponibles-livraison')
        .set('Authorization', `Bearer ${tokenLivreur}`);
      expect(resDisponibles.status).toBe(200);
      expect(resDisponibles.body.some((commande) => commande.id === commandeLivraisonId)).toBe(true);

      const resAcceptation = await request(app)
        .post('/api/livraisons/accepter')
        .set('Authorization', `Bearer ${tokenLivreur}`)
        .send({ commandeId: commandeLivraisonId });
      expect(resAcceptation.status).toBe(201);
      expect(resAcceptation.body.distanceKm).toBe(3.2);
      livraisonId = resAcceptation.body.id;

      const resMesLivraisons = await request(app)
        .get('/api/commandes/mes-livraisons')
        .set('Authorization', `Bearer ${tokenLivreur}`);
      expect(resMesLivraisons.status).toBe(200);
      expect(resMesLivraisons.body).toHaveLength(1);

      const doublon = await request(app)
        .post('/api/livraisons/accepter')
        .set('Authorization', `Bearer ${tokenLivreur}`)
        .send({ commandeId: commandeLivraisonId });
      expect(doublon.status).toBe(409);

      const resConfirmation = await request(app)
        .patch(`/api/livraisons/${livraisonId}/confirmer`)
        .set('Authorization', `Bearer ${tokenLivreur}`);
      expect(resConfirmation.status).toBe(200);

      const resDoubleConfirmation = await request(app)
        .patch(`/api/livraisons/${livraisonId}/confirmer`)
        .set('Authorization', `Bearer ${tokenLivreur}`);
      expect(resDoubleConfirmation.status).toBe(409);

      const commandeFinalisee = await request(app)
        .get(`/api/commandes/${commandeLivraisonId}`)
        .set('Authorization', `Bearer ${tokenClient}`);
      expect(commandeFinalisee.body.statut).toBe('LIVREE');

      const points = await request(app).get('/api/fidelite/moi').set('Authorization', `Bearer ${tokenClient}`);
      expect(points.body.solde).toBe(75);
      const portefeuille = await prisma.portefeuilleRestaurant.findUnique({ where: { restaurantId } });
      expect(portefeuille.solde).toBe(6900);
    } finally {
      global.fetch = fetchOriginal;
      if (ancienneCleORS === undefined) delete process.env.OPENROUTESERVICE_API_KEY;
      else process.env.OPENROUTESERVICE_API_KEY = ancienneCleORS;
    }
  });
});
