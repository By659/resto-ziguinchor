import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SiteHeader from '../components/SiteHeader';
import { IMAGES_RESTOCLIK } from '../data/site-demo';

export default function DemandeAcces() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const typeInitial = new URLSearchParams(location.search).get('type') === 'LIVREUR' ? 'LIVREUR' : 'RESTAURATEUR';
  const [type, setType] = useState(typeInitial);
  const [donnees, setDonnees] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);
  const champs = useMemo(() => type === 'RESTAURATEUR'
    ? [['nomRestaurant', 'Nom du restaurant', 'La Terrasse Casamançaise'], ['description', 'Description', 'Cuisine sénégalaise, grillades…'], ['typeRestaurant', 'Type de restaurant', 'Restaurant, dibiterie, fast-food…'], ['adresse', 'Adresse', 'Adresse complète'], ['quartier', 'Quartier', 'Boucotte, Néma…'], ['telephoneProfessionnel', 'Téléphone professionnel', '77 123 45 67'], ['horaires', 'Horaires', '08:00-22:00'], ['zonesLivraison', 'Zones de livraison', 'Quartiers desservis']]
    : [['zone', 'Zone habituelle', 'Ziguinchor centre, Boucotte…'], ['telephone', 'Téléphone à utiliser', '77 123 45 67'], ['moyenTransport', 'Moyen de transport', 'Moto, vélo…'], ['disponibilites', 'Disponibilités', 'Matin, après-midi, soir']], [type]);

  async function envoyer(e) {
    e.preventDefault();
    if (!utilisateur) { navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`); return; }
    setEnvoi(true); setErreur(null); setMessage(null);
    try { await api.creerDemandeAcces(type, donnees); setMessage('Votre demande a bien été enregistrée. Elle sera examinée par l’administration.'); }
    catch (err) { setErreur(err.message); }
    finally { setEnvoi(false); }
  }

  return <div className="reference-site">
    <SiteHeader />
    <main className="reference-access-page" style={{ '--access-image': `url("${type === 'RESTAURATEUR' ? IMAGES_RESTOCLIK.hero : IMAGES_RESTOCLIK.dibi}")` }}>
      <section className="reference-access-intro"><p className="reference-location">⌖ Ziguinchor, Sénégal</p><p className="reference-eyebrow">Rejoindre RestoClik</p><h1>{type === 'RESTAURATEUR' ? 'Faites découvrir votre table.' : 'Roulez avec le réseau local.'}</h1><p>{type === 'RESTAURATEUR' ? 'Votre demande sera étudiée avant toute publication. Un compte existant suffit.' : 'Proposez vos services de livraison à Ziguinchor avec votre propre compte.'}</p>
        <div className="reference-access-tabs"><button type="button" className={type === 'RESTAURATEUR' ? 'active' : ''} onClick={() => { setType('RESTAURATEUR'); setMessage(null); setErreur(null); }}>🏪 Restaurateur</button><button type="button" className={type === 'LIVREUR' ? 'active' : ''} onClick={() => { setType('LIVREUR'); setMessage(null); setErreur(null); }}>🛵 Livreur</button></div>
      </section>
      <form className="reference-access-form" onSubmit={envoyer}><div className="reference-access-form-title"><p className="reference-eyebrow">{type === 'RESTAURATEUR' ? 'Partenariat restaurant' : 'Candidature livreur'}</p><h2>{utilisateur ? `Bonjour ${utilisateur.nom}` : 'Connectez-vous pour continuer'}</h2>{!utilisateur && <p>Une personne = un compte. Connectez-vous ou créez un compte avant d’envoyer la demande.</p>}</div>
        {champs.map(([cle, label, placeholder]) => <label className="reference-form-field" key={cle}>{label}<input value={donnees[cle] || ''} onChange={(e) => setDonnees({ ...donnees, [cle]: e.target.value })} placeholder={placeholder} required={Boolean(utilisateur)} /></label>)}
        {erreur && <p className="reference-error" role="alert">{erreur}</p>}{message && <p className="reference-success" role="status">{message}</p>}
        <button className="reference-button reference-button-wide" disabled={envoi}>{envoi ? 'Enregistrement…' : utilisateur ? 'Envoyer ma demande' : 'Se connecter pour continuer'} <span>→</span></button>
      </form>
    </main>
    <footer className="reference-footer reference-compact-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><Link to="/menu">Découvrir les restaurants →</Link><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
  </div>;
}
