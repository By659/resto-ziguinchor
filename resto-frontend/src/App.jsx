import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import OnlineStatus from './components/OnlineStatus';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DemandeAcces from './pages/DemandeAcces';
import Menu from './pages/Menu';
import Panier from './pages/Panier';
import SuiviCommande from './pages/SuiviCommande';
import Profil from './pages/Profil';
import KDS from './pages/KDS';
import Dashboard from './pages/Dashboard';
import GestionMenu from './pages/GestionMenu';
import Livreur from './pages/Livreur';
import Historique from './pages/Historique';

export default function App() {
  return <AuthProvider><CartProvider><OnlineStatus /><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/demande-acces" element={<DemandeAcces />} />
    <Route path="/menu" element={<Menu />} />
    <Route path="/restaurants" element={<Menu />} />
    <Route path="/restaurants/:id" element={<Menu />} />
    <Route path="/panier" element={<Panier />} />
    <Route path="/commandes/:id" element={<ProtectedRoute><SuiviCommande /></ProtectedRoute>} />
    <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
    <Route path="/historique" element={<ProtectedRoute><Historique /></ProtectedRoute>} />
    <Route path="/kds" element={<ProtectedRoute roles={['CUISINIER','RESPONSABLE_RESTO','ADMIN']}><KDS /></ProtectedRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute roles={['RESPONSABLE_RESTO','ADMIN']}><Dashboard /></ProtectedRoute>} />
    <Route path="/gestion-menu" element={<ProtectedRoute roles={['RESPONSABLE_RESTO','ADMIN']}><GestionMenu /></ProtectedRoute>} />
    <Route path="/livreur" element={<ProtectedRoute roles={['LIVREUR','ADMIN']}><Livreur /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></CartProvider></AuthProvider>;
}
