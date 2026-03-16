import React, { useMemo } from 'react';
import '../../styles/OcorrenciasKanban.css';
import '../../styles/UnitsCards.css';

const STATUS_ORDER = ['rascunho', 'ativo', 'inativo'];
const STATUS_LABELS = {
  rascunho: 'Rascunhos',
  ativo: 'Ativos',
  inativo: 'Inativos',
};

function AvisoCard({ aviso, onClick, isPending }) {
  const formatDate = (v) => {
    if (!v) return '-';
    try {
      return new Date(v).toLocaleDateString('pt-BR');
    } catch {
      return v;
    }
  };

  return (
    <div
      className="unit-card"
      onClick={onClick}
      style={{ cursor: isPending ? 'progress' : 'pointer', opacity: isPending ? 0.72 : 1 }}
    >
      <div className="unit-card__header">
        <div className="unit-card__header-left">
          <span className="unit-card__title">{aviso.titulo || 'Sem título'}</span>
        </div>
        {isPending && (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.22)', color: '#fff' }}>
            Salvando...
          </span>
        )}
      </div>
      <div className="unit-card__summary">
        <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.45rem' }}>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.5 }}>
            {(aviso.descricao || '').slice(0, 120)}{(aviso.descricao || '').length > 120 ? '...' : ''}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="unit-card__info-item">
              <span className="unit-card__info-label">Prioridade</span>
              <span className="unit-card__info-value" style={{ fontSize: '0.82rem' }}>{aviso.prioridade || '-'}</span>
            </div>
            <div className="unit-card__info-item">
              <span className="unit-card__info-label">Início</span>
              <span className="unit-card__info-value" style={{ fontSize: '0.82rem' }}>{formatDate(aviso.data_inicio)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvisosKanbanBoard({
  avisos = [],
  loading = false,
  canDrag = false,
  onStatusChange,
  onCardClick,
  pendingById = {},
  visibleStatuses,
}) {
  const statusesToRender =
    Array.isArray(visibleStatuses) && visibleStatuses.length > 0
      ? STATUS_ORDER.filter((status) => visibleStatuses.includes(status))
      : STATUS_ORDER;

  const grouped = useMemo(() => {
    const base = { rascunho: [], ativo: [], inativo: [] };
    avisos.forEach((a) => {
      const st = STATUS_ORDER.includes(a.status) ? a.status : 'ativo';
      base[st].push(a);
    });
    STATUS_ORDER.forEach((st) => {
      base[st].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    });
    return base;
  }, [avisos]);

  const handleDrop = (e, nextStatus) => {
    if (!canDrag) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const aviso = avisos.find((a) => String(a.id) === String(raw));
    if (!aviso || aviso.status === nextStatus) return;
    onStatusChange?.(aviso, nextStatus);
  };

  if (loading) {
    return <div className="ocorrencias-kanban-loading"><p>Carregando avisos...</p></div>;
  }

  return (
    <div className="ocorrencias-kanban-root">
      <div className="ocorrencias-kanban-summary"><strong>{avisos.length}</strong> avisos</div>
      <section className="ocorrencias-kanban-lane">
        <div className="ocorrencias-kanban-columns">
          {statusesToRender.map((status) => (
            <div
              key={status}
              className="ocorrencias-kanban-column"
              onDragOver={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="ocorrencias-kanban-column-header">
                <span>{STATUS_LABELS[status]}</span>
                <strong>{grouped[status].length}</strong>
              </div>
              <div className="ocorrencias-kanban-column-cards">
                {grouped[status].length === 0 ? (
                  <p className="ocorrencias-kanban-empty-column">Sem avisos</p>
                ) : grouped[status].map((aviso) => {
                  const isPending = Boolean(pendingById[aviso.id]);
                  return (
                    <div
                      key={aviso.id}
                      className={`ocorrencias-kanban-draggable ${isPending ? 'ocorrencias-kanban-draggable--pending' : ''}`}
                      draggable={canDrag && !isPending}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(aviso.id))}
                    >
                      <AvisoCard aviso={aviso} onClick={() => onCardClick?.(aviso)} isPending={isPending} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AvisosKanbanBoard;
