import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function IconPanier() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 8h13l1 12h-15l1-12Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
}

function IconMenu({ ouvert }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ouvert ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>;
}

function espaceUtilisateur(utilisateur) {
  if (utilisateur?.role === 'RESPONSABLE_RESTO' || utilisateur?.role === 'ADMIN') return '/dashboard';
  if (utilisateur?.role === 'CUISINIER') return '/kds';
  if (utilisateur?.role === 'LIVREUR') return '/livreur';
  return '/profil';
}

export default function SiteHeader() {
  const { utilisateur } = useAuth();
  const { lignes } = useCart();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const nombreArticles = lignes.reduce((somme, ligne) => somme + ligne.quantite, 0);
  const fermerMenu = () => setMenuOuvert(false);

  return <header className="site-header">
    <div className="site-header-inner">
      <Link to="/" className="site-brand" aria-label="RestoClik, accueil" onClick={fermerMenu}>
        <span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span>
      </Link>
      <nav className="site-nav" aria-label="Navigation principale">
        <Link to="/">Accueil</Link>
        <Link to="/menu">Restaurants</Link>
        <Link to="/#comment">Comment ça marche</Link>
        <Link to="/demande-acces?type=RESTAURATEUR">Devenir partenaire</Link>
        <Link to="/demande-acces?type=LIVREUR">Devenir livreur</Link>
      </nav>
      <div className="site-header-actions">
        {utilisateur
          ? <Link className="site-account-link" to={espaceUtilisateur(utilisateur)}>{utilisateur.nom?.split(' ')[0] || 'Mon espace'}</Link>
          : <><Link className="site-account-link" to="/login">Connexion</Link><Link className="site-register-link" to="/register">Inscription</Link></>}
        <Link className="site-cart-link" to="/panier" aria-label={`Panier, ${nombreArticles} article(s)`}>
          <IconPanier />{nombreArticles > 0 && <span className="site-cart-count">{nombreArticles}</span>}
        </Link>
        <button className="site-menu-toggle" type="button" aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOuvert} aria-controls="site-mobile-nav" onClick={() => setMenuOuvert((ouvert) => !ouvert)}>
          <IconMenu ouvert={menuOuvert} />
        </button>
      </div>
    </div>
    {menuOuvert && <nav id="site-mobile-nav" className="site-mobile-nav" aria-label="Navigation mobile">
      <Link to="/" onClick={fermerMenu}>Accueil</Link>
      <Link to="/menu" onClick={fermerMenu}>Restaurants</Link>
      <Link to="/#comment" onClick={fermerMenu}>Comment ça marche</Link>
      <Link to="/demande-acces?type=RESTAURATEUR" onClick={fermerMenu}>Devenir partenaire</Link>
      <Link to="/demande-acces?type=LIVREUR" onClick={fermerMenu}>Devenir livreur</Link>
      {!utilisateur && <><Link to="/login" onClick={fermerMenu}>Connexion</Link><Link to="/register" onClick={fermerMenu}>Inscription</Link></>}
    </nav>}
  </header>;
}
