-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESPONSABLE_RESTO', 'CUISINIER', 'LIVREUR', 'CLIENT');

-- CreateEnum
CREATE TYPE "TypeCommande" AS ENUM ('LIVRAISON', 'SUR_PLACE', 'EMPORTER');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'PAYE', 'ECHOUE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('WAVE', 'A_LA_LIVRAISON');

-- CreateEnum
CREATE TYPE "StatutLivreur" AS ENUM ('DISPONIBLE', 'EN_COURSE', 'HORS_LIGNE');

-- CreateEnum
CREATE TYPE "StatutTransactionPortefeuille" AS ENUM ('EN_SEQUESTRE', 'VERSEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "heureOuverture" TEXT NOT NULL,
    "heureFermeture" TEXT NOT NULL,
    "tauxCommission" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsableId" TEXT NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "restaurantId" TEXT NOT NULL,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plat" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "prix" DOUBLE PRECISION NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "restaurantId" TEXT NOT NULL,
    "categorieId" TEXT NOT NULL,

    CONSTRAINT "Plat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupeOption" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "choixMultiple" BOOLEAN NOT NULL DEFAULT false,
    "obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "platId" TEXT NOT NULL,

    CONSTRAINT "GroupeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prixSupplement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "groupeId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commande" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "TypeCommande" NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE',
    "heureSouhaitee" TIMESTAMP(3),
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantCommission" DOUBLE PRECISION NOT NULL,
    "noteClient" TEXT,
    "clientId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "livreurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmeeAt" TIMESTAMP(3),
    "preteAt" TIMESTAMP(3),
    "livreeAt" TIMESTAMP(3),

    CONSTRAINT "Commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommande" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "platId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LigneCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommandeOption" (
    "id" TEXT NOT NULL,
    "ligneCommandeId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "LigneCommandeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "methode" "MethodePaiement" NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "referenceWave" TEXT,
    "montant" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payeAt" TIMESTAMP(3),

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livreur" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "statut" "StatutLivreur" NOT NULL DEFAULT 'HORS_LIGNE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "moyenneNote" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "Livreur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Livraison" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "dureeEstimeeMin" INTEGER,
    "itineraireGeoJson" TEXT,
    "confirmeeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortefeuilleRestaurant" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "solde" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PortefeuilleRestaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionPortefeuille" (
    "id" TEXT NOT NULL,
    "portefeuilleId" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "montantBrut" DOUBLE PRECISION NOT NULL,
    "montantCommission" DOUBLE PRECISION NOT NULL,
    "montantNet" DOUBLE PRECISION NOT NULL,
    "statut" "StatutTransactionPortefeuille" NOT NULL DEFAULT 'EN_SEQUESTRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verseeAt" TIMESTAMP(3),

    CONSTRAINT "TransactionPortefeuille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsFidelite" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "solde" INTEGER NOT NULL DEFAULT 0,
    "totalGagne" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsFidelite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "pourcentage" DOUBLE PRECISION,
    "montantFixe" DOUBLE PRECISION,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "expireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notation" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "noteRepas" INTEGER NOT NULL,
    "noteLivreur" INTEGER,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_telephone_key" ON "Utilisateur"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_responsableId_key" ON "Restaurant"("responsableId");

-- CreateIndex
CREATE UNIQUE INDEX "Commande_numero_key" ON "Commande"("numero");

-- CreateIndex
CREATE INDEX "Commande_restaurantId_statut_idx" ON "Commande"("restaurantId", "statut");

-- CreateIndex
CREATE INDEX "Commande_statut_createdAt_idx" ON "Commande"("statut", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_commandeId_key" ON "Paiement"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "Livreur_utilisateurId_key" ON "Livreur"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Livraison_commandeId_key" ON "Livraison"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "PortefeuilleRestaurant_restaurantId_key" ON "PortefeuilleRestaurant"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionPortefeuille_commandeId_key" ON "TransactionPortefeuille"("commandeId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsFidelite_utilisateurId_key" ON "PointsFidelite"("utilisateurId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Notation_commandeId_key" ON "Notation"("commandeId");

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Categorie" ADD CONSTRAINT "Categorie_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plat" ADD CONSTRAINT "Plat_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plat" ADD CONSTRAINT "Plat_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupeOption" ADD CONSTRAINT "GroupeOption_platId_fkey" FOREIGN KEY ("platId") REFERENCES "Plat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "GroupeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commande" ADD CONSTRAINT "Commande_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "Livreur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_platId_fkey" FOREIGN KEY ("platId") REFERENCES "Plat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommandeOption" ADD CONSTRAINT "LigneCommandeOption_ligneCommandeId_fkey" FOREIGN KEY ("ligneCommandeId") REFERENCES "LigneCommande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommandeOption" ADD CONSTRAINT "LigneCommandeOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livreur" ADD CONSTRAINT "Livreur_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livraison" ADD CONSTRAINT "Livraison_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Livraison" ADD CONSTRAINT "Livraison_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "Livreur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortefeuilleRestaurant" ADD CONSTRAINT "PortefeuilleRestaurant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionPortefeuille" ADD CONSTRAINT "TransactionPortefeuille_portefeuilleId_fkey" FOREIGN KEY ("portefeuilleId") REFERENCES "PortefeuilleRestaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionPortefeuille" ADD CONSTRAINT "TransactionPortefeuille_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsFidelite" ADD CONSTRAINT "PointsFidelite_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "Commande"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notation" ADD CONSTRAINT "Notation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
