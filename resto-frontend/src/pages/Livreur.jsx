import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function montant(valeur) {
  return `${Number(valeur || 0).toLocaleString('fr-FR')} FCFA`;
}

function InterfaceLivreur() {
  const [courses, setCourses] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);

  const charger = useCallback(async () => {
    const [coursesDisponibles, livraisonsEnCours] = await Promise.all([
      api.commandesDisponiblesLivraison(),
      api.mesLivraisons(),
    ]);
    setCourses(coursesDisponibles);
    setLivraisons(livraisonsEnCours);
  }, []);

  useEffect(() => {
    async function initialiser() {
      try {
        await charger();
      } catch (err) {
        setErreur(err.message);
      } finally {
        setChargement(false);
      }
    }
    initialiser();
  }, [charger]);

  async function accepter(commandeId) {
    setActionId(commandeId);
    setErreur(null);
    setMessage(null);
    try {
      await api.accepterCourse(commandeId);
      await charger();
      setMessage('Course acceptée. Elle apparaît maintenant dans vos livraisons en cours.');
    } catch (err) {
      if (err.status === 409) {
        try {
          await charger();
        } catch (refreshError) {
          setErreur(`${err.message}. Impossible d’actualiser la liste : ${refreshError.message}`);
          return;
        }
        setErreur('Cette course vient d’être prise par un autre livreur ou n’est plus disponible. La liste a été actualisée.');
      } else {
        setErreur(err.message);
      }
    } finally {
      setActionId(null);
    }
  }

  async function confirmer(livraison) {
    setActionId(livraison.id);
    setErreur(null);
    setMessage(null);
    try {
      await api.confirmerLivraison(livraison.id);
      await charger();
      setMessage(`Livraison ${livraison.commande.numero} confirmée.`);
    } catch (err) {
      setErreur(err.status === 409
        ? 'Cette livraison n’est plus en cours. Actualisez vos courses.'
        : err.message);
    } finally {
      setActionId(null);
    }
  }

  if (chargement) return <p className="text-center mt-10 text-stone-600">Chargement des courses...</p>;

  return (
    <main className="min-h-screen bg-orange-50/40 p-4 pb-10">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Espace livreur</h1>
          <p className="text-sm text-gray-500 mt-1">Courses disponibles et livraisons en cours</p>
        </div>
        <Link to="/profil" className="text-sm text-orange-600 underline">Profil</Link>
      </header>

      {erreur && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">
          {erreur}
        </div>
      )}
      {message && (
        <p role="status" className="bg-green-50 text-green-700 rounded-xl p-3 mb-4 text-sm">
          {message}
        </p>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-bold text-stone-900 mb-3">Livraisons en cours</h2>
        <div className="flex flex-col gap-3">
          {livraisons.map((livraison) => {
            const commande = livraison.commande;
            return (
              <article key={livraison.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex justify-between gap-3">
                  <h3 className="font-bold text-stone-900">Commande {commande.numero}</h3>
                  <span className="font-semibold text-orange-600">{montant(commande.montantTotal)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {commande.restaurant?.nom || 'Restaurant'}
                  {commande.adresseLivraison ? ` → ${commande.adresseLivraison}` : ''}
                </p>
                <div className="flex gap-4 text-sm text-stone-700 mt-3">
                  <span>Distance : {livraison.distanceKm != null ? `${livraison.distanceKm} km` : 'non estimée'}</span>
                  <span>Durée : {livraison.dureeEstimeeMin != null ? `${livraison.dureeEstimeeMin} min` : 'non estimée'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => confirmer(livraison)}
                  disabled={actionId === livraison.id}
                  className="w-full bg-green-600 disabled:opacity-60 text-white font-semibold rounded-full py-2.5 mt-4"
                >
                  {actionId === livraison.id ? 'Confirmation...' : 'Confirmer la livraison'}
                </button>
              </article>
            );
          })}
          {livraisons.length === 0 && (
            <p className="bg-white rounded-2xl p-4 text-sm text-gray-500">Aucune livraison en cours.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-3">Courses disponibles</h2>
        <div className="flex flex-col gap-3">
          {courses.map((commande) => (
            <article key={commande.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex justify-between gap-3">
                <h3 className="font-bold text-stone-900">Commande {commande.numero}</h3>
                <span className="font-semibold text-orange-600">{montant(commande.montantTotal)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{commande.adresseLivraison || 'Adresse non renseignée'}</p>
              <p className="text-xs text-gray-400 mt-1">{commande.restaurant?.nom || 'Restaurant'}</p>
              <button
                type="button"
                onClick={() => accepter(commande.id)}
                disabled={actionId === commande.id}
                className="w-full bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-full py-2.5 mt-4"
              >
                {actionId === commande.id ? 'Acceptation...' : 'Accepter la course'}
              </button>
            </article>
          ))}
          {courses.length === 0 && (
            <p className="bg-white rounded-2xl p-4 text-sm text-gray-500">Aucune course disponible pour le moment.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default function Livreur() {
  const { utilisateur } = useAuth();

  if (!utilisateur) return <Navigate to="/login" replace />;
  if (utilisateur.role !== 'LIVREUR') {
    return <p className="text-center mt-10 text-red-500">Accès réservé aux livreurs.</p>;
  }

  return <InterfaceLivreur />;
}
