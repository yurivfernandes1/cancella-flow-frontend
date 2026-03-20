import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { eventoAPI, listaConvidadosAPI } from '../services/api';
import UsersPage from './UsersPage';
import ListaConvidadosModal from '../components/Eventos/ListaConvidadosModal';
import AddListaConvidadosModal from '../components/Eventos/AddListaConvidadosModal';
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

  const isMorador = !!(user && (user.groups || []).some(g => g.name === 'Moradores'));

  const canEditLista = (lista) => {
    if (!user || !lista) return false;
    // Morador can edit lists tied to their unit
    if (isMorador) {
      return lista.unidade_id === user.unidade_id || lista.unidade_evento === user.unidade_id;
    }
    // Síndico can edit lists for their unidade (but not all moradores lists)
    if (isSindico) {
      return lista.unidade_evento === user.unidade_id || lista.unidade_id === user.unidade_id;
    }
    return false;
  };
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
  // States for listas de convidados (síndico)
  const [listas, setListas] = useState([]);
  const [listaLoading, setListaLoading] = useState(false);
  const [listaPage, setListaPage] = useState(1);
  const [listaTotalPages, setListaTotalPages] = useState(1);
  const [listaSearch, setListaSearch] = useState('');
  const [somenteHojeSindico, setSomenteHojeSindico] = useState(true);
  const [listaSelecionadaSindico, setListaSelecionadaSindico] = useState(null);
  const [showAddListaSindico, setShowAddListaSindico] = useState(false);

  // Função reutilizável para buscar eventos (pode ser chamada por modais após criação/edição)
  const fetchEvents = async (page = currentPage, search = searchTerm) => {
    let cancelled = false; // usado localmente para proteger quando chamada diretamente
    setLoading(true);
    try {
      const params = { page, search };
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

  useEffect(() => {
    if (activeTab !== 'eventos') return;
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, searchTerm, incluirEventosConcluidos, isSindico]);

  // Fetch listas de convidados when sindico opens that tab
  useEffect(() => {
    if (activeTab !== 'lista_convidados') return;
    let cancelled = false;
    const fetchListas = async () => {
      setListaLoading(true);
      try {
        const d = new Date();
        const hojeLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const params = { search: listaSearch, page: listaPage };
        if (somenteHojeSindico) params.data_evento = hojeLocal;
        const respListas = await listaConvidadosAPI.getListas(params);
        const arr = Array.isArray(respListas.data) ? respListas.data : (respListas.data.results || []);
        if (!cancelled) {
          setListas(arr);
          setListaTotalPages(respListas.data.num_pages || 1);
        }
      } catch (err) {
        console.error('Erro ao buscar listas de convidados', err);
      } finally {
        if (!cancelled) setListaLoading(false);
      }
    };
    fetchListas();
    return () => { cancelled = true; };
  }, [activeTab, listaPage, listaSearch, somenteHojeSindico, isSindico]);

  if (activeTab !== 'eventos' && activeTab !== 'lista_convidados') {
    return <UsersPage />;
  }

  return (
    <div className="morador-page">
      <main className="morador-content">
        {activeTab === 'eventos' && (
          <>
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
          </>
        )}

      {activeTab === 'eventos' && (
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
      )}

      {activeTab === 'lista_convidados' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="search-container">
                <div className="search-wrapper">
                  <FaSearch className="search-icon" />
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Buscar listas..."
                    value={listaSearch}
                    onChange={(e) => { setListaSearch(e.target.value); setListaPage(1); }}
                  />
                </div>
              </div>
              {isSindico && (
                <label className="checkbox-label">
                  <input type="checkbox" checked={somenteHojeSindico} onChange={(e) => { setSomenteHojeSindico(e.target.checked); setListaPage(1); }} />
                  Somente hoje
                </label>
              )}
            </div>

            {isSindico && (
              <div>
                <button className="add-button" onClick={() => setShowAddListaSindico(true)}><FaPlus /> Nova Lista</button>
              </div>
            )}
          </div>

          <div className="units-cards-grid" style={{ marginTop: 12 }}>
            {(!listas || listas.length === 0) ? (
              <div className="empty-state compact"><p>Nenhuma lista encontrada.</p></div>
            ) : (
              listas.map((lista) => {
                const isHoje = (() => {
                  if (!lista?.data_evento) return false;
                  const today = new Date();
                  const d = lista.data_evento.split('-');
                  return `${d[0]}-${d[1]}-${d[2]}` === `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                })();
                return (
                  <article
                    key={lista.id}
                    className={`unit-card morador-record-card lista-convidados-card ${isHoje ? 'lista-convidados-card--hoje' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setListaSelecionadaSindico(lista)}
                  >
                    <div className="unit-card__header">
                      <div className="unit-card__header-left">
                        <span className="unit-card__title">{lista.titulo || 'Sem título'}</span>
                      </div>
                      <div className="unit-card__header-right">
                        {isHoje && <span className="lista-convidados-card__dia-badge">Hoje</span>}
                        <span className={`unit-card__status-badge ${lista.ativa ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                          {lista.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                    <div className="unit-card__summary">
                      <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                        <div className="unit-card__info-item">
                          <span className="unit-card__info-label">Data do evento</span>
                          <span className="unit-card__info-value">{lista.data_evento ? lista.data_evento.split('-').reverse().join('/') : '-'}</span>
                        </div>
                        <div className="unit-card__info-item">
                          <span className="unit-card__info-label">Convidados</span>
                          <span className="unit-card__info-value">{lista.total_convidados ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="pagination" style={{ marginTop: 12 }}>
            <div className="pagination-info">Página {listaPage} de {listaTotalPages || 1}</div>
            <div className="pagination-controls">
              <button type="button" onClick={() => setListaPage((prev) => Math.max(prev - 1, 1))} disabled={listaPage <= 1}>Anterior</button>
              <button type="button" onClick={() => setListaPage((prev) => Math.min(prev + 1, listaTotalPages || 1))} disabled={listaPage >= (listaTotalPages || 1)}>Próxima</button>
            </div>
          </div>

        </>
      )}

      {activeTab === 'eventos' && (
        <div className="pagination" style={{ marginTop: 12 }}>
          <div className="pagination-info">Página {currentPage} de {totalPages || 1}</div>
          <div className="pagination-controls">
            <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1}>Anterior</button>
            <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages || 1))} disabled={currentPage >= (totalPages || 1)}>Próxima</button>
          </div>
        </div>
      )}

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
            onSuccess={() => { setShowEventoModal(false); setEditingEvento(null); setCurrentPage(1); fetchEvents(1, searchTerm); }}
            evento={editingEvento}
          />
        )}

        {listaSelecionadaSindico && (
          <ListaConvidadosModal
            lista={listaSelecionadaSindico}
            readOnly={!canEditLista(listaSelecionadaSindico)}
            onClose={() => setListaSelecionadaSindico(null)}
            onUpdate={() => setListaPage(1)}
          />
        )}

        {showAddListaSindico && (
          <AddListaConvidadosModal
            onClose={() => setShowAddListaSindico(false)}
            onSuccess={() => { setShowAddListaSindico(false); setListaPage(1); }}
            moradorUnidadeId={user?.unidade_id}
          />
        )}
      </main>
    </div>
  );
}

export default UsersPageWrapper;
