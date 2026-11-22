const { creerOptionsCors, origineAutorisee, originsDepuisEnv } = require('../src/config/cors');

describe('configuration CORS', () => {
  test('lit plusieurs origines séparées par des virgules en retirant les espaces', () => {
    expect(originsDepuisEnv({ CORS_ORIGIN: ' https://resto-ziguinchor.vercel.app, https://restoclik.sn ' }))
      .toEqual(['https://resto-ziguinchor.vercel.app', 'https://restoclik.sn']);
  });

  test('autorise l’origine frontend explicitement configurée en production', () => {
    expect(origineAutorisee('https://resto-ziguinchor.vercel.app', {
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://resto-ziguinchor.vercel.app,https://restoclik.sn',
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

  test('applique la liste configurée au middleware Express', (done) => {
    const options = creerOptionsCors({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://resto-ziguinchor.vercel.app',
    });

    options.origin('https://resto-ziguinchor.vercel.app', (error, autorisee) => {
      expect(error).toBeNull();
      expect(autorisee).toBe(true);
      done();
    });
  });

  test('refuse une origine inconnue au middleware Express', (done) => {
    const options = creerOptionsCors({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://resto-ziguinchor.vercel.app',
    });

    options.origin('https://inconnu.example', (error, autorisee) => {
      expect(error).toBeNull();
      expect(autorisee).toBe(false);
      done();
    });
  });
});
