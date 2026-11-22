import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { redimensionnerImage } from '../utils/image';

export default function GestionMenu() {
  const { utilisateur } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [erreur, setErreur] = useState(null);

  // Formulaire nouvelle catégorie
  const [nomCategorie, setNomCategorie] = useState('');

  // Formulaire nouveau plat
  const [categorieChoisie, setCategorieChoisie] = useState('');
  const [nomPlat, setNomPlat] = useState('');
  const [descriptionPlat, setDescriptionPlat] = useState('');
  const [prixPlat, setPrixPlat] = useState('');
  const [photoPlat, setPhotoPlat] = useState(null); // base64

  // Plat en cours d'édition (id du plat, ou null)
  const [editionId, setEditionId] = useState(null);
  const [editionValeurs, setEditionValeurs] = useState({ nom: '', description: '', prix: '', photoUrl: '' });

  async function gererChoixPhoto(e, callback) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const base64 = await redimensionnerImage(fichier);
    callback(base64);
  }

  async function recharger() {
    const restaurants = await api.listerRestaurants();
    if (restaurants[0]) {
      const detail = await api.obtenirRestaurant(restaurants[0].id);
      setRestaurant(detail);
      if (!categorieChoisie && detail.categories[0]) setCategorieChoisie(detail.categories[0].id);
    }
  }

  useEffect(() => {
    recharger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ajouterCategorie(e) {
    e.preventDefault();
    setErreur(null);
    try {
      await api.creerCategorie({ nom: nomCategorie, restaurantId: restaurant.id, ordre: restaurant.categories.length });
      setNomCategorie('');
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function ajouterPlat(e) {
    e.preventDefault();
    setErreur(null);
    try {
      await api.creerPlat({
        nom: nomPlat,
        description: descriptionPlat || undefined,
        prix: Number(prixPlat),
        photoUrl: photoPlat || undefined,
        restaurantId: restaurant.id,
        categorieId: categorieChoisie,
      });
      setNomPlat('');
      setDescriptionPlat('');
      setPrixPlat('');
      setPhotoPlat(null);
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  function commencerEdition(plat) {
    setEditionId(plat.id);
    setEditionValeurs({ nom: plat.nom, description: plat.description || '', prix: plat.prix, photoUrl: plat.photoUrl || '' });
  }

  async function sauvegarderEdition(platId) {
    setErreur(null);
    try {
      await api.modifierPlat(platId, {
        nom: editionValeurs.nom,
        description: editionValeurs.description || undefined,
        prix: Number(editionValeurs.prix),
        photoUrl: editionValeurs.photoUrl || undefined,
      });
      setEditionId(null);
      recharger();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function toggleDispo(plat) {
    await api.basculerDisponibilitePlat(plat.id);
    recharger();
  }

  async function supprimer(plat) {
    if (!confirm(`Supprimer "${plat.nom}" ?`)) return;
    await api.supprimerPlat(plat.id);
    recharger();
  }

  if (utilisateur && !['RESPONSABLE_RESTO', 'ADMIN'].includes(utilisateur.role)) {
    return <p className="text-center mt-10 text-red-500">Accès réservé au responsable du restaurant.</p>;
  }

  if (!restaurant) return <p className="text-center mt-10">Chargement...</p>;

  return (
    <div className="min-h-screen bg-stone-100 p-4 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion du menu</h1>
        <div className="flex gap-3 text-sm">
          <Link to="/kds" className="text-orange-600 underline">KDS</Link>
          <Link to="/dashboard" className="text-orange-600 underline">Dashboard</Link>
        </div>
      </div>

      {erreur && <p className="text-red-500 text-sm mb-3">{erreur}</p>}

      {/* Ajouter une catégorie */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <h2 className="font-semibold mb-2">Nouvelle catégorie</h2>
        <form onSubmit={ajouterCategorie} className="flex gap-2">
          <input
            type="text"
            placeholder="Ex: Boissons"
            value={nomCategorie}
            onChange={(e) => setNomCategorie(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1"
            required
          />
          <button type="submit" className="bg-stone-900 text-white rounded-lg px-4 text-sm">
            Ajouter
          </button>
        </form>
      </div>

      {/* Ajouter un plat */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <h2 className="font-semibold mb-2">Nouveau plat</h2>
        <form onSubmit={ajouterPlat} className="flex flex-col gap-2">
          <select
            value={categorieChoisie}
            onChange={(e) => setCategorieChoisie(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          >
            <option value="" disabled>Choisir une catégorie</option>
            {restaurant.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Nom du plat"
            value={nomPlat}
            onChange={(e) => setNomPlat(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Description (optionnel)"
            value={descriptionPlat}
            onChange={(e) => setDescriptionPlat(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Prix (FCFA)"
            value={prixPlat}
            onChange={(e) => setPrixPlat(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            required
            min="0"
          />
          <div>
            <label className="text-sm text-gray-500 block mb-1">Photo (optionnel)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => gererChoixPhoto(e, setPhotoPlat)}
              className="text-sm"
            />
            {photoPlat && (
              <img src={photoPlat} alt="aperçu" className="max-h-20 w-auto rounded-lg mt-2" />
            )}
          </div>
          <button type="submit" className="bg-orange-500 text-white rounded-lg py-2 text-sm font-medium">
            Ajouter le plat
          </button>
        </form>
      </div>

      {/* Liste des plats par catégorie */}
      {restaurant.categories.map((cat) => (
        <div key={cat.id} className="mb-5">
          <h2 className="font-semibold mb-2">{cat.nom}</h2>
          <div className="flex flex-col gap-2">
            {cat.plats.map((plat) => (
              <div key={plat.id} className="bg-white rounded-xl p-3 shadow-sm">
                {editionId === plat.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      value={editionValeurs.nom}
                      onChange={(e) => setEditionValeurs((v) => ({ ...v, nom: e.target.value }))}
                      className="border rounded-lg px-2 py-1 text-sm"
                    />
                    <input
                      value={editionValeurs.description}
                      onChange={(e) => setEditionValeurs((v) => ({ ...v, description: e.target.value }))}
                      className="border rounded-lg px-2 py-1 text-sm"
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      value={editionValeurs.prix}
                      onChange={(e) => setEditionValeurs((v) => ({ ...v, prix: e.target.value }))}
                      className="border rounded-lg px-2 py-1 text-sm"
                    />
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Changer la photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          gererChoixPhoto(e, (b64) => setEditionValeurs((v) => ({ ...v, photoUrl: b64 })))
                        }
                        className="text-xs"
                      />
                      {editionValeurs.photoUrl && (
                        <img src={editionValeurs.photoUrl} alt="aperçu" className="max-h-16 w-auto rounded-lg mt-1" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => sauvegarderEdition(plat.id)}
                        className="bg-orange-500 text-white text-xs rounded-lg px-3 py-1.5 flex-1"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditionId(null)}
                        className="border text-xs rounded-lg px-3 py-1.5 flex-1"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-3">
                    {plat.photoUrl ? (
                      <img src={plat.photoUrl} alt={plat.nom} className="max-h-16 w-auto rounded-lg shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-stone-100 flex items-center justify-center text-xl shrink-0">
                        🍽️
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{plat.nom}</p>
                      <p className="text-xs text-gray-400">{plat.description}</p>
                      <p className="text-sm font-semibold mt-1">{plat.prix} F</p>
                      <span className={`text-xs ${plat.disponible ? 'text-green-600' : 'text-red-500'}`}>
                        {plat.disponible ? 'Disponible' : 'Indisponible'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <button onClick={() => toggleDispo(plat)} className="text-orange-600 underline">
                        {plat.disponible ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => commencerEdition(plat)} className="text-gray-500 underline">
                        Modifier
                      </button>
                      <button onClick={() => supprimer(plat)} className="text-red-500 underline">
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {cat.plats.length === 0 && <p className="text-sm text-gray-300">Aucun plat dans cette catégorie.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
