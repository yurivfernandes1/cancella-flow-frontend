import React from 'react';
import '../../styles/UnitsCards.css';

function OcorrenciaCard({ ocorrencia, onClick, isPending = false }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const previewDesc = ocorrencia.descricao?.length > 80
    ? ocorrencia.descricao.slice(0, 80) + '...'
    : ocorrencia.descricao;

  return (
    <div
      className="unit-card"
      onClick={onClick}
      style={{
        cursor: isPending ? 'progress' : 'pointer',
        opacity: isPending ? 0.72 : 1,
      }}
    >
      <div className="unit-card__header">
        <div className="unit-card__header-left">
          <span className="unit-card__title">{ocorrencia.titulo}</span>
        </div>
        {isPending && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.22)',
              color: '#fff',
            }}
          >
            Salvando...
          </span>
        )}
      </div>

      <div className="unit-card__summary">
        <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
          {previewDesc && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
              {previewDesc}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="unit-card__info-item">
              <span className="unit-card__info-label">Data</span>
              <span className="unit-card__info-value" style={{ fontSize: '0.82rem', fontWeight: 500 }}>{formatDate(ocorrencia.created_at)}</span>
            </div>
            {ocorrencia.criado_por_nome && (
              <div className="unit-card__info-item">
                <span className="unit-card__info-label">Por</span>
                <span className="unit-card__info-value" style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ocorrencia.criado_por_nome}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OcorrenciaCard;
