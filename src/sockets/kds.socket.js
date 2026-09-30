// Namespace Socket.io pour le KDS : chaque restaurant a sa propre "room"
// afin qu'un écran cuisine ne reçoive que les commandes de son restaurant.
function initSocket(io) {
  io.on('connection', (socket) => {
    // Le client (écran KDS ou app livreur) rejoint la room de son restaurant après connexion
    socket.on('rejoindre_resto', (restaurantId) => {
      socket.join(`resto:${restaurantId}`);
    });

    socket.on('disconnect', () => {
      // rien à nettoyer explicitement, socket.io gère le retrait des rooms
    });
  });
}

module.exports = initSocket;
