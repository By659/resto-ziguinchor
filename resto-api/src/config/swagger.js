const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Plateforme de commande - Restaurants Ziguinchor',
      version: '1.0.0',
      description:
        "Documentation de l'API REST pour la commande en ligne, le KDS, la livraison, le paiement et la fidélité.",
    },
    servers: [{ url: '/api', description: 'Serveur principal' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
