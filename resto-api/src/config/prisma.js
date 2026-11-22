const { PrismaClient } = require('@prisma/client');

// Instance unique de PrismaClient partagée dans toute l'app
const prisma = new PrismaClient();

module.exports = prisma;
