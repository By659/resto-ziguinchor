import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SiteHeader from '../components/SiteHeader';
import { IMAGES_RESTOCLIK } from '../data/site-demo';

export default function Register() {
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const { connexion } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  async function handleSubmit(e) {
    e.preventDefault(); setErreur(null); setEnvoi(true);
    try {
      await api.register({ nom, telephone, email: email || undefined, motDePasse, role: 'CLIENT' });
      await connexion(telephone, motDePasse);
      navigate(params.get('redirect') || '/menu');
    } catch (err) { setErreur(err.message); }
    finally { setEnvoi(false); }
  }

  const retourConnexion = params.get('redirect') ? `/login?redirect=${encodeURIComponent(params.get('redirect'))}` : '/login';
  return <div className="reference-site">
    <SiteHeader />
    <main className="reference-auth-page">
      <section className="reference-auth-visual register-visual" style={{ backgroundImage: `linear-gradient(135deg, rgba(42,32,7,.82), rgba(90,74,13,.34)), url("${IMAGES_RESTOCLIK.dibi}")` }}>
        <p className="reference-location">⌖ Ziguinchor, Sénégal</p><div><p className="reference-eyebrow">Le goût du quartier</p><h1>Votre prochaine adresse préférée est peut-être juste ici.</h1><p>Inscrivez-vous gratuitement et commandez auprès des restaurants locaux.</p></div><div className="reference-auth-benefits"><span>✓ Suivi de commande</span><span>✓ Menus locaux</span><span>✓ Livraison à Ziguinchor</span></div>
      </section>
      <section className="reference-auth-form-area"><div className="reference-auth-card"><p className="reference-eyebrow">Première commande ?</p><h2>Bienvenue chez nous.</h2><p className="reference-auth-subtitle">Créez votre compte client en moins d’une minute.</p>
        <form onSubmit={handleSubmit} className="reference-auth-form"><label>Nom complet<input type="text" autoComplete="name" placeholder="Awa Diop" value={nom} onChange={(e) => setNom(e.target.value)} required /></label><label>Téléphone<input type="tel" autoComplete="tel" placeholder="77 123 45 67" value={telephone} onChange={(e) => setTelephone(e.target.value)} required /></label><label>Email <span className="reference-optional">(facultatif)</span><input type="email" autoComplete="email" placeholder="awa@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Mot de passe<input type="password" autoComplete="new-password" placeholder="8 caractères minimum" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} minLength={8} required /></label>{erreur && <p className="reference-error" role="alert">{erreur}</p>}<button className="reference-button reference-button-wide" disabled={envoi}>{envoi ? 'Création…' : 'Créer mon compte'} <span>→</span></button></form>
        <p className="reference-auth-switch">Vous avez déjà un compte ? <Link to={retourConnexion}>Se connecter</Link></p>
      </div></section>
    </main>
    <footer className="reference-footer reference-compact-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
  </div>;
}
