import { Link, NavLink } from 'react-router-dom';

function Icon({ type, active }) {
  const color = active ? '#e85e25' : '#9da39d';
  const common = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'home') return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></svg>;
  if (type === 'menu') return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
  if (type === 'offer') return <svg {...common}><path d="m20 13-7 7-9-9V4h7l9 9Z"/><circle cx="8" cy="8" r="1"/></svg>;
  if (type === 'orders') return <svg {...common}><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c.5-4 3.3-6 8-6s7.5 2 8 6"/></svg>;
}

const items = [
  { to: '/menu', label: 'Accueil', type: 'home', end: true },
  { to: '/menu#plats', label: 'Menu', type: 'menu' },
  { to: '/menu#offres', label: 'Offres', type: 'offer' },
  { to: '/historique', label: 'Commandes', type: 'orders' },
  { to: '/profil', label: 'Profil', type: 'profile' },
];

export default function BottomNav() {
  return <nav className="mobile-bottom-nav">{items.map((item) => <NavLink key={item.label} to={item.to} end={item.end}>{({ isActive }) => <><Icon type={item.type} active={isActive} /><span className={isActive ? 'active' : ''}>{item.label}</span></>}</NavLink>)}</nav>;
}
