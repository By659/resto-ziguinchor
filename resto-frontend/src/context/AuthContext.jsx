import { createContext, useContext, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(() => {
    const stocke = localStorage.getItem('utilisateur');
    return stocke ? JSON.parse(stocke) : null;
  });

  async function connexion(telephone, motDePasse) {
    const { token, utilisateur: u } = await api.login(telephone, motDePasse);
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(u));
    setUtilisateur(u);
  }

  function deconnexion() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    setUtilisateur(null);
  }

  return (
    <AuthContext.Provider value={{ utilisateur, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
