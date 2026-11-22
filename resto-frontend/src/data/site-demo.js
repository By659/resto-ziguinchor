export const IMAGES_RESTOCLIK = {
  hero: '/images/restoclik-hero.jpg',
  dibi: '/images/restoclik-dibi.jpg',
  burger: '/images/restoclik-burger.jpg',
  yassa: '/images/restoclik-yassa.jpg',
};

export const CATEGORIES_RESTOCLIK = [
  { nom: 'Sénégalaise', icone: '🍲' },
  { nom: 'Grillades', icone: '🔥' },
  { nom: 'Burgers', icone: '🍔' },
  { nom: 'Casamançaise', icone: '🐟' },
];

export const RESTAURANTS_DEMO = [
  {
    id: 'demo-1', nom: 'Chez Awa', categorie: 'Sénégalaise', quartier: 'Boucotte',
    adresse: 'Boucotte, Ziguinchor', description: 'Les recettes généreuses de la maison, préparées chaque jour.',
    note: '4.8', tempsLivraison: '25–40 min', fraisLivraison: 500, imageUrl: IMAGES_RESTOCLIK.hero,
    ouvert: true, offre: '−20 % sur le thiéb',
  },
  {
    id: 'demo-2', nom: 'Dibiterie Teranga', categorie: 'Grillades', quartier: 'Escale',
    adresse: 'Escale, Ziguinchor', description: 'Viandes braisées et grillades préparées minute.',
    note: '4.7', tempsLivraison: '20–35 min', fraisLivraison: 700, imageUrl: IMAGES_RESTOCLIK.dibi,
    ouvert: true,
  },
  {
    id: 'demo-3', nom: 'Casa Burger', categorie: 'Burgers', quartier: 'Centre-ville',
    adresse: 'Centre-ville, Ziguinchor', description: 'Burgers gourmands, frites maison et recettes locales.',
    note: '4.5', tempsLivraison: '15–30 min', fraisLivraison: 500, imageUrl: IMAGES_RESTOCLIK.burger,
    ouvert: true, offre: 'Livraison offerte dès 10 000 F',
  },
  {
    id: 'demo-4', nom: 'Le Kassa', categorie: 'Casamançaise', quartier: 'Santhiaba',
    adresse: 'Santhiaba, Ziguinchor', description: 'Une cuisine casamançaise inspirée des produits du marché.',
    note: '4.6', tempsLivraison: '30–45 min', fraisLivraison: 600, imageUrl: IMAGES_RESTOCLIK.yassa,
    ouvert: false,
  },
];

export const MENUS_DEMO = {
  'demo-1': [
    { id: 'demo-dish-1', nom: 'Thiéboudienne', description: 'Riz parfumé, poisson, légumes et sauce tomate maison.', prix: 3000, photoUrl: IMAGES_RESTOCLIK.hero, categorieNom: 'Plats', badge: '−20 %' },
    { id: 'demo-dish-2', nom: 'Yassa poulet', description: 'Poulet tendre, oignons citronnés et riz parfumé.', prix: 3500, photoUrl: IMAGES_RESTOCLIK.yassa, categorieNom: 'Plats', badge: 'Maison' },
    { id: 'demo-dish-3', nom: 'Jus de bissap frais', description: 'Bissap local, menthe et pointe de vanille.', prix: 800, photoUrl: IMAGES_RESTOCLIK.yassa, categorieNom: 'Boissons', badge: 'Frais' },
  ],
  'demo-2': [
    { id: 'demo-dish-4', nom: 'Dibi poulet', description: 'Poulet braisé au feu de bois, oignons et moutarde.', prix: 4000, photoUrl: IMAGES_RESTOCLIK.dibi, categorieNom: 'Grillades', badge: 'Populaire' },
    { id: 'demo-dish-5', nom: 'Dibi viande', description: 'Viande grillée, épices maison et accompagnement du jour.', prix: 4500, photoUrl: IMAGES_RESTOCLIK.dibi, categorieNom: 'Grillades', badge: 'Signature' },
  ],
  'demo-3': [
    { id: 'demo-dish-6', nom: 'Casa Burger', description: 'Steak grillé, fromage, salade et sauce maison.', prix: 3500, photoUrl: IMAGES_RESTOCLIK.burger, categorieNom: 'Burgers', badge: 'Best-seller' },
    { id: 'demo-dish-7', nom: 'Burger poulet croustillant', description: 'Poulet croustillant, crudités et frites maison.', prix: 3200, photoUrl: IMAGES_RESTOCLIK.burger, categorieNom: 'Burgers', badge: 'Maison' },
  ],
  'demo-4': [
    { id: 'demo-dish-8', nom: 'Yassa casamançais', description: 'Poulet mariné au citron, oignons et riz blanc.', prix: 3500, photoUrl: IMAGES_RESTOCLIK.yassa, categorieNom: 'Plats', badge: 'Local' },
  ],
};

export function categorieRestaurant(restaurant = {}) {
  return restaurant.categorie || restaurant.typeRestaurant || restaurant.cuisine || restaurant.categories?.[0]?.nom || 'Cuisine locale';
}

export function imageRestaurant(restaurant = {}) {
  if (restaurant.imageUrl || restaurant.photoUrl) return restaurant.imageUrl || restaurant.photoUrl;
  const description = `${restaurant.nom || ''} ${categorieRestaurant(restaurant)}`.toLowerCase();
  if (description.includes('burger')) return IMAGES_RESTOCLIK.burger;
  if (description.includes('dibi') || description.includes('grill')) return IMAGES_RESTOCLIK.dibi;
  if (description.includes('yassa') || description.includes('kassa')) return IMAGES_RESTOCLIK.yassa;
  return IMAGES_RESTOCLIK.hero;
}

export function restaurantOuvert(restaurant = {}) {
  return restaurant.actif !== false && restaurant.ouvert !== false && restaurant.estOuvert !== false && restaurant.ouvertMaintenant !== false;
}
