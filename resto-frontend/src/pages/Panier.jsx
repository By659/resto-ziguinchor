import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SiteHeader from '../components/SiteHeader';

const modes = [
  { id: 'SUR_PLACE', label: 'Sur place', icon: '⌂', description: 'À table au restaurant' },
  { id: 'EMPORTER', label: 'À emporter', icon: '◌', description: 'Prêt à récupérer' },
  { id: 'LIVRAISON', label: 'Livraison', icon: '⌖', description: 'À votre adresse' },
];

export default function Panier() {
  const { utilisateur } = useAuth();
  const { lignes, modifierQuantite, retirer, total, vider } = useCart();
  const [type, setType] = useState('SUR_PLACE');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [heureSouhaitee, setHeureSouhaitee] = useState('');
  const [methodePaiement, setMethodePaiement] = useState('A_LA_LIVRAISON');
  const [coupons, setCoupons] = useState([]);
  const [couponId, setCouponId] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let actif = true;
    if (!utilisateur) { setCoupons([]); setCouponId(''); return () => { actif = false; }; }
    api.mesCoupons().then((data) => { if (actif) setCoupons(data); }).catch(() => { if (actif) setCoupons([]); });
    return () => { actif = false; };
  }, [utilisateur]);

  const coupon = coupons.find((item) => item.id === couponId && !item.utilise && (!item.expireAt || new Date(item.expireAt) > new Date()));
  const reductionBrute = coupon?.montantFixe != null
    ? Math.round(Number(coupon.montantFixe))
    : coupon?.pourcentage != null ? Math.round(total * Number(coupon.pourcentage) / 100) : 0;
  const reduction = Math.min(Math.max(0, reductionBrute), total);
  const totalFinal = Math.max(0, total - reduction);
  const optionsLabel = (ligne) => ligne.options?.length ? ` · ${ligne.options.map((option) => option.nom).join(', ')}` : '';

  async function commander(e) {
    e.preventDefault();
    setErreur(null);
    if (!lignes.length) return;
    if (!utilisateur) {
      navigate(`/login?redirect=${encodeURIComponent('/panier')}`);
      return;
    }
    if (type === 'LIVRAISON' && !adresseLivraison.trim()) {
      setErreur('Une adresse de livraison est requise.');
      return;
    }
    if (lignes.some((ligne) => String(ligne.restaurantId || '').startsWith('demo-'))) {
      setErreur('Ce menu est un aperçu. Connectez l’API et utilisez les plats présents dans votre base pour envoyer une commande réelle.');
      return;
    }
    setEnvoi(true);
    try {
      const restaurantId = lignes[0].restaurantId || (await api.listerRestaurants())[0]?.id;
      if (!restaurantId) throw new Error('Aucun restaurant disponible.');
      const commande = await api.creerCommande({
        restaurantId, type, methodePaiement, couponId: coupon?.id,
        ...(type === 'LIVRAISON' ? { adresseLivraison: adresseLivraison.trim() } : {}),
        ...(heureSouhaitee ? { heureSouhaitee: new Date(heureSouhaitee).toISOString() } : {}),
        lignes: lignes.map((ligne) => ({ platId: ligne.platId, quantite: ligne.quantite, optionIds: ligne.options?.map((option) => option.id) || [] })),
      });
      vider();
      navigate(`/commandes/${commande.id}`);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return <div className="reference-site">
    <SiteHeader />
    <main className="reference-cart-page">
      <div className="reference-cart-heading"><p className="reference-eyebrow">À vous de choisir</p><h1>Votre panier</h1><p>Vérifiez vos plats avant de confirmer la commande.</p></div>
      {!lignes.length ? <section className="reference-cart-empty"><span aria-hidden="true">🛍</span><h2>Votre panier est vide</h2><p>Les plats que vous ajouterez apparaîtront ici.</p><Link to="/menu" className="reference-button">Découvrir les restaurants <span aria-hidden="true">→</span></Link></section> : <form onSubmit={commander} className="reference-cart-layout">
        <div className="reference-cart-main">
          <section className="reference-cart-panel"><div className="reference-cart-panel-title"><div><p className="reference-eyebrow">Sélection</p><h2>Vos plats</h2></div><span>{lignes.reduce((s, l) => s + l.quantite, 0)} article(s)</span></div>
            {lignes.map((ligne) => <article className="reference-cart-line" key={ligne.ligneId}>
              <div className="reference-cart-thumb">{ligne.photoUrl ? <img src={ligne.photoUrl} alt="" /> : <span aria-hidden="true">🍽</span>}</div>
              <div className="reference-cart-line-info"><div className="reference-cart-line-top"><strong>{ligne.nom}</strong><b>{((ligne.prixUnitaire + (ligne.options || []).reduce((sum, option) => sum + option.prixSupplement, 0)) * ligne.quantite).toLocaleString('fr-FR')} F</b></div>
                <p>{ligne.quantite} × {Number(ligne.prixUnitaire).toLocaleString('fr-FR')} F{optionsLabel(ligne)}</p>
                <div className="reference-cart-controls"><button type="button" aria-label={`Retirer une portion de ${ligne.nom}`} onClick={() => modifierQuantite(ligne.ligneId, -1)}>−</button><span>{ligne.quantite}</span><button type="button" aria-label={`Ajouter une portion de ${ligne.nom}`} onClick={() => modifierQuantite(ligne.ligneId, 1)}>+</button><button type="button" className="reference-remove" onClick={() => retirer(ligne.ligneId)}>Retirer</button></div>
              </div>
            </article>)}
          </section>
          <section className="reference-cart-panel"><div className="reference-cart-panel-title"><div><p className="reference-eyebrow">Récupération</p><h2>Comment recevoir votre commande ?</h2></div></div>
            <div className="reference-pickup-grid">{modes.map((mode) => <button type="button" key={mode.id} onClick={() => setType(mode.id)} className={`reference-pickup-choice ${type === mode.id ? 'active' : ''}`}><span>{mode.icon}</span><strong>{mode.label}</strong><small>{mode.description}</small></button>)}</div>
            {type === 'LIVRAISON' && <label className="reference-form-field">Adresse de livraison<textarea value={adresseLivraison} onChange={(e) => setAdresseLivraison(e.target.value)} placeholder="Quartier, rue, repère…" rows={3} /></label>}
            <label className="reference-form-field">Heure souhaitée <span>(optionnel)</span><input type="datetime-local" value={heureSouhaitee} onChange={(e) => setHeureSouhaitee(e.target.value)} /></label>
          </section>
        </div>
        <aside className="reference-cart-summary"><p className="reference-eyebrow">Récapitulatif</p><h2>Votre commande</h2><div className="reference-summary-line"><span>Sous-total</span><span>{total.toLocaleString('fr-FR')} F</span></div>
          {reduction > 0 && <div className="reference-summary-line reference-discount"><span>Coupon</span><span>−{reduction.toLocaleString('fr-FR')} F</span></div>}
          <div className="reference-summary-total"><strong>Total</strong><strong>{totalFinal.toLocaleString('fr-FR')} F CFA</strong></div>
          {utilisateur && <label className="reference-form-field reference-coupon-field">Un coupon ?<select value={couponId} onChange={(e) => setCouponId(e.target.value)}><option value="">Aucun coupon</option>{coupons.filter((item) => !item.utilise && (!item.expireAt || new Date(item.expireAt) > new Date())).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.montantFixe != null ? `−${Number(item.montantFixe).toLocaleString('fr-FR')} F` : `−${item.pourcentage}%`}</option>)}</select></label>}
          <div className="reference-payment-options"><p>Mode de paiement</p><div><button type="button" onClick={() => setMethodePaiement('WAVE')} className={methodePaiement === 'WAVE' ? 'active' : ''}>Wave <small>Simulation</small></button><button type="button" onClick={() => setMethodePaiement('A_LA_LIVRAISON')} className={methodePaiement === 'A_LA_LIVRAISON' ? 'active' : ''}>À la livraison <small>Espèces / simulé</small></button></div></div>
          {erreur && <p className="reference-error" role="alert">{erreur}</p>}
          {!utilisateur && <p className="reference-login-hint">Vous pouvez consulter votre panier sans compte. La connexion sera demandée avant l’envoi.</p>}
          <button disabled={envoi} className="reference-button reference-checkout-button">{envoi ? 'Validation…' : utilisateur ? 'Confirmer la commande' : 'Se connecter pour commander'} <span aria-hidden="true">→</span></button>
        </aside>
      </form>}
      <footer className="reference-footer reference-compact-footer"><Link to="/" className="site-brand"><span className="site-brand-mark">R</span><span className="site-brand-name">Resto<span>Clik</span></span></Link><p>Les saveurs de Ziguinchor, livrées à votre porte.</p><small>© {new Date().getFullYear()} RestoClik · Ziguinchor</small></footer>
    </main>
  </div>;
}
