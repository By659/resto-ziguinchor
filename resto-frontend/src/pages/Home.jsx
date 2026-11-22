import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import SiteHeader from '../components/SiteHeader';
import { CATEGORIES_RESTOCLIK, IMAGES_RESTOCLIK, RESTAURANTS_DEMO, categorieRestaurant, imageRestaurant, restaurantOuvert } from '../data/site-demo';

function listeDepuis(reponse) {
  if (Array.isArray(reponse)) return reponse;
  return reponse?.restaurants || reponse?.data || [];
}

export default function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState(RESTAURANTS_DEMO);
  const [quartier, setQuartier] = useState('');
  const [programmer, setProgrammer] = useState(false);
  const [heureSouhaitee, setHeureSouhaitee] = useState('');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    let actif = true;
    api.listerRestaurants().then((reponse) => {
      const liste = listeDepuis(reponse);
      if (actif && liste.length) setRestaurants(liste);
    }).catch(() => {});
    return () => { actif = false; };
  }, []);

  async function rechercher(e) {
    e.preventDefault();
    setErreur('');
    if (!quartier.trim()) {
      setErreur('Entrez votre quartier de Ziguinchor pour trouver les restaurants disponibles.');
      return;
    }
    if (programmer && !heureSouhaitee) {
      setErreur('Choisissez une date et une heure pour programmer la commande.');
      return;
    }
    setChargement(true);
    const recherche = { adresse: quartier.trim(), quartier: quartier.trim(), heureSouhaitee: programmer ? heureSouhaitee : null };
    try {
      const reponse = await api.rechercherRestaurants({
        adresse: recherche.adresse,
        quartier: recherche.quartier,
        ...(programmer ? { heureSouhaitee: new Date(heureSouhaitee).toISOString() } : {}),
      });
      navigate('/menu', { state: { recherche: { ...recherche, ...reponse, restaurants: listeDepuis(reponse) } } });
    } catch {
      navigate('/menu', { state: { recherche: { ...recherche, restaurants: [] } } });
    } finally {
      setChargement(false);
    }
  }

  return <div className="reference-site">
    <SiteHeader />
    <main>
      <section className="reference-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(24, 17, 5, .78) 0%, rgba(24, 17, 5, .46) 52%, rgba(24, 17, 5, .12) 100%), url("${IMAGES_RESTOCLIK.hero}")` }}>
        <div className="reference-hero-copy">
          <p className="reference-location"><span aria-hidden="true">⌖</span> Ziguinchor, Sénégal</p>
          <h1>Le goût de Ziguinchor,<br /><em>livré chez vous.</em></h1>
          <p className="reference-hero-text">Restaurants, dibiteries et fast-foods de votre quartier, en quelques clics.</p>
          <form className="reference-search" onSubmit={rechercher}>
            <label className="reference-search-field">
              <span aria-hidden="true">⌖</span>
              <input aria-label="Adresse de livraison" value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Votre quartier (ex. Boucotte, Escale…)" />
            </label>
            <button className="reference-button" disabled={chargement}>{chargement ? 'Recherche…' : 'Trouver'} <span aria-hidden="true">→</span></button>
            <details className="reference-schedule">
              <summary>{programmer ? 'Commande programmée' : 'Programmer pour plus tard'}</summary>
              <div className="reference-schedule-fields">
                <label htmlFor="heure-souhaitee">Date et heure souhaitées</label>
                <input id="heure-souhaitee" type="datetime-local" value={heureSouhaitee} onChange={(e) => { setHeureSouhaitee(e.target.value); setProgrammer(true); }} />
                {programmer && <button type="button" onClick={() => { setProgrammer(false); setHeureSouhaitee(''); }}>Dès que possible</button>}
              </div>
            </details>
            {erreur && <p className="reference-error" role="alert">{erreur}</p>}
          </form>
        </div>
      </section>

      <section className="reference-section reference-categories" aria-labelledby="categories-title">
        <div className="reference-section-heading"><div><p className="reference-eyebrow">À Ziguinchor</p><h2 id="categories-title">Choisissez votre envie</h2></div><Link to="/menu" className="reference-text-link">Tout voir <span aria-hidden="true">→</span></Link></div>
        <div className="reference-category-grid">
          {CATEGORIES_RESTOCLIK.map((categorie) => <Link key={categorie.nom} to={`/menu?categorie=${encodeURIComponent(categorie.nom)}`} className="reference-category-card"><span className="reference-category-icon">{categorie.icone}</span><span>{categorie.nom}</span><span className="reference-category-arrow" aria-hidden="true">↗</span></Link>)}
        </div>
      </section>

      <section id="restaurants" className="reference-section reference-featured" aria-labelledby="restaurants-title">
        <div className="reference-section-heading"><div><p className="reference-eyebrow">Les bonnes adresses du coin</p><h2 id="restaurants-title">Populaires en ce moment</h2></div><Link to="/menu" className="reference-text-link">Voir tous les restaurants <span aria-hidden="true">→</span></Link></div>
        <div className="reference-restaurant-grid">
          {restaurants.slice(0, 3).map((restaurant, index) => <Link to={`/restaurants/${restaurant.id}`} state={{ restaurant }} className="reference-restaurant-card" key={restaurant.id || restaurant.nom}>
            <div className="reference-restaurant-image"><img src={imageRestaurant(restaurant)} alt={restaurant.nom} loading="lazy" />
              {restaurant.offre && <span className="reference-offer-badge">{restaurant.offre}</span>}
              {!restaurantOuvert(restaurant) && <span className="reference-closed-badge">Fermé</span>}
              <span className="reference-rating">★ {restaurant.note || ['4.8', '4.7', '4.5'][index]}</span>
            </div>
            <div className="reference-restaurant-info"><div><h3>{restaurant.nom}</h3><p>{restaurant.typeRestaurant || 'Restaurant'} · {categorieRestaurant(restaurant)}</p></div><span className="reference-card-arrow" aria-hidden="true">↗</span></div>
            <div className="reference-restaurant-meta"><span>⌖ {restaurant.quartier || restaurant.adresse || 'Ziguinchor'}</span><span>◷ {restaurant.tempsLivraison || ['25–40 min', '20–35 min', '15–30 min'][index]}</span>{restaurant.fraisLivraison != null ? <span>Livraison {Number(restaurant.fraisLivraison).toLocaleString('fr-FR')} F CFA</span> : <span>Livraison locale</span>}</div>
          </Link>)}
        </div>
      </section>

      <section id="comment" className="reference-how" aria-labelledby="how-title">
        <div className="reference-how-intro"><p className="reference-eyebrow">Simple et local</p><h2 id="how-title">Du quartier à votre table.</h2><p>Commandez auprès des restaurants de Ziguinchor et suivez chaque étape depuis votre téléphone.</p></div>
        <div className="reference-how-steps"><article><span>01</span><div><h3>Choisissez</h3><p>Un quartier, un restaurant et les plats qui vous font envie.</p></div></article><article><span>02</span><div><h3>Personnalisez</h3><p>Précisez vos options puis choisissez livraison, sur place ou à emporter.</p></div></article><article><span>03</span><div><h3>Suivez</h3><p>Votre commande avance en temps réel, de la cuisine jusqu’à vous.</p></div></article></div>
      </section>

      <section className="reference-join" aria-label="Rejoindre RestoClik">
        <Link to="/demande-acces?type=RESTAURATEUR" className="reference-join-card"><span className="reference-join-icon">🏪</span><span><strong>Vous possédez un restaurant ?</strong><small>Rejoignez les adresses RestoClik.</small></span><b aria-hidden="true">→</b></Link>
        <Link to="/demande-acces?type=LIVREUR" className="reference-join-card"><span className="reference-join-icon">🛵</span><span><strong>Devenez livreur</strong><small>Gagnez de l’argent à votre rythme, à moto ou à vélo.</small></span><b aria-hidden="true">→</b></Link>
      </section>
    </main>
    <footer className="reference-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><p>Vos repas préférés livrés partout à Ziguinchor.</p><nav><Link to="/menu">Restaurants</Link><a href="#comment">Comment ça marche</a><Link to="/demande-acces?type=RESTAURATEUR">Devenir partenaire</Link><Link to="/demande-acces?type=LIVREUR">Devenir livreur</Link></nav><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
  </div>;
}
