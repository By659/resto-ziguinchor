import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useCart } from '../context/CartContext';
import SiteHeader from '../components/SiteHeader';
import { CATEGORIES_RESTOCLIK, IMAGES_RESTOCLIK, MENUS_DEMO, RESTAURANTS_DEMO, categorieRestaurant, imageRestaurant, restaurantOuvert } from '../data/site-demo';

const CATEGORIES_MENU_DEMO = [
  { nom: 'Tous', icone: '✦' }, { nom: 'Plats', icone: '🍲' }, { nom: 'Grillades', icone: '🔥' },
  { nom: 'Entrées', icone: '🥟' }, { nom: 'Boissons', icone: '🥤' }, { nom: 'Desserts', icone: '🍮' },
];

function listeDepuis(reponse) {
  if (Array.isArray(reponse)) return reponse;
  return reponse?.restaurants || reponse?.data || [];
}

function OptionsModal({ plat, onClose, onAdd }) {
  return <div className="option-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="option-modal reference-option-modal" role="dialog" aria-modal="true" aria-labelledby="option-title">
      <button className="option-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
      {plat.photoUrl && <img className="reference-option-image" src={plat.photoUrl} alt={plat.nom} />}
      <p className="reference-eyebrow">Préparé à la commande</p><h2 id="option-title">{plat.nom}</h2>
      <p className="option-description">{plat.description || 'Un plat préparé avec les produits du jour.'}</p>
      <div className="reference-option-price">{Number(plat.prix || 0).toLocaleString('fr-FR')} F CFA</div>
      <div className="option-empty">Ajoutez ce plat à votre panier. Vous pourrez indiquer vos préférences au restaurant.</div>
      <button className="primary-button reference-button-wide" type="button" onClick={() => { onAdd(plat, []); onClose(); }}>Ajouter au panier <span>→</span></button>
    </div>
  </div>;
}

function RestaurantCard({ restaurant, onSelect }) {
  return <button type="button" className="restaurant-list-card" onClick={() => onSelect(restaurant)}>
    <span className="restaurant-list-image"><img src={imageRestaurant(restaurant)} alt="" loading="lazy" />
      {restaurant.offre && <span className="reference-offer-badge">{restaurant.offre}</span>}
      {!restaurantOuvert(restaurant) && <span className="reference-closed-badge">Fermé</span>}
      <span className="reference-rating">★ {restaurant.note || '4.8'}</span>
    </span>
    <span className="restaurant-list-info"><span className="restaurant-list-title"><strong>{restaurant.nom}</strong><span aria-hidden="true">↗</span></span>
      <span className="restaurant-list-category">{categorieRestaurant(restaurant)} · {restaurant.quartier || restaurant.adresse || 'Ziguinchor'}</span>
      <span className="restaurant-list-description">{restaurant.description || 'Découvrez les recettes et spécialités de cette adresse locale.'}</span>
      <span className="restaurant-list-meta"><span>◷ {restaurant.tempsLivraison || '25–40 min'}</span><span>{restaurant.fraisLivraison != null ? `Livraison ${Number(restaurant.fraisLivraison).toLocaleString('fr-FR')} F CFA` : 'Livraison locale'}</span></span>
      <span className="restaurant-list-cta">Voir le menu <b aria-hidden="true">→</b></span>
    </span>
  </button>;
}

