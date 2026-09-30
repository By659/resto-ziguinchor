const app = require('../src/app');

// En test, il n'y a pas de vrai serveur Socket.io démarré : on simule
// req.app.get('io') pour que les contrôleurs (qui font io.to().emit()) ne plantent pas.
const ioFactice = {
  to: () => ({ emit: () => {} }),
};
app.set('io', ioFactice);

module.exports = app;
