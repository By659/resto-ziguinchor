function originsDepuisEnv(env = process.env) {
  return String(env.CORS_ORIGIN || '')
    .split(',')
    .map((origine) => origine.trim())
    .filter(Boolean);
}

function origineAutorisee(origine, env = process.env) {
  // Les clients non-navigateurs (curl, outils de santé) n'envoient pas d'origine.
  if (!origine) return true;

  const origines = originsDepuisEnv(env);
  if (origines.includes(origine)) return true;

  // Compatibilité locale : en développement, l'API reste utilisable sans configuration CORS.
  // En production, une origine explicite est obligatoire (échec fermé).
  return env.NODE_ENV !== 'production' && origines.length === 0;
}

function creerOptionsCors(env = process.env) {
  return {
    origin: (origine, callback) => callback(null, origineAutorisee(origine, env)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  };
}

module.exports = { creerOptionsCors, origineAutorisee, originsDepuisEnv };
