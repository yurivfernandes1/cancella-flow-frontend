import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UsersPage.css';

const SECTIONS = {
  eventos: {
    label: 'Eventos',
    description: 'Área preparada para implementação das funcionalidades de Eventos do Cerimonialista.',
  },
  lista_convidados: {
    label: 'Lista de Convidados',
    description: 'Área preparada para implementação das funcionalidades de Lista de Convidados do Cerimonialista.',
  },
  lista_funcionarios: {
    label: 'Lista de Funcionários',
    description: 'Área preparada para implementação das funcionalidades de Lista de Funcionários do Cerimonialista.',
  },
  organizadores_evento: {
    label: 'Organizador de Eventos',
    description: 'Área preparada para implementação das funcionalidades de cadastro de Organizadores de Eventos.',
  },
  funcionarios: {
    label: 'Funcionários',
    description: 'Área preparada para implementação das funcionalidades de cadastro de Funcionários.',
  },
};

function CerimonialistaPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const hasAccess = user?.groups?.some((g) => g.name === 'Cerimonialista');
  const activeTab = searchParams.get('tab') || 'eventos';
  const section = SECTIONS[activeTab] || SECTIONS.eventos;

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        <div className="units-cards-grid">
          <article className="unit-card">
            <div className="unit-card__header">
              <span className="unit-card__title">{section.label}</span>
            </div>
            <div className="unit-card__summary">
              <p style={{ margin: 0, color: '#475569' }}>
                {section.description}
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export default CerimonialistaPage;
