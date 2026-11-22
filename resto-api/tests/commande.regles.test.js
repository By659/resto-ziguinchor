const { transitionAutorisee, calculerMontantsCommande } = require('../src/controllers/commande.regles');

describe('règles de cycle de vie des commandes', () => {
  test('autorise les étapes successives du KDS pour un cuisinier', () => {
    expect(transitionAutorisee('EN_ATTENTE', 'CONFIRMEE', 'LIVRAISON', 'CUISINIER')).toBe(true);
    expect(transitionAutorisee('CONFIRMEE', 'EN_PREPARATION', 'LIVRAISON', 'CUISINIER')).toBe(true);
    expect(transitionAutorisee('EN_PREPARATION', 'PRETE', 'LIVRAISON', 'CUISINIER')).toBe(true);
  });

  test('interdit de réouvrir une commande terminale ou de sauter une étape', () => {
    expect(transitionAutorisee('LIVREE', 'EN_ATTENTE', 'SUR_PLACE', 'ADMIN')).toBe(false);
    expect(transitionAutorisee('ANNULEE', 'EN_PREPARATION', 'EMPORTER', 'RESPONSABLE_RESTO')).toBe(false);
    expect(transitionAutorisee('EN_ATTENTE', 'PRETE', 'SUR_PLACE', 'ADMIN')).toBe(false);
  });

  test('réserve l’annulation et empêche de marquer une livraison comme remise depuis le KDS', () => {
    expect(transitionAutorisee('EN_PREPARATION', 'ANNULEE', 'LIVRAISON', 'CUISINIER')).toBe(false);
    expect(transitionAutorisee('PRETE', 'LIVREE', 'LIVRAISON', 'RESPONSABLE_RESTO')).toBe(false);
    expect(transitionAutorisee('PRETE', 'LIVREE', 'EMPORTER', 'RESPONSABLE_RESTO')).toBe(true);
    expect(transitionAutorisee('PRETE', 'EN_LIVRAISON', 'LIVRAISON', 'LIVREUR')).toBe(false);
  });
});

describe('calculs de commande en FCFA', () => {
  test('calcule les options, coupon fixe et commission avec des montants entiers', () => {
    const result = calculerMontantsCommande(
      [{ prixUnitaire: 1250.5, quantite: 2 }, { prixUnitaire: 500, quantite: 1 }],
      { montantFixe: 500 },
      8
    );
    expect(result).toEqual({ sousTotal: 3001, reduction: 500, montantTotal: 2501, montantCommission: 200 });
  });

  test('applique un coupon pourcentage et plafonne la réduction au sous-total', () => {
    expect(calculerMontantsCommande([{ prixUnitaire: 1000, quantite: 2 }], { pourcentage: 12.5 }, 8))
      .toEqual({ sousTotal: 2000, reduction: 250, montantTotal: 1750, montantCommission: 140 });
    expect(calculerMontantsCommande([{ prixUnitaire: 1000, quantite: 1 }], { montantFixe: 5000 }, 8).montantTotal)
      .toBe(0);
  });

  test('rejette une quantité et un taux de commission invalides', () => {
    expect(() => calculerMontantsCommande([{ prixUnitaire: 100, quantite: 0 }], null, 8)).toThrow('Ligne de commande invalide');
    expect(() => calculerMontantsCommande([{ prixUnitaire: 100, quantite: 1 }], null, 101)).toThrow('Taux de commission invalide');
  });
});
