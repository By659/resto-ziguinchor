import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SiteHeader from '../components/SiteHeader';
import { IMAGES_RESTOCLIK } from '../data/site-demo';

export default function Login() {
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault(); setErreur(null); setEnvoi(true);
    try { await connexion(telephone, motDePasse); navigate(params.get('redirect') || '/menu'); }
    catch (err) { setErreur(err.message); }
    finally { setEnvoi(false); }
  }

  const retourInscription = params.get('redirect') ? `/register?redirect=${encodeURIComponent(params.get('redirect'))}` : '/register';
  return <div className="reference-site">
    <SiteHeader />
    <main className="reference-auth-page">
      <section className="reference-auth-visual" style={{ backgroundImage: `linear-gradient(135deg, rgba(42,32,7,.82), rgba(90,74,13,.34)), url("${IMAGES_RESTOCLIK.hero}")` }}>
        <p className="reference-location">⌖ Ziguinchor, Sénégal</p><div><p className="reference-eyebrow">Bienvenue à table</p><h1>Les bons moments commencent par un bon plat.</h1><p>Retrouvez les adresses qui font battre le cœur de Ziguinchor.</p></div><span className="reference-auth-signature">Casamance · Sénégal</span>
      </section>
      <section className="reference-auth-form-area"><div className="reference-auth-card"><p className="reference-eyebrow">Votre espace</p><h2>Bon retour.</h2><p className="reference-auth-subtitle">Connectez-vous pour retrouver vos commandes et vos adresses préférées.</p>
        <form onSubmit={handleSubmit} className="reference-auth-form"><label>Numéro de téléphone<input type="tel" autoComplete="tel" placeholder="77 123 45 67" value={telephone} onChange={(e) => setTelephone(e.target.value)} required /></label><label>Mot de passe<input type="password" autoComplete="current-password" placeholder="Votre mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required /></label>{erreur && <p className="reference-error" role="alert">{erreur}</p>}<button className="reference-button reference-button-wide" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'} <span>→</span></button></form>
        <p className="reference-auth-switch">Pas encore de compte ? <Link to={retourInscription}>Créer un compte</Link></p><Link to="/menu" className="reference-guest-link">Continuer à découvrir les restaurants</Link>
      </div></section>
    </main>
    <footer className="reference-footer reference-compact-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
  </div>;
}
