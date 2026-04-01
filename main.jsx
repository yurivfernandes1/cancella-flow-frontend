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
import CerimonialistasAdminPage from './pages/CerimonialistasAdminPage';
import CerimonialistaPage from './pages/CerimonialistaPage';
import RecepcaoPage from './pages/RecepcaoPage';
import OrganizadorEventoPage from './pages/OrganizadorEventoPage';

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

const ProtectedAdminRoute = ({ children }) => {
  const { user } = useAuth();
  const hasAccess = user?.is_staff || user?.groups?.some((g) => g.name === 'admin');

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
            <Route path="/cerimonialista" element={<CerimonialistaPage />} />
            <Route path="/recepcao" element={<RecepcaoPage />} />
            <Route path="/organizador-evento" element={<OrganizadorEventoPage />} />
            <Route
              path="/admin/cerimonialistas"
              element={
                <ProtectedAdminRoute>
                  <CerimonialistasAdminPage />
                </ProtectedAdminRoute>
              }
            />
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
  // If user passed ?clearCache=1, try to unregister existing SWs and clear caches,
  // then reload without registering a new worker. Useful for remote support.
  const _url = new URL(window.location.href);
  if (_url.searchParams.get('clearCache') === '1') {
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if (window.caches) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (e) {
        console.warn('Error clearing service worker caches', e);
      } finally {
        _url.searchParams.delete('clearCache');
        window.location.replace(_url.toString());
      }
    })();
  } else {
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
}

// --- Version polling to allow remote cache clearing ---
if (import.meta.env && import.meta.env.PROD) {
  (function startAppVersionPolling() {
    const VERSION_URL = '/app-version.json';
    const POLL_INTERVAL_MS = 60 * 1000; // 60s

    async function fetchVersion() {
      try {
        const res = await fetch(VERSION_URL, { cache: 'no-store' });
        if (!res || !res.ok) return null;
        const json = await res.json();
        return json && json.version ? String(json.version) : null;
      } catch (e) {
        return null;
      }
    }

    (async () => {
      const initial = await fetchVersion();
      if (initial) localStorage.setItem('appVersion', initial);

      setInterval(async () => {
        const v = await fetchVersion();
        if (!v) return;
        const old = localStorage.getItem('appVersion');
        if (!old) {
          localStorage.setItem('appVersion', v);
          return;
        }
        if (v !== old) {
          // Version changed: instruct SW to clear caches, then reload
          localStorage.setItem('appVersion', v);
          try {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(async (reg) => {
                try {
                  if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'CLEAR_CACHES' });
                  } else if (reg.active) {
                    reg.active.postMessage({ type: 'CLEAR_CACHES' });
                  }
                } catch (e) {
                  // ignore
                }
              }));
            }

            if (window.caches) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
          } catch (e) {
            // ignore
          }

          // Force reload so client fetches latest assets
          try { location.reload(); } catch (e) { /* ignore */ }
        }
      }, POLL_INTERVAL_MS);
    })();
  })();
}
