import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Écran cuisine (Kitchen Display System) : trois colonnes selon le statut,
// mises à jour en temps réel via WebSocket (critère : affichage < 2s après validation).
const COLONNES = [
  { statuts: ['EN_ATTENTE', 'CONFIRMEE'], titre: 'Nouvelles' },
  { statuts: ['EN_PREPARATION'], titre: 'En préparation' },
  { statuts: ['PRETE'], titre: 'Prêtes' },
];

function tempsEcoule(depuis) {
  const secondes = Math.floor((Date.now() - new Date(depuis).getTime()) / 1000);
  const m = Math.floor(secondes / 60).toString().padStart(2, '0');
  const s = (secondes % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function Minuteur({ depuis }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono">{tempsEcoule(depuis)}</span>;
}

export default function KDS() {
  const { utilisateur } = useAuth();
  const [commandes, setCommandes] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let fallbackTimer = null;
    async function init() {
      const restaurant = utilisateur?.role === 'RESPONSABLE_RESTO'
        ? await api.monRestaurant()
        : (await api.listerRestaurants())[0];
      const id = restaurant?.id;
      if (!id) return;
      setRestaurantId(id);

      const initiales = await api.commandesRestaurant(id);
      setCommandes(initiales);

      const socket = io(import.meta.env.VITE_SOCKET_URL, {
        auth: { token: localStorage.getItem('token') },
        reconnection: true,
      });
      socketRef.current = socket;
      socket.on('connect', () => {
        if (fallbackTimer) clearInterval(fallbackTimer);
        fallbackTimer = null;
        socket.emit('rejoindre_resto', id);
      });
      socket.on('disconnect', () => {
        if (!fallbackTimer) {
          fallbackTimer = setInterval(() => {
            api.commandesRestaurant(id).then(setCommandes).catch(() => {});
          }, 5000);
        }
      });

      socket.on('nouvelle_commande', (c) => {
        setCommandes((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
      });

      socket.on('statut_commande', (maj) => {
        setCommandes((prev) => {
          const dansKDS = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'PRETE'].includes(maj.statut);
          if (!dansKDS) return prev.filter((c) => c.id !== maj.id); // sortie du flux KDS (livraison, etc.)
          const existe = prev.some((c) => c.id === maj.id);
          return existe ? prev.map((c) => (c.id === maj.id ? { ...c, ...maj } : c)) : [...prev, maj];
        });
      });
    }
    init();
    return () => {
      if (fallbackTimer) clearInterval(fallbackTimer);
      socketRef.current?.disconnect();
    };
  }, [utilisateur?.role]);

  async function avancerStatut(commande) {
    const prochain = {
      EN_ATTENTE: 'CONFIRMEE',
      CONFIRMEE: 'EN_PREPARATION',
      EN_PREPARATION: 'PRETE',
    }[commande.statut];
    if (!prochain) return;
    await api.changerStatutCommande(commande.id, prochain);
    // La mise à jour locale se fera via l'événement WebSocket 'statut_commande'
  }

  if (utilisateur && !['CUISINIER', 'RESPONSABLE_RESTO', 'ADMIN'].includes(utilisateur.role)) {
    return <p className="text-center mt-10 text-red-500">Accès réservé à la cuisine.</p>;
  }

  return (
    <div className="min-h-screen bg-stone-100 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Écran cuisine (KDS)</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/gestion-menu" className="text-orange-600 underline">Menu</Link>
          <Link to="/dashboard" className="text-orange-600 underline">Dashboard</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLONNES.map((colonne) => {
          const commandesColonne = commandes
            .filter((c) => colonne.statuts.includes(c.statut))
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

          return (
            <div key={colonne.titre} className="bg-white rounded-xl p-3">
              <h2 className="font-semibold mb-3 flex justify-between">
                <span>{colonne.titre}</span>
                <span className="text-gray-400">{commandesColonne.length}</span>
              </h2>

              <div className="flex flex-col gap-3">
                {commandesColonne.map((c) => (
                  <div key={c.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-semibold">{c.numero}</span>
                      <Minuteur depuis={c.createdAt} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{c.type.replace('_', ' ')}</p>

                    {c.lignes?.length > 0 && (
                      <ul className="text-sm mt-2 list-disc list-inside text-gray-700">
                        {c.lignes.map((l) => (
                          <li key={l.id}>
                            {l.quantite} × {l.plat?.nom || l.platId}
                          </li>
                        ))}
                      </ul>
                    )}

                    {c.statut !== 'PRETE' && (
                      <button
                        onClick={() => avancerStatut(c)}
                        className="mt-3 w-full bg-orange-500 text-white text-sm rounded-lg py-1.5"
                      >
                        {c.statut === 'EN_PREPARATION' ? 'Marquer prête' : 'Confirmer / démarrer'}
                      </button>
                    )}
                    {c.statut === 'PRETE' && (
                      <p className="mt-3 text-center text-sm text-green-600 font-medium">
                        Prête — en attente de retrait/livraison
                      </p>
                    )}
                  </div>
                ))}
                {commandesColonne.length === 0 && (
                  <p className="text-sm text-gray-300 text-center py-4">Aucune commande</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
