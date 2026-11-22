import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../api/client';
import BottomNav from '../components/BottomNav';

const ETAPES = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE'];
const LIBELLES = { EN_ATTENTE: 'En attente de confirmation', CONFIRMEE: 'Commande confirmée', EN_PREPARATION: 'En préparation', PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée', ANNULEE: 'Annulée' };
function AvisCommande({ commande }) {
  const [noteRepas, setNoteRepas] = useState(0); const [noteLivreur, setNoteLivreur] = useState(0); const [commentaire, setCommentaire] = useState(''); const [envoi, setEnvoi] = useState(false); const [message, setMessage] = useState(null); const [erreur, setErreur] = useState(null);
  if (commande.notation || message === 'envoye') return <div className="bg-[#f2f5ed] border border-[#dce8d7] rounded-2xl p-5 mt-5"><strong className="text-sm">Merci pour votre avis.</strong><p className="text-xs text-gray-500 mt-1">Votre retour nous aide à soutenir les restaurants locaux.</p></div>;
  async function envoyer(e) { e.preventDefault(); if (!noteRepas) { setErreur('Choisissez une note pour le repas.'); return; } setEnvoi(true); try { await api.noterCommande(commande.id, { noteRepas, ...(commande.livreurId && noteLivreur ? { noteLivreur } : {}), commentaire }); setMessage('envoye'); } catch (err) { setErreur(err.message); } finally { setEnvoi(false); } }
  const etoiles = (valeur, setValeur) => <div className="flex gap-1">{[1,2,3,4,5].map((note) => <button type="button" key={note} onClick={() => setValeur(note)} className={`text-2xl ${note <= valeur ? 'text-[#e86f3d]' : 'text-gray-300'}`}>★</button>)}</div>;
  return <form onSubmit={envoyer} className="bg-white border border-gray-200 rounded-2xl p-5 mt-5"><p className="eyebrow">Votre expérience</p><h2 className="font-serif text-2xl">Comment s’est passé votre repas ?</h2><label className="block text-xs font-bold mt-5">Le repas{etoiles(noteRepas, setNoteRepas)}</label>{commande.livreurId && <label className="block text-xs font-bold mt-4">Le livreur{etoiles(noteLivreur, setNoteLivreur)}</label>}<textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Un commentaire ? (facultatif)" className="w-full border rounded-xl p-3 text-sm mt-4" rows={3} />{erreur && <p className="text-red-500 text-xs mt-2">{erreur}</p>}<button disabled={envoi} className="primary-button w-full mt-4">{envoi ? 'Envoi…' : 'Envoyer mon avis'} <span>→</span></button></form>;
}
export default function SuiviCommande() {
  const { id } = useParams(); const [commande, setCommande] = useState(null); const [erreur, setErreur] = useState(null);
  useEffect(() => {
    let socket;
    async function init() {
      try {
        const donnees = await api.obtenirCommande(id);
        setCommande(donnees);
        socket = io(import.meta.env.VITE_SOCKET_URL || 'https://resto-ziguinchor.onrender.com', {
          auth: { token: localStorage.getItem('token') },
        });
        socket.on('connect', () => socket.emit('rejoindre_commande', id));
        socket.on('statut_commande', (maj) => {
          if (maj.id === id) setCommande((prev) => ({ ...prev, ...maj }));
        });
      } catch (e) {
        setErreur(e.message);
      }
    }
    init();
    return () => socket?.disconnect();
  }, [id]);
  if (erreur) return <div className="p-8 text-center text-red-500">{erreur}</div>;
  if (!commande) return <div className="loading-screen"><span className="brand-mark">R</span><p>On suit votre commande…</p></div>;
  const etapeActuelle = ETAPES.indexOf(commande.statut);
  return <main className="min-h-screen bg-[#fbfaf6] pb-28"><header className="topbar"><Link to="/menu" className="wordmark"><span className="wordmark-dot" />Resto<span>Clik</span></Link><Link to="/historique" className="text-xs text-gray-500">Mes commandes</Link></header><div className="max-w-2xl mx-auto px-4 md:px-8 py-10"><p className="eyebrow">Suivi en temps réel</p><h1 className="font-serif text-4xl font-bold">Commande {commande.numero}</h1><p className="text-gray-500 text-sm mt-2">{Number(commande.montantTotal || 0).toLocaleString('fr-FR')} FCFA · {LIBELLES[commande.statut]}</p><div className="bg-white border border-gray-200 rounded-2xl p-6 mt-7 space-y-5">{ETAPES.map((etape, i) => <div key={etape} className="flex items-center gap-4"><div className={`w-4 h-4 rounded-full ring-4 ${i <= etapeActuelle ? 'bg-[#e86f3d] ring-[#fbe0d4]' : 'bg-gray-200 ring-gray-100'}`} /><span className={i <= etapeActuelle ? 'font-bold text-sm' : 'text-gray-400 text-sm'}>{LIBELLES[etape]}</span>{etape === commande.statut && <span className="ml-auto text-[10px] text-[#bd4d2d] font-bold">EN COURS</span>}</div>)}</div>{commande.statut === 'ANNULEE' && <p className="text-red-500 mt-4 text-sm">Commande annulée.</p>}{commande.statut === 'LIVREE' && <AvisCommande commande={commande} />}</div><BottomNav /></main>;
}
