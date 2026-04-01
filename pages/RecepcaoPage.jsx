import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UsersPage.css';

function RecepcaoPage() {
  const { user } = useAuth();
  const hasAccess = user?.groups?.some((g) => g.name === 'Recepção');

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        <div className="units-cards-grid">
          <article className="unit-card">
            <div className="unit-card__header">
              <span className="unit-card__title">Eventos</span>
            </div>
            <div className="unit-card__summary">
              <p style={{ margin: 0, color: '#475569' }}>
                Área de eventos da recepção preparada para implementação do fluxo operacional.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default RecepcaoPage;
