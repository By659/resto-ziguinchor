const { origineAutorisee, originsDepuisEnv } = require('../src/config/cors');

describe('configuration CORS', () => {
  test('lit plusieurs origines séparées par des virgules en retirant les espaces', () => {
    expect(originsDepuisEnv({ CORS_ORIGIN: ' https://restoclik.vercel.app, https://restoclik.sn ' }))
      .toEqual(['https://restoclik.vercel.app', 'https://restoclik.sn']);
  });

  test('autorise l’origine frontend explicitement configurée en production', () => {
    expect(origineAutorisee('https://restoclik.vercel.app', {
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://restoclik.vercel.app,https://restoclik.sn',
    })).toBe(true);
  });

  test('refuse une origine non déclarée en production', () => {
    expect(origineAutorisee('https://site-inconnu.example', {
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://restoclik.vercel.app',
    })).toBe(false);
  });

  test('échoue fermé si la production n’a aucune origine configurée', () => {
    expect(origineAutorisee('https://restoclik.vercel.app', { NODE_ENV: 'production' })).toBe(false);
  });

  test('préserve l’usage local sans configuration explicite', () => {
    expect(origineAutorisee('http://localhost:5173', { NODE_ENV: 'development' })).toBe(true);
  });

  test('autorise les requêtes sans en-tête Origin, comme les contrôles de santé', () => {
    expect(origineAutorisee(undefined, { NODE_ENV: 'production' })).toBe(true);
  });
});
