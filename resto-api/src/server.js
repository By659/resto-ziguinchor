require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const initSocket = require('./sockets/kds.socket');
const { origineAutorisee, originsDepuisEnv } = require('./config/cors');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: originsDepuisEnv() },
  allowRequest: (req, callback) => callback(null, origineAutorisee(req.headers.origin)),
});

initSocket(io);
app.set('io', io); // accessible dans les contrôleurs via req.app.get('io')

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API démarrée sur le port ${PORT}`);
  console.log(`Documentation Swagger : http://localhost:${PORT}/api-docs`);
});
