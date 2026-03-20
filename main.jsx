import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './index.css';
import ScrollToTop from './components/common/ScrollToTop';
import GroupsCardsInjector from './components/Global/GroupsCardsInjector';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import WelcomePage from './pages/WelcomePage';
import PasswordPage from './pages/PasswordPage';
import ProfilePage from './pages/ProfilePage';
import AccessQrPage from './pages/AccessQrPage';
import UsersPage from './pages/UsersPage';
import UsersPageWrapper from './pages/UsersPageWrapper';
import MoradorPage from './pages/MoradorPage';
import PortariaPage from './pages/PortariaPage';

import SidebarLayout from './components/Layout/SidebarLayout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';

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
      <ToastProvider>
      <Router>
        <ScrollToTop />
        <GroupsCardsInjector />
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/:slug" element={<SignupPage />} />

          {/* Rotas autenticadas — SidebarLayout monta UMA VEZ */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route
              path="/gestao-usuarios"
              element={
                <ProtectedGestaoUsuariosRoute>
                  <UsersPageWrapper />
                </ProtectedGestaoUsuariosRoute>
              }
            />
            <Route path="/minha-area"   element={<MoradorPage />} />
            <Route path="/portaria"     element={<PortariaPage />} />
            <Route path="/perfil/meu" element={<ProfilePage />} />
            <Route path="/perfil/qr" element={<AccessQrPage />} />
            <Route path="/perfil/senha" element={<PasswordPage />} />
          </Route>
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Register service worker for PWA
// Register service worker for PWA only in production build
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && import.meta.env && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

        // If there's an updated worker waiting, ask it to skip waiting.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Listen for updates found (a new worker installing)
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available — ask it to activate immediately
              if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          });
        });

        // When the controlling service worker changes, reload the page
        // so the user gets the latest assets.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
