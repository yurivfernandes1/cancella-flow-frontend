import React, { useMemo } from 'react';
import '../../styles/OcorrenciasKanban.css';
import '../../styles/UnitsCards.css';

const STATUS_ORDER = ['pendente', 'retirada', 'contestada'];
const STATUS_LABELS = {
  pendente: 'Pendentes',
  retirada: 'Retiradas',
  contestada: 'Contestadas',
};

function getEncomendaStatus(encomenda) {
  if (encomenda.contestado_em && !encomenda.contestacao_resolvida) return 'contestada';
  if (encomenda.retirado_em) return 'retirada';
  return 'pendente';
}

function EncomendaCard({ encomenda, onClick, isPending }) {
  const formatDateTime = (v) => {
    if (!v) return '-';
    try {
      return new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          <span className="unit-card__title">{encomenda.codigo_rastreio || 'Sem rastreio'}</span>
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
            {encomenda.descricao || '-'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="unit-card__info-item">
              <span className="unit-card__info-label">Unidade</span>
              <span className="unit-card__info-value" style={{ fontSize: '0.82rem' }}>{encomenda.unidade_identificacao || '-'}</span>
            </div>
            <div className="unit-card__info-item">
              <span className="unit-card__info-label">Destinatário</span>
              <span className="unit-card__info-value" style={{ fontSize: '0.82rem' }}>{encomenda.destinatario_nome || '-'}</span>
            </div>
          </div>
          {encomenda.contestado_em && !encomenda.contestacao_resolvida && (
            <div style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>
              Contestada em {formatDateTime(encomenda.contestado_em)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EncomendasKanbanBoard({
  encomendas = [],
  loading = false,
  canDrag = false,
  onStatusChange,
  onCardClick,
  pendingById = {},
  canMoveStatus,
  canDragCard,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) {
  const grouped = useMemo(() => {
    const base = { pendente: [], retirada: [], contestada: [] };
    encomendas.forEach((e) => {
      base[getEncomendaStatus(e)].push(e);
    });
    STATUS_ORDER.forEach((st) => {
      base[st].sort((a, b) => new Date(b.created_on || 0) - new Date(a.created_on || 0));
    });
    return base;
  }, [encomendas]);

  const handleDrop = (e, nextStatus) => {
    if (!canDrag) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const encomenda = encomendas.find((i) => String(i.id) === String(raw));
    if (!encomenda) return;
    const current = getEncomendaStatus(encomenda);
    if (current === nextStatus) return;
    if (canMoveStatus && !canMoveStatus(encomenda, nextStatus, current)) return;
    onStatusChange?.(encomenda, nextStatus);
  };

  if (loading) {
    return <div className="ocorrencias-kanban-loading"><p>Carregando encomendas...</p></div>;
  }

  return (
    <div className="ocorrencias-kanban-root">
      <div className="ocorrencias-kanban-summary"><strong>{encomendas.length}</strong> encomendas</div>
      <section className="ocorrencias-kanban-lane">
        <div className="ocorrencias-kanban-columns">
          {STATUS_ORDER.map((status) => (
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
                  <p className="ocorrencias-kanban-empty-column">Sem encomendas</p>
                ) : grouped[status].map((encomenda) => {
                  const isPending = Boolean(pendingById[encomenda.id]);
                  const currentStatus = getEncomendaStatus(encomenda);
                  const canDragThisCard = canDragCard ? canDragCard(encomenda, currentStatus) : true;
                  return (
                    <div
                      key={encomenda.id}
                      className={`ocorrencias-kanban-draggable ${isPending ? 'ocorrencias-kanban-draggable--pending' : ''}`}
                      draggable={canDrag && !isPending && canDragThisCard}
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(encomenda.id))}
                    >
                      <EncomendaCard encomenda={encomenda} isPending={isPending} onClick={() => onCardClick?.(encomenda)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14, alignItems: 'center' }}>
          <button
            type="button"
            className="ocorrencias-kanban-more"
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            className="ocorrencias-kanban-more"
            onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

export default EncomendasKanbanBoard;