export default function Menu() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ajouter, lignes } = useCart();
  const rechercheInitiale = location.state?.recherche;
  const restaurantInitial = location.state?.restaurant;
  const [restaurants, setRestaurants] = useState(RESTAURANTS_DEMO);
  const [restaurant, setRestaurant] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState(searchParams.get('categorie') || 'Tous');
  const [chargement, setChargement] = useState(true);
  const [platSelectionne, setPlatSelectionne] = useState(null);
  const [modeDemo, setModeDemo] = useState(false);
  const [ajoutReussi, setAjoutReussi] = useState(false);

  useEffect(() => {
    let actif = true;
    async function charger() {
      setChargement(true);
      const aRecherche = Array.isArray(rechercheInitiale?.restaurants);
      let liste = aRecherche && !id ? rechercheInitiale.restaurants : [];
      let modeApercu = false;
      if (!aRecherche || id) {
        try {
          const resultat = listeDepuis(await api.listerRestaurants());
          if (resultat.length) liste = resultat;
          else { liste = RESTAURANTS_DEMO; modeApercu = true; }
        } catch {
          liste = RESTAURANTS_DEMO;
          modeApercu = true;
        }
      }
      if (!actif) return;
      setRestaurants(liste);
      setModeDemo(modeApercu);
      if (id) {
        let selection = restaurantInitial?.id === id ? restaurantInitial : liste.find((item) => String(item.id) === id);
        if (!selection) selection = RESTAURANTS_DEMO.find((item) => item.id === id);
        if (!selection) {
          try { selection = await api.obtenirRestaurant(id); } catch { selection = null; }
        }
        if (actif) setRestaurant(selection || null);
      } else {
        setRestaurant(null);
      }
      if (actif) setChargement(false);
    }
    charger();
    return () => { actif = false; };
  }, [id]);

  useEffect(() => {
    setCategorie(searchParams.get('categorie') || 'Tous');
  }, [location.search, searchParams]);

  const restaurantsFiltres = useMemo(() => restaurants.filter((item) => {
    const terme = recherche.trim().toLocaleLowerCase('fr');
    const texte = `${item.nom || ''} ${categorieRestaurant(item)} ${item.adresse || ''} ${item.quartier || ''} ${item.description || ''}`.toLocaleLowerCase('fr');
    const matchTexte = !terme || texte.includes(terme);
    const matchCategorie = categorie === 'Tous' || categorieRestaurant(item).toLocaleLowerCase('fr').includes(categorie.toLocaleLowerCase('fr'));
    return matchTexte && matchCategorie;
  }), [restaurants, recherche, categorie]);

  const platsAPI = useMemo(() => {
    const dansCategories = (restaurant?.categories || []).flatMap((item) => (item.plats || []).map((plat) => ({ ...plat, categorieNom: item.nom })));
    const direct = Array.isArray(restaurant?.plats) ? restaurant.plats : [];
    return dansCategories.length ? dansCategories : direct;
  }, [restaurant]);
  const platsSource = platsAPI.length ? platsAPI : (MENUS_DEMO[restaurant?.id] || []);
  const categoriesMenu = useMemo(() => {
    const resultat = [...new Set(platsSource.map((plat) => plat.categorieNom || plat.categorie?.nom).filter(Boolean))];
    return resultat.length ? [{ nom: 'Tous', icone: '✦' }, ...resultat.map((nom) => ({ nom, icone: CATEGORIES_MENU_DEMO.find((item) => item.nom === nom)?.icone || '🍽️' }))] : CATEGORIES_MENU_DEMO;
  }, [platsSource]);
  const plats = platsSource.filter((plat) => {
    const texte = `${plat.nom || ''} ${plat.description || ''}`.toLocaleLowerCase('fr');
    const categoriePlat = plat.categorieNom || plat.categorie?.nom;
    return (categorie === 'Tous' || categoriePlat === categorie) && texte.includes(recherche.toLocaleLowerCase('fr'));
  });
  const totalLignes = lignes.reduce((total, ligne) => total + ligne.quantite, 0);

  function ouvrirRestaurant(item) {
    navigate(`/restaurants/${item.id}`, { state: { restaurant: item, recherche: rechercheInitiale } });
  }

  function ajouterAuPanier(plat, options) {
    ajouter({ ...plat, restaurantId: restaurant?.id || plat.restaurantId }, options);
    setAjoutReussi(true);
    window.setTimeout(() => setAjoutReussi(false), 2400);
  }

  if (chargement) return <div className="loading-screen"><span className="brand-mark">R</span><p>On prépare les bonnes adresses…</p></div>;

  return <div className="reference-site">
    <SiteHeader />
    {!id ? <main className="restaurant-list-page">
      <section className="restaurant-list-hero"><p className="reference-eyebrow">Ziguinchor · Casamance</p><h1>Les restaurants<br /><em>près de chez vous.</em></h1><p>Les bonnes adresses de votre quartier, réunies au même endroit.</p>
        {rechercheInitiale?.quartier && <div className="restaurant-search-result">⌖ Résultats pour « {rechercheInitiale.quartier} »</div>}
        <label className="restaurant-page-search"><span aria-hidden="true">⌕</span><input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un restaurant ou une cuisine…" aria-label="Rechercher un restaurant" /></label>
      </section>
      <section className="reference-section restaurant-list-content">
        <div className="restaurant-category-filters" aria-label="Filtrer par cuisine">
          <button className={categorie === 'Tous' ? 'active' : ''} onClick={() => setCategorie('Tous')}>Tout</button>
          {CATEGORIES_RESTOCLIK.map((item) => <button key={item.nom} className={categorie === item.nom ? 'active' : ''} onClick={() => setCategorie(item.nom)}><span>{item.icone}</span> {item.nom}</button>)}
        </div>
        {modeDemo && <p className="reference-demo-note">Aperçu de l’interface — les fiches ci-dessous montrent les adresses de démonstration.</p>}
        <div className="restaurant-results-heading"><div><p className="reference-eyebrow">À découvrir</p><h2>{rechercheInitiale?.quartier ? `Autour de ${rechercheInitiale.quartier}` : 'Nos adresses partenaires'}</h2></div><span>{restaurantsFiltres.length} adresse{restaurantsFiltres.length === 1 ? '' : 's'}</span></div>
        {restaurantsFiltres.length ? <div className="restaurant-list-grid">{restaurantsFiltres.map((item) => <RestaurantCard key={item.id} restaurant={item} onSelect={ouvrirRestaurant} />)}</div> : <div className="reference-empty"><span>⌕</span><h3>Aucun restaurant trouvé</h3><p>Essayez un autre nom ou une autre catégorie.</p><button className="reference-text-link" onClick={() => { setRecherche(''); setCategorie('Tous'); }}>Effacer les filtres</button></div>}
      </section>
      <footer className="reference-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><p>Les saveurs de Ziguinchor, livrées à votre porte.</p><nav><Link to="/">Accueil</Link><Link to="/demande-acces?type=RESTAURATEUR">Devenir partenaire</Link><Link to="/demande-acces?type=LIVREUR">Devenir livreur</Link></nav><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
    </main> : <main className="restaurant-detail-page">
      {!restaurant ? <div className="reference-empty restaurant-not-found"><h1>Cette adresse n’est pas disponible.</h1><Link to="/restaurants" className="reference-button">Retour aux restaurants</Link></div> : <>
        <div className="restaurant-detail-cover" style={{ backgroundImage: `linear-gradient(90deg, rgba(24,17,5,.76), rgba(24,17,5,.08)), url("${imageRestaurant(restaurant)}")` }}>
          <button className="restaurant-back-button" onClick={() => navigate('/restaurants', { state: { recherche: rechercheInitiale } })}>← Tous les restaurants</button>
          <div className="restaurant-detail-cover-copy"><p className="reference-location">⌖ {restaurant.quartier || restaurant.adresse || 'Ziguinchor, Sénégal'}</p><h1>{restaurant.nom}</h1><p>{restaurant.description || 'Des recettes locales, généreuses et préparées chaque jour.'}</p><div className="restaurant-detail-pills"><span>★ {restaurant.note || '4.8'}</span><span>◷ {restaurant.tempsLivraison || '25–40 min'}</span><span>{categorieRestaurant(restaurant)}</span></div></div>
          {!restaurantOuvert(restaurant) && <span className="reference-closed-badge detail-closed">Fermé pour le moment</span>}
        </div>
        <section className="reference-section restaurant-menu-content">
          <div className="restaurant-menu-heading"><div><p className="reference-eyebrow">Le menu</p><h2>Les incontournables</h2><p>Choisissez un plat pour voir ses détails et l’ajouter au panier.</p></div><Link to="/panier" className="restaurant-cart-shortcut">Panier <span>{totalLignes}</span> →</Link></div>
          <div className="restaurant-menu-tools"><div className="restaurant-category-filters restaurant-dish-filters">{categoriesMenu.map((item) => <button key={item.nom} className={categorie === item.nom ? 'active' : ''} onClick={() => setCategorie(item.nom)}>{item.icone} {item.nom}</button>)}</div><label className="restaurant-page-search"><span aria-hidden="true">⌕</span><input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un plat…" aria-label="Chercher un plat" /></label></div>
          {modeDemo && <p className="reference-demo-note">Aperçu de l’interface — le menu de cette adresse est fourni comme exemple.</p>}
          {plats.length ? <div className="restaurant-dish-grid">{plats.map((plat) => <article className="restaurant-dish-card" key={plat.id}>
            <button type="button" className="restaurant-dish-image" onClick={() => setPlatSelectionne(plat)} aria-label={`Voir ${plat.nom}`}><img src={plat.photoUrl || imageRestaurant(restaurant)} alt={plat.nom} loading="lazy" />{plat.badge && <span>{plat.badge}</span>}</button>
            <div className="restaurant-dish-info"><div><h3>{plat.nom}</h3><p>{plat.description}</p></div><div className="restaurant-dish-bottom"><strong>{Number(plat.prix || 0).toLocaleString('fr-FR')} F CFA</strong><button type="button" disabled={!restaurantOuvert(restaurant)} onClick={() => setPlatSelectionne(plat)} aria-label={`Ajouter ${plat.nom} au panier`}>+</button></div></div>
          </article>)}</div> : <div className="reference-empty"><span>🍽</span><h3>Le menu arrive bientôt</h3><p>Cette adresse n’a pas encore publié de plats disponibles.</p></div>}
        </section>
        {ajoutReussi && <div className="reference-toast" role="status">Ajouté au panier <Link to="/panier">Voir le panier →</Link></div>}
        {platSelectionne && restaurantOuvert(restaurant) && <OptionsModal plat={platSelectionne} onClose={() => setPlatSelectionne(null)} onAdd={ajouterAuPanier} />}
      </>}
      <footer className="reference-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><p>Les saveurs de Ziguinchor, livrées à votre porte.</p><nav><Link to="/restaurants">Restaurants</Link><Link to="/panier">Panier</Link><Link to="/demande-acces?type=RESTAURATEUR">Devenir partenaire</Link></nav><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
    </main>}
  </div>;
}
