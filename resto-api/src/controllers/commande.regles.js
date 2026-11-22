const TRANSITIONS_COMMANDE = {
  EN_ATTENTE: ['CONFIRMEE', 'ANNULEE'],
  CONFIRMEE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['PRETE', 'ANNULEE'],
  PRETE: ['LIVREE', 'ANNULEE'],
  EN_LIVRAISON: [],
  LIVREE: [],
  ANNULEE: [],
};

function transitionAutorisee(statutActuel, statutCible, typeCommande, role) {
  const autorises = TRANSITIONS_COMMANDE[statutActuel];
  if (!autorises || !autorises.includes(statutCible)) return false;
  if (!['ADMIN', 'RESPONSABLE_RESTO', 'CUISINIER'].includes(role)) return false;

  // L'annulation relève du responsable ou de l'administration, pas du poste cuisine.
  if (statutCible === 'ANNULEE') return ['ADMIN', 'RESPONSABLE_RESTO'].includes(role);

  // Une livraison est finalisée par le parcours du livreur, pas par un PATCH générique.
  if (statutCible === 'LIVREE') {
    return ['ADMIN', 'RESPONSABLE_RESTO'].includes(role)
      && ['SUR_PLACE', 'EMPORTER'].includes(typeCommande);
  }

  return true;
}

function calculerMontantsCommande(lignes, coupon, tauxCommission) {
  const sousTotalBrut = lignes.reduce((total, ligne) => {
    const prixUnitaire = Number(ligne.prixUnitaire);
    const quantite = Number(ligne.quantite);
    if (!Number.isFinite(prixUnitaire) || prixUnitaire < 0
      || !Number.isInteger(quantite) || quantite < 1 || quantite > 50) {
      throw new TypeError('Ligne de commande invalide');
    }
    return total + prixUnitaire * quantite;
  }, 0);

  const sousTotal = Math.round(sousTotalBrut);
  let reduction = 0;
  if (coupon?.montantFixe != null) {
    reduction = Math.max(0, Math.round(Number(coupon.montantFixe)));
  } else if (coupon?.pourcentage != null) {
    const pourcentage = Number(coupon.pourcentage);
    if (!Number.isFinite(pourcentage) || pourcentage < 0 || pourcentage > 100) {
      throw new TypeError('Pourcentage de coupon invalide');
    }
    reduction = Math.round(sousTotal * pourcentage / 100);
  }

  const montantTotal = Math.max(0, sousTotal - Math.min(reduction, sousTotal));
  const taux = Number(tauxCommission);
  if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
    throw new TypeError('Taux de commission invalide');
  }

  return {
    sousTotal,
    reduction: Math.min(reduction, sousTotal),
    montantTotal,
    montantCommission: Math.round(montantTotal * taux / 100),
  };
}

module.exports = { TRANSITIONS_COMMANDE, transitionAutorisee, calculerMontantsCommande };
