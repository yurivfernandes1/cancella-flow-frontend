import React, { useState } from 'react';
import { FaEdit, FaChevronDown, FaChevronRight, FaBuilding } from 'react-icons/fa';
import '../../styles/GenericMobileCard.css';
import '../../styles/UnitsCards.css';

/**
 * Grid de cards de espaços do condomínio.
 *
 * Props:
 *  - espacos: array de objetos { id, nome, capacidade_pessoas, valor_aluguel, is_active, created_on }
 *  - loading: boolean
 *  - currentPage, totalPages, onPageChange: paginação
 *  - onEdit(espaco): callback para abrir modal de edição
 */
function EspacoCards({
  espacos = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onEdit,
}) {
  const [expandedCards, setExpandedCards] = useState({});

  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatValor = (v) => {
    if (!v && v !== 0) return '-';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatData = (v) => {
    if (!v) return '-';
    return new Date(v).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="loading-state" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Carregando espaços...</div>;
  }

  if (!espacos.length) {
    return <div className="empty-state" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum espaço encontrado.</div>;
  }

  return (
    <div>
      <div className="units-cards-grid">
        {espacos.map(espaco => {
          const isExp = expandedCards[espaco.id];
          const isActive = espaco.is_active !== false;

          return (
            <div
              key={espaco.id}
              className={`unit-card ${isExp ? 'unit-card--expanded' : ''} ${!isActive ? 'unit-card--inactive' : ''}`}
            >
              {/* Cabeçalho */}
              <div
                className="unit-card__header"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleCard(espaco.id)}
              >
                <div className="unit-card__header-left">
                  <FaBuilding className="unit-card__icon" />
                  <span className="unit-card__title">{espaco.nome}</span>
                </div>
                <div className="unit-card__header-right">
                  <span className={`unit-card__status-badge ${isActive ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="unit-card__chevron">
                    {isExp ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                </div>
              </div>

              {/* Resumo */}
              <div
                className="unit-card__summary"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleCard(espaco.id)}
              >
                <div className="unit-card__info">
                  <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span className="unit-card__info-label">Capacidade</span>
                    <span className="unit-card__info-value">{espaco.capacidade_pessoas || 0} pessoas</span>
                  </div>
                  {espaco.valor_aluguel ? (
                    <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span className="unit-card__info-label">Valor do aluguel</span>
                      <span className="unit-card__info-value">{formatValor(espaco.valor_aluguel)}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Seção expandida */}
              {isExp && (
                <div className="unit-card__residents">
                  <div className="unit-card__resident-view">
                    <div className="unit-card__resident-info">
                      <span className="unit-card__resident-cpf">
                        Criado em: {formatData(espaco.created_on)}
                      </span>
                    </div>
                    <div className="unit-card__resident-actions">
                      <button
                        className="edit-button"
                        title="Editar espaço"
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(espaco); }}
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pagination">
        <div className="pagination-info">
          {espacos.length > 0 ? `Página ${currentPage} de ${totalPages}` : 'Sem registros'}
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || espacos.length === 0}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || espacos.length === 0}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export default EspacoCards;
