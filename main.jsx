import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import WelcomePage from './pages/WelcomePage';
import PasswordPage from './pages/PasswordPage';
import UsersPage from './pages/UsersPage';
import MoradorPage from './pages/MoradorPage';
import PortariaPage from './pages/PortariaPage';

import SidebarLayout from './components/Layout/SidebarLayout';
import { AuthProvider, useAuth } from './context/AuthContext';

// ─── Layout autenticado compartilhado ─────────────────────────
// Fica montado UMA ÚNICA VEZ durante toda a sessão autenticada.
// Isso evita que a Sidebar (e sua logo) recarreguem a cada navegação.
const AuthenticatedLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem('token');

  if (loading) return null;
  if (!token || !user) return <Navigate to="/login" replace />;

  // Força troca de senha no primeiro acesso (exceto na própria tela)
  if (user?.first_access && location.pathname !== '/perfil/senha') {
    return <Navigate to="/perfil/senha" replace />;
  }

  return <SidebarLayout />;
};

// ─── Guard extra: só síndico / admin acessa gestao-usuarios ───
const ProtectedGestaoUsuariosRoute = ({ children }) => {
  const { user } = useAuth();
  const hasAccess =
    user?.is_staff ||
    user?.is_gestor ||
    user?.groups?.some((g) => ['admin', 'Síndicos'].includes(g.name));

  if (!hasAccess) return <Navigate to="/welcome" replace />;
  return children;
};

// ─── Root ──────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Rotas autenticadas — SidebarLayout monta UMA VEZ */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route
              path="/gestao-usuarios"
              element={
                <ProtectedGestaoUsuariosRoute>
                  <UsersPage />
                </ProtectedGestaoUsuariosRoute>
              }
            />
            <Route path="/minha-area"   element={<MoradorPage />} />
            <Route path="/portaria"     element={<PortariaPage />} />
            <Route path="/perfil/senha" element={<PasswordPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  </React.StrictMode>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
