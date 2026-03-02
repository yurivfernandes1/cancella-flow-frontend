import React from 'react';
import '../../styles/GenericMobileCard.css';

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  resolvida: 'Resolvida',
  fechada: 'Fechada',
};

const STATUS_COLORS = {
  aberta: { bg: '#fee2e2', color: '#dc2626' },
  em_andamento: { bg: '#fef9c3', color: '#ca8a04' },
  resolvida: { bg: '#dcfce7', color: '#15803d' },
  fechada: { bg: '#f3f4f6', color: '#6b7280' },
};

const TIPO_LABELS = {
  problema: 'Problema',
  sugestao: 'Sugestão',
};

function OcorrenciaCard({ ocorrencia, onClick }) {
  const statusStyle = STATUS_COLORS[ocorrencia.status] || STATUS_COLORS.fechada;
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
    <div className="generic-mobile-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="generic-mobile-card-header">
        <span className="generic-mobile-card-title">{ocorrencia.titulo}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
            background: ocorrencia.tipo === 'problema' ? '#fee2e2' : '#dbeafe',
            color: ocorrencia.tipo === 'problema' ? '#dc2626' : '#1d4ed8',
          }}>
            {TIPO_LABELS[ocorrencia.tipo] || ocorrencia.tipo}
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
            background: statusStyle.bg,
            color: statusStyle.color,
          }}>
            {STATUS_LABELS[ocorrencia.status] || ocorrencia.status}
          </span>
        </div>
      </div>

      {previewDesc && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '6px 0 4px', lineHeight: 1.5 }}>
          {previewDesc}
        </p>
      )}

      <div className="generic-mobile-card-footer">
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          {formatDate(ocorrencia.created_at)}
        </span>
        {ocorrencia.criado_por_nome && (
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
            por {ocorrencia.criado_por_nome}
          </span>
        )}
      </div>
    </div>
  );
}

export default OcorrenciaCard;
