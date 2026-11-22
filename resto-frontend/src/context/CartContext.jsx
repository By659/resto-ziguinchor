import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [lignes, setLignes] = useState([]);

  function ajouter(plat, options = []) {
    const optionsNormalisees = options.map((option) => ({ id: option.id, nom: option.nom, prixSupplement: Number(option.prixSupplement || 0) })).sort((a, b) => a.id.localeCompare(b.id));
    const ligneId = `${plat.id}:${optionsNormalisees.map((option) => option.id).join(',')}`;
    setLignes((prev) => {
      const existante = prev.find((ligne) => ligne.ligneId === ligneId);
      if (existante) return prev.map((ligne) => (ligne.ligneId === ligneId ? { ...ligne, quantite: ligne.quantite + 1 } : ligne));
      return [...prev, { ligneId, platId: plat.id, restaurantId: plat.restaurantId, nom: plat.nom, photoUrl: plat.photoUrl || plat.imageUrl || null, prixUnitaire: Number(plat.prix), quantite: 1, options: optionsNormalisees }];
    });
  }

  function modifierQuantite(ligneId, variation) {
    setLignes((prev) => prev.map((ligne) => ligne.ligneId === ligneId ? { ...ligne, quantite: Math.max(1, ligne.quantite + variation) } : ligne));
  }

  function retirer(ligneId) { setLignes((prev) => prev.filter((ligne) => ligne.ligneId !== ligneId)); }
  function vider() { setLignes([]); }
  const total = useMemo(() => lignes.reduce((acc, ligne) => acc + (ligne.prixUnitaire + ligne.options.reduce((sum, option) => sum + option.prixSupplement, 0)) * ligne.quantite, 0), [lignes]);

  return <CartContext.Provider value={{ lignes, ajouter, modifierQuantite, retirer, vider, total }}>{children}</CartContext.Provider>;
}

export function useCart() { return useContext(CartContext); }
