import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function Profil() {
  const { utilisateur, deconnexion } = useAuth();
  const [points, setPoints] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.mesPoints().then(setPoints).catch(() => setPoints({ solde: 0 }));
  }, []);

  function handleDeconnexion() {
    deconnexion();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-orange-50/40 pb-28 p-4">
      <h1 className="text-xl font-bold mb-6">Mon profil</h1>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-orange-200 flex items-center justify-center text-xl font-bold text-orange-700">
          {utilisateur?.nom?.[0] || '?'}
        </div>
        <div>
          <p className="font-semibold">{utilisateur?.nom}</p>
          <p className="text-sm text-gray-500">{utilisateur?.role}</p>
        </div>
      </div>

      <div className="bg-stone-900 text-white rounded-2xl p-5 mt-4">
        <p className="text-sm text-white/60">Points fidélité</p>
        <p className="text-3xl font-bold text-orange-400 mt-1">{points?.solde ?? '...'}</p>
        <p className="text-xs text-white/40 mt-1">1 point tous les 100 FCFA dépensés</p>
      </div>

      <button
        onClick={handleDeconnexion}
        className="w-full mt-6 border border-red-300 text-red-500 rounded-full py-3 font-medium"
      >
        Se déconnecter
      </button>

      <BottomNav />
    </div>
  );
}
