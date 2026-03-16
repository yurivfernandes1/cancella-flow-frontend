import React, { useMemo, useState } from 'react';
import OcorrenciaCard from './OcorrenciaCard';
import '../../styles/OcorrenciasKanban.css';

const STATUS_ORDER = ['aberta', 'em_andamento', 'resolvida'];
const STATUS_LABELS = {
  aberta: 'Abertas',
  em_andamento: 'Em Andamento',
  resolvida: 'Resolvidas',
};

const TIPO_ORDER = ['problema', 'sugestao'];
const TIPO_LABELS = {
  problema: 'Problemas',
  sugestao: 'Sugestoes',
};

const CARDS_STEP = 10;

function getColumnKey(tipo, status) {
  return `${tipo}:${status}`;
}

function OcorrenciasKanbanBoard({
  ocorrencias = [],
  loading = false,
  onCardClick,
  onStatusChange,
  canDrag = true,
  pendingById = {},
}) {
  const [visibleByColumn, setVisibleByColumn] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverKey, setDragOverKey] = useState('');

  const grouped = useMemo(() => {
    const base = {};

    TIPO_ORDER.forEach((tipo) => {
      base[tipo] = {};
      STATUS_ORDER.forEach((status) => {
        base[tipo][status] = [];
      });
    });

    ocorrencias.forEach((ocorrencia) => {
      const tipo = TIPO_ORDER.includes(ocorrencia.tipo) ? ocorrencia.tipo : 'problema';
      const status = STATUS_ORDER.includes(ocorrencia.status) ? ocorrencia.status : 'aberta';
      base[tipo][status].push(ocorrencia);
    });

    STATUS_ORDER.forEach((status) => {
      TIPO_ORDER.forEach((tipo) => {
        base[tipo][status].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });
    });

    return base;
  }, [ocorrencias]);

  const totalOcorrencias = ocorrencias.length;

  const ocorrenciaById = useMemo(() => {
    const map = new Map();
    ocorrencias.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [ocorrencias]);

  const handleShowMore = (tipo, status) => {
    const key = getColumnKey(tipo, status);
    setVisibleByColumn((prev) => ({
      ...prev,
      [key]: (prev[key] || CARDS_STEP) + CARDS_STEP,
    }));
  };

  const handleDragStart = (e, ocorrencia) => {
    if (!canDrag) return;
    const id = String(ocorrencia.id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverKey('');
  };

  const handleDrop = (e, tipo, novoStatus) => {
    if (!canDrag) return;
    e.preventDefault();
    setDragOverKey('');
    setDraggingId(null);

    const draggedId = e.dataTransfer.getData('text/plain');
    const dragged = ocorrenciaById.get(String(draggedId));
    if (!dragged) return;
    if (dragged.status === novoStatus && dragged.tipo === tipo) return;

    // O card pode apenas mudar de status dentro do mesmo tipo.
    if (dragged.tipo !== tipo) return;

    if (onStatusChange) {
      Promise.resolve(onStatusChange(dragged, novoStatus)).catch(() => {
        // Erros são tratados no nível da página.
      });
    }
  };

  if (loading) {
    return (
      <div className="ocorrencias-kanban-loading">
        <p>Carregando ocorrencias...</p>
      </div>
    );
  }

  if (!totalOcorrencias) {
    return (
      <div className="empty-state">
        <p>Nenhuma ocorrencia encontrada com os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div className="ocorrencias-kanban-root">
      <div className="ocorrencias-kanban-summary">
        <strong>{totalOcorrencias}</strong> ocorrencias encontradas
      </div>

      {TIPO_ORDER.map((tipo) => {
        const totalTipo = STATUS_ORDER.reduce((acc, status) => acc + grouped[tipo][status].length, 0);

        return (
          <section key={tipo} className="ocorrencias-kanban-lane">
            <header className="ocorrencias-kanban-lane-header">
              <h3>{TIPO_LABELS[tipo]}</h3>
              <span>{totalTipo} itens</span>
            </header>

            <div className="ocorrencias-kanban-columns">
              {STATUS_ORDER.map((status) => {
                const key = getColumnKey(tipo, status);
                const allCards = grouped[tipo][status];
                const visible = visibleByColumn[key] || CARDS_STEP;
                const cardsToRender = allCards.slice(0, visible);
                const hasMore = allCards.length > cardsToRender.length;

                return (
                  <div
                    key={key}
                    className={`ocorrencias-kanban-column ${dragOverKey === key ? 'ocorrencias-kanban-column--dragover' : ''}`}
                    onDragOver={(e) => {
                      if (!canDrag) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverKey((prev) => (prev === key ? prev : key));
                    }}
                    onDragLeave={() => setDragOverKey((prev) => (prev === key ? '' : prev))}
                    onDrop={(e) => handleDrop(e, tipo, status)}
                  >
                    <div className="ocorrencias-kanban-column-header">
                      <span>{STATUS_LABELS[status]}</span>
                      <strong>{allCards.length}</strong>
                    </div>

                    <div className="ocorrencias-kanban-column-cards">
                      {cardsToRender.length === 0 ? (
                        <p className="ocorrencias-kanban-empty-column">Sem ocorrencias</p>
                      ) : (
                        cardsToRender.map((ocorrencia) => {
                          const isPending = Boolean(pendingById[ocorrencia.id]);
                          return (
                            <div
                              key={ocorrencia.id}
                              className={`ocorrencias-kanban-draggable ${draggingId === String(ocorrencia.id) ? 'ocorrencias-kanban-draggable--dragging' : ''} ${isPending ? 'ocorrencias-kanban-draggable--pending' : ''}`}
                              draggable={canDrag && !isPending}
                              onDragStart={(e) => handleDragStart(e, ocorrencia)}
                              onDragEnd={handleDragEnd}
                            >
                              <OcorrenciaCard
                                ocorrencia={ocorrencia}
                                onClick={() => onCardClick?.(ocorrencia)}
                                isPending={isPending}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>

                    {hasMore && (
                      <button
                        type="button"
                        className="ocorrencias-kanban-more"
                        onClick={() => handleShowMore(tipo, status)}
                      >
                        Mostrar mais {Math.min(CARDS_STEP, allCards.length - cardsToRender.length)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default OcorrenciasKanbanBoard;
