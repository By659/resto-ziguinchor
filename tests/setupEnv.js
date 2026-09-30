// Charge les variables d'environnement de TEST (base séparée de la base de dev)
// avant que Prisma ou l'app ne soient importés dans les fichiers de test.
require('dotenv').config({ path: '.env.test' });
