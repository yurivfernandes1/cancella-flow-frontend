import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { eventoAPI } from '../services/api';
import UsersPage from './UsersPage';
import EventoCard from '../components/Eventos/EventoCard';
import EventoDetalheModal from '../components/Eventos/EventoDetalheModal';
import EventoModal from '../components/Eventos/EventoModal';
import '../styles/UnitsCards.css';
import '../styles/UsersPage.css';
import '../styles/MoradorPage.css';
import { FaPlus, FaSearch } from 'react-icons/fa';

function UsersPageWrapper() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'condominios';

  const isSindico = !!(user && (user.is_staff || (user.groups || []).some(g => g.name === 'Síndicos')));

  // States for events view
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [incluirEventosConcluidos, setIncluirEventosConcluidos] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);

  useEffect(() => {
    if (activeTab !== 'eventos') return;
    let cancelled = false;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = { page: currentPage, search: searchTerm };
        if (isSindico && incluirEventosConcluidos) params.incluir_finalizados = 1;
        const response = await eventoAPI.list(params);
        const eventosData = response.data.results !== undefined ? response.data.results : response.data;
        let eventosArray = Array.isArray(eventosData) ? eventosData : [];

        if (!isSindico) {
          eventosArray = eventosArray.filter(ev => {
            const fim = ev.datetime_fim || (ev.data_evento && ev.hora_fim ? `${ev.data_evento}T${ev.hora_fim}` : null);
            return !fim || new Date(fim) > new Date();
          });
        }

        if (!cancelled) {
          setEventos(eventosArray);
          setTotalPages(response.data.num_pages || Math.ceil((response.data.count || eventosArray.length || 1) / 10));
        }
      } catch (err) {
        console.error('Erro ao buscar eventos', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    return () => { cancelled = true; };
  }, [activeTab, currentPage, searchTerm, incluirEventosConcluidos, isSindico]);

  if (activeTab !== 'eventos') {
    return <UsersPage />;
  }

  return (
    <div className="morador-page">
      <main className="morador-content">
        <div className="page-header">
        <div className="search-container">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isSindico && (
            <label className="checkbox-label">
              <input type="checkbox" checked={incluirEventosConcluidos} onChange={(e) => { setIncluirEventosConcluidos(e.target.checked); setCurrentPage(1); }} />
              Incluir eventos concluídos
            </label>
          )}
        </div>

        {isSindico && (
          <div>
            <button className="add-button" onClick={() => { setEditingEvento(null); setShowEventoModal(true); }}><FaPlus /> Novo Evento</button>
          </div>
        )}
      </div>

      <div className="units-cards-grid" style={{ marginTop: 12 }}>
        {(!eventos || eventos.length === 0) ? (
          <div className="empty-state compact"><p>Nenhum evento encontrado.</p></div>
        ) : (
          eventos.map(ev => (
            <EventoCard key={ev.id} evento={ev} onOpen={(e) => {
              if (isSindico) {
                setEditingEvento(e);
                setShowEventoModal(true);
              } else {
                setEventoSelecionado(e);
              }
            }} />
          ))
        )}
      </div>

      <div className="pagination" style={{ marginTop: 12 }}>
        <div className="pagination-info">Página {currentPage} de {totalPages || 1}</div>
        <div className="pagination-controls">
          <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1}>Anterior</button>
          <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))} disabled={currentPage >= (totalPages || 1)}>Próxima</button>
        </div>
      </div>

        {eventoSelecionado && (
        <EventoDetalheModal
          isOpen={!!eventoSelecionado}
          evento={eventoSelecionado}
          onClose={() => setEventoSelecionado(null)}
        />
      )}

        {showEventoModal && (
          <EventoModal
            isOpen={showEventoModal}
            onClose={() => { setShowEventoModal(false); setEditingEvento(null); }}
            onSuccess={() => { setShowEventoModal(false); setEditingEvento(null); setCurrentPage(1); }}
            evento={editingEvento}
          />
        )}
      </main>
    </div>
  );
}

export default UsersPageWrapper;
