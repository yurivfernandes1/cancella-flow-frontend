import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import WelcomePage from './pages/WelcomePage';
import PasswordPage from './pages/PasswordPage';
import UsersPage from './pages/UsersPage';
// EncomendasPage and VisitantesPage imports removed (not used in this router)
import MoradorPage from './pages/MoradorPage';
import PortariaPage from './pages/PortariaPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const ProtectedGestaoUsuariosRoute = ({ children }) => {
  const { user } = useAuth();
  // Permite acesso para admins, gestores e síndicos
  const hasAccess = user?.is_staff || 
                    user?.is_gestor || 
                    user?.groups?.some(group => ['admin', 'Síndicos'].includes(group.name));
  
  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
};

// ProtectedStaffRoute removed (não utilizado)

const FirstAccessRoute = ({ children }) => {
  const { user } = useAuth();
  if (user?.first_access) {
    return <Navigate to="/perfil/senha" replace />;
  }
  return children;
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute>
                <FirstAccessRoute>
                  <WelcomePage />
                </FirstAccessRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestao-usuarios"
            element={
              <ProtectedRoute>
                <FirstAccessRoute>
                  <ProtectedGestaoUsuariosRoute>
                    <UsersPage />
                  </ProtectedGestaoUsuariosRoute>
                </FirstAccessRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/minha-area"
            element={
              <ProtectedRoute>
                <FirstAccessRoute>
                  <MoradorPage />
                </FirstAccessRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portaria"
            element={
              <ProtectedRoute>
                <FirstAccessRoute>
                  <PortariaPage />
                </FirstAccessRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil/senha"
            element={
              <ProtectedRoute>
                <PasswordPage />
              </ProtectedRoute>
            }
          />

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
