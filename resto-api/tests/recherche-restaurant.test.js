const request = require('supertest');
const app = require('../src/app');
const { restaurantOuvert, compatibleQuartier } = require('../src/controllers/restaurant.controller');

describe('Recherche de disponibilité restaurant', () => {
  test('refuse une recherche sans adresse ni quartier', async () => {
    const response = await request(app).get('/api/restaurants/search');
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/adresse ou un quartier/i);
  });

  test('reconnaît un restaurant ouvert dans son créneau', () => {
    const restaurant = { heureOuverture: '08:00', heureFermeture: '22:00' };
    expect(restaurantOuvert(restaurant, new Date('2026-10-16T12:00:00'))).toBe(true);
    expect(restaurantOuvert(restaurant, new Date('2026-10-16T23:00:00'))).toBe(false);
  });

  test('refuse un quartier qui ne figure pas dans les zones configurées', () => {
    const restaurant = { adresse: 'Boucotte', quartier: 'Boucotte', zonesLivraison: ['Boucotte', 'Néma'] };
    expect(compatibleQuartier(restaurant, '', 'Boucotte')).toBe(true);
    expect(compatibleQuartier(restaurant, '', 'Kandé')).toBe(false);
  });
});
