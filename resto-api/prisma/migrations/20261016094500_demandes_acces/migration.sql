CREATE TYPE "TypeDemandeAcces" AS ENUM ('RESTAURATEUR', 'LIVREUR');
CREATE TYPE "StatutDemandeAcces" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE');
CREATE TABLE "DemandeAcces" (
  "id" TEXT NOT NULL,
  "utilisateurId" TEXT NOT NULL,
  "type" "TypeDemandeAcces" NOT NULL,
  "statut" "StatutDemandeAcces" NOT NULL DEFAULT 'EN_ATTENTE',
  "donnees" JSONB NOT NULL,
  "motifAdmin" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemandeAcces_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DemandeAcces_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "DemandeAcces_utilisateurId_type_statut_idx" ON "DemandeAcces"("utilisateurId", "type", "statut");
