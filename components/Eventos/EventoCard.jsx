import React from 'react';
import ProtectedImage from '../common/ProtectedImage';
import '../../styles/UnitsCards.css';

function EventoCard({ evento, onOpen }) {
  const titulo = evento.titulo || 'Sem título';
  const imagem = evento.imagem_url || null;
  const data = evento.data_evento || '';
  const hora = evento.hora_inicio ? `${(evento.hora_inicio || '').slice(0,5)}${evento.hora_fim ? ` - ${evento.hora_fim.slice(0,5)}` : ''}` : '';

  return (
    <article
      key={evento.id}
      className={`unit-card morador-record-card ${evento.is_active === false ? 'unit-card--inactive' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(evento)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(evento); } }}
    >
      <div className="unit-card__header">
        <div className="unit-card__header-left">
          <span className="unit-card__title">{titulo}</span>
        </div>
        <div className="unit-card__header-right">
          {/* possível badge futura */}
        </div>
      </div>

      <div className="unit-card__summary">
        <div className="unit-card__media" style={{ marginBottom: 8 }}>
          {imagem ? (
            <ProtectedImage src={imagem} alt={titulo} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6 }} />
          ) : (
            <div style={{ width: '100%', height: 140, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Sem imagem</div>
          )}
        </div>

        <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.35rem' }}>
          <div className="unit-card__info-item"><span className="unit-card__info-label">Data</span><span className="unit-card__info-value">{data || '-'}</span></div>
          <div className="unit-card__info-item"><span className="unit-card__info-label">Horário</span><span className="unit-card__info-value">{hora || '-'}</span></div>
          <div className="unit-card__info-item"><span className="unit-card__info-label">Local</span><span className="unit-card__info-value">{evento.espaco_nome || evento.local_texto || '-'}</span></div>
        </div>
      </div>
    </article>
  );
}

export default EventoCard;
