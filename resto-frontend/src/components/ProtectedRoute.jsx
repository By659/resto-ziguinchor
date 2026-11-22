import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { utilisateur } = useAuth(); const location = useLocation();
  if (!utilisateur || !localStorage.getItem('token')) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles?.length && !roles.includes(utilisateur.role)) return <Navigate to="/menu" replace />;
  return children;
}
