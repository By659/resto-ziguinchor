import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { api } from '../api/client';

export default function InitialiserAdmin() {
  const [telephone, setTelephone] = useState('');
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function initialiser(e) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      const resultat = await api.initialiserPremierAdmin(telephone, secret);
      setMessage(resultat.message);
      setTelephone('');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setSecret('');
      setEnvoi(false);
    }
  }

  return (
    <div className="reference-site">
      <SiteHeader />
      <main className="reference-auth-page">
        <section className="reference-auth-form-area">
          <div className="reference-auth-card">
            <p className="reference-eyebrow">Configuration initiale</p>
            <h1 className="font-serif text-3xl font-bold">Premier administrateur</h1>
            <p className="reference-auth-subtitle">
              Cette opération ne fonctionne qu’une fois et ne crée aucun mot de passe.
              Crée d’abord ton compte normal, puis utilise le secret temporaire configuré dans Render.
            </p>
            <form onSubmit={initialiser} className="reference-auth-form">
              <label>
                Téléphone du compte que tu as créé
                <input
                  type="tel"
                  autoComplete="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  required
                />
              </label>
              <label>
                Secret temporaire d’initialisation
                <input
                  type="password"
                  autoComplete="off"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  required
                />
              </label>
              {erreur && <p className="reference-error" role="alert">{erreur}</p>}
              {message && <p className="reference-success" role="status">{message}</p>}
              <button className="reference-button reference-button-wide" disabled={envoi}>
                {envoi ? 'Initialisation…' : 'Initialiser mon compte'} <span>→</span>
              </button>
            </form>
            <p className="reference-auth-subtitle">
              Après la réussite, supprime immédiatement <code>ADMIN_BOOTSTRAP_SECRET</code> des variables Render.
            </p>
            <Link to="/login" className="reference-guest-link">Retour à la connexion</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
