// Middleware global de gestion d'erreurs (à placer en dernier dans app.js)
function errorHandler(err, req, res, next) {
  console.error(err);
  const statut = err.statusCode || 500;
  res.status(statut).json({
    message: err.message || 'Erreur interne du serveur',
  });
}

module.exports = errorHandler;
