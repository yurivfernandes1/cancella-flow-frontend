import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import GenericTable from '../components/GenericTable';
import AddEncomendaDropdown from '../components/Encomendas/AddEncomendaDropdown';
import { useAuth } from '../context/AuthContext';
import api, { espacoReservaAPI } from '../services/api';
import { formatPlaca } from '../utils/placaValidator';
import '../styles/PortariaPage.css';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import { avisoAPI } from '../services/api';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

const tabs = [
  { id: 'encomendas', label: 'Gestão de Encomendas' },
  { id: 'visitantes', label: 'Gestão de Visitantes' },
  { id: 'veiculos', label: 'Veículos Cadastrados' },
  { id: 'reservas', label: 'Reservas do Dia' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'avisos', label: 'Avisos' }
];

function PortariaPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'encomendas');
  const [tableData, setTableData] = useState({
    encomendas: [],
    visitantes: [],
    veiculos: [],
    reservas: [],
    eventos: [],
    avisos: []
  });
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState({
    encomendas: 1,
    visitantes: 1,
    veiculos: 1,
    reservas: 1,
    eventos: 1,
    avisos: 1
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddEncomenda, setShowAddEncomenda] = useState(false);
  const addEncomendaButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});

  // Verificar se o usuário tem acesso
  const isPortaria = user?.groups?.some(group => group.name === 'Portaria');
  const hasAccess = isPortaria;

  // Debug
  React.useEffect(() => {
    console.log('=== DEBUG PORTARIA PAGE ===');
    console.log('User:', user);
    console.log('Groups:', user?.groups);
    console.log('isPortaria:', isPortaria);
    console.log('hasAccess:', hasAccess);
  }, [user, isPortaria, hasAccess]);

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const fetchData = async (type, page = 1, search = '') => {
    setLoading(true);
    try {
      if (type === 'encomendas') {
        const response = await api.get(`/cadastros/encomendas/?page=${page}&search=${search}`);
        if (response.data.results !== undefined) {
          // Mapear unidade_identificacao para unidade_info
          // Mostrar apenas encomendas que ainda não foram retiradas (retirado_em null/undefined)
          const mappedData = response.data.results
            .map(item => ({ ...item, unidade_info: item.unidade_identificacao || '-' }))
            .filter(item => !item.retirado_em);
          setTableData(prev => ({ ...prev, encomendas: mappedData }));
          setTotalPages(prev => ({
            ...prev,
            encomendas: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          // Mapear unidade_identificacao para unidade_info
          const mappedData = response.data
            .map(item => ({ ...item, unidade_info: item.unidade_identificacao || '-' }))
            .filter(item => !item.retirado_em);
          setTableData(prev => ({ ...prev, encomendas: mappedData }));
          setTotalPages(prev => ({ ...prev, encomendas: 1 }));
        }
      } else if (type === 'visitantes') {
        const response = await api.get(`/cadastros/visitantes/?page=${page}&search=${search}`);
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, visitantes: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            visitantes: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, visitantes: response.data }));
          setTotalPages(prev => ({ ...prev, visitantes: 1 }));
        }
      } else if (type === 'veiculos') {
        const response = await api.get(`/cadastros/veiculos/?page=${page}&search=${search}`);
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, veiculos: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            veiculos: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, veiculos: response.data }));
          setTotalPages(prev => ({ ...prev, veiculos: 1 }));
        }
      } else if (type === 'reservas') {
        const response = await espacoReservaAPI.hoje();
        // Endpoint 'hoje' retorna lista direta, sem paginação
        const items = Array.isArray(response.data) ? response.data : [];
        setTableData(prev => ({ ...prev, reservas: items }));
        setTotalPages(prev => ({ ...prev, reservas: 1 }));
      } else if (type === 'eventos') {
        const response = await api.get(`/cadastros/eventos/?page=${page}&search=${search}`);
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, eventos: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            eventos: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, eventos: response.data }));
          setTotalPages(prev => ({ ...prev, eventos: 1 }));
        }
      } else if (type === 'avisos') {
        const response = await avisoAPI.list({ page, search, vigente: 1 });
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, avisos: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            avisos: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, avisos: response.data }));
          setTotalPages(prev => ({ ...prev, avisos: 1 }));
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setTableData(prev => ({ ...prev, [type]: [] }));
      setTotalPages(prev => ({ ...prev, [type]: 1 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(activeTab, currentPage, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [activeTab, currentPage, searchTerm]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Sincronizar tab da URL com estado
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['encomendas', 'visitantes', 'veiculos', 'reservas', 'eventos', 'avisos'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleSaveEncomenda = async (id, data) => {
    try {
      const payload = {
        descricao: data.descricao,
        codigo_rastreio: data.codigo_rastreio || '',
        retirado_por: data.retirado_por || null,
        retirado_em: data.retirado_em ? new Date(data.retirado_em).toISOString() : null
      };

      await api.patch(`/cadastros/encomendas/${id}/update/`, payload);
      fetchData('encomendas', currentPage, searchTerm);
      setEditingRowId(null);
    } catch (error) {
      console.error('Erro ao atualizar encomenda:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
    }
  };

  // handleSaveVisitante removed (não usado nesta página)

  const handleEditRow = (rowId) => {
    setEditingRowId(rowId);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Colunas para Encomendas (CRUD completo)
  const encomendasColumns = [
    {
      key: 'unidade_info',
      label: 'Unidade',
      width: '150px',
      editable: false
    },
    {
      key: 'destinatario_nome',
      label: 'Destinatário',
      width: '180px',
      editable: false
    },
    {
      key: 'descricao',
      label: 'Descrição',
      width: '220px',
      editable: true
    },
    {
      key: 'codigo_rastreio',
      label: 'Código de Rastreio',
      width: '160px',
      editable: true
    },
    {
      key: 'retirado_por',
      label: 'Retirado Por',
      width: '150px',
      editable: true
    },
    {
      key: 'retirado_em',
      label: 'Data de Retirada',
      width: '180px',
      editable: true,
      type: 'datetime-local',
      render: (value) => formatDateTime(value)
    },
    {
      key: 'created_on',
      label: 'Cadastrado em',
      width: '180px',
      editable: false,
      render: (value) => formatDateTime(value)
    },
    {
      key: 'actions',
      label: 'Ações',
      width: '150px',
      render: (_, row) => {
        if (editingRowId === row.id) {
          return (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSaveEncomenda(row.id, currentEditData)}
                className="action-button save-button"
                title="Salvar"
              >
                <FaCheck />
              </button>
              <button
                onClick={() => setEditingRowId(null)}
                className="action-button cancel-button"
                title="Cancelar"
              >
                <FaTimes />
              </button>
            </div>
          );
        }
        return (
          <button
            onClick={() => {
              handleEditRow(row.id);
              setCurrentEditData(row);
            }}
            className="action-button edit-button"
            title="Editar"
          >
            <FaEdit />
          </button>
        );
      }
    }
  ];

  // Colunas para Visitantes (apenas consulta e edição de datas)
  const visitantesColumns = [
    {
      key: 'morador_nome',
      label: 'Morador',
      width: '200px',
      editable: false
    },
    {
      key: 'nome',
      label: 'Nome do Visitante',
      width: '200px',
      editable: false
    },
    {
      key: 'documento',
      label: 'Documento',
      width: '150px',
      editable: false
    },
    {
      key: 'placa_veiculo',
      label: 'Veículo',
      width: '120px',
      editable: false,
      render: (value) => value ? formatPlaca(value) : '-'
    },
    {
      key: 'data_entrada',
      label: 'Data de Entrada',
      width: '180px',
      editable: false,
      type: 'datetime-local',
      render: (value) => formatDateTime(value)
    },
    {
      key: 'data_saida',
      label: 'Data de Saída',
      width: '180px',
      editable: false,
      type: 'datetime-local',
      render: (value) => formatDateTime(value)
    },
    {
      key: 'is_permanente',
      label: 'Perm.',
      width: '80px',
      editable: false,
      render: (value) => (value ? 'Sim' : 'Não')
    },
    {
      key: 'status',
      label: 'Status',
      width: '150px',
      editable: false,
      render: (_, row) => {
        if (!row.data_entrada) return 'Aguardando';
        if (row.data_saida) return 'Saiu';
        if (row.is_permanente) return 'Permanente';
        return 'No condomínio';
      }
    },
    // Portaria não pode editar visitantes aqui — sem ações
  ];

  // Colunas para Veículos (apenas visualização)
  const veiculosColumns = [
    {
      key: 'morador_nome',
      label: 'Morador',
      width: '200px',
      editable: false
    },
    {
      key: 'placa',
      label: 'Placa',
      width: '150px',
      editable: false,
      render: (value) => value ? formatPlaca(String(value)) : '-'
    },
    {
      key: 'marca_modelo',
      label: 'Marca e Modelo',
      width: '250px',
      editable: false
    },
    {
      key: 'is_active',
      label: 'Status',
      width: '120px',
      editable: false,
      render: (value) => value ? 'Ativo' : 'Inativo'
    },
    {
      key: 'created_on',
      label: 'Data de Cadastro',
      width: '180px',
      editable: false,
      render: (value) => formatDateTime(value)
    }
  ];

  // Colunas para Reservas do Dia
  const reservasColumns = [
    {
      key: 'espaco_nome',
      header: 'Espaço',
      width: '25%',
      render: (value) => value || '-'
    },
    {
      key: 'morador_nome',
      header: 'Morador',
      width: '25%',
      render: (value) => value || '-'
    },
    {
      key: 'unidade',
      header: 'Unidade',
      width: '15%',
      render: (value) => value || '-'
    },
    {
      key: 'valor_cobrado',
      header: 'Valor',
      width: '15%',
      render: (value) => `R$ ${parseFloat(value || 0).toFixed(2)}`
    },
    {
      key: 'status',
      header: 'Status',
      width: '20%',
      render: (value) => (
        <span style={{
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: value === 'confirmada' ? '#dcfce7' : '#fee2e2',
          color: value === 'confirmada' ? '#15803d' : '#dc2626',
          display: 'inline-block'
        }}>
          {value === 'confirmada' ? 'Confirmada' : value === 'pendente' ? 'Pendente' : 'Cancelada'}
        </span>
      )
    }
  ];

  const eventosColumns = [
    {
      key: 'titulo',
      header: 'Título',
      width: '20%',
      render: (value) => value || '-'
    },
    {
      key: 'descricao',
      header: 'Descrição',
      width: '25%',
      render: (value) => value || '-'
    },
    {
      key: 'local_completo',
      header: 'Local',
      width: '20%',
      render: (value, row) => row.espaco_nome || row.local_texto || '-'
    },
    {
      key: 'data_evento',
      header: 'Data',
      width: '12%',
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'hora_inicio',
      header: 'Início',
      width: '10%',
      render: (value) => value || '-'
    },
    {
      key: 'hora_fim',
      header: 'Término',
      width: '10%',
      render: (value) => value || '-'
    }
  ];

  const handleAddEncomenda = () => {
    setShowAddEncomenda(!showAddEncomenda);
  };

  const handleEncomendaAdded = () => {
    setShowAddEncomenda(false);
    fetchData('encomendas', currentPage, searchTerm);
  };

  return (
    <>
      <Header />
      <div className="portaria-page">
        <div className="portaria-content">
          <div className="tabs-container">
            <div className="tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {/* Aba de Encomendas */}
          {activeTab === 'encomendas' && (
            <>
              <div className="page-header">
                <div className="page-actions">
                  <div className="dropdown-wrapper">
                    <button
                      ref={addEncomendaButtonRef}
                      onClick={handleAddEncomenda}
                      className="add-button"
                    >
                      <FaPlus /> Adicionar Encomenda
                    </button>
                    {showAddEncomenda && (
                      <AddEncomendaDropdown
                        onClose={() => setShowAddEncomenda(false)}
                        onEncomendaAdded={handleEncomendaAdded}
                        triggerRef={addEncomendaButtonRef}
                      />
                    )}
                  </div>
                </div>
                <div className="search-container">
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar encomendas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <GenericTable
                data={tableData.encomendas}
                columns={encomendasColumns}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages.encomendas}
                onPageChange={setCurrentPage}
                editingRowId={editingRowId}
                onEditRow={handleEditRow}
                onEditChange={(field, value) => {
                  setCurrentEditData(prev => ({ ...prev, [field]: value }));
                }}
                onEditDataChange={setCurrentEditData}
                currentEditData={currentEditData}
                onSave={handleSaveEncomenda}
                className="full-width-table allow-horizontal-scroll"
                titleColumnKey={'codigo_rastreio'}
              />
            </>
          )}

          {/* Aba de Visitantes */}
          {activeTab === 'visitantes' && (
            <>
              <div className="page-header">
                <div className="search-container">
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar visitantes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <GenericTable
                data={tableData.visitantes}
                columns={visitantesColumns}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages.visitantes}
                onPageChange={setCurrentPage}
                editingRowId={null}
                currentEditData={{}}
                className="full-width-table allow-horizontal-scroll"
                hideEditButton={true}
              />
            </>
          )}

          {/* Aba de Veículos */}
          {activeTab === 'veiculos' && (
            <>
              <div className="page-header">
                <div className="search-container">
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar veículos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <GenericTable
                data={tableData.veiculos}
                columns={veiculosColumns}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages.veiculos}
                onPageChange={setCurrentPage}
                editingRowId={null}
                currentEditData={{}}
                hideEditButton={true}
                className="full-width-table allow-horizontal-scroll"
              />
            </>
          )}

          {/* Aba de Reservas do Dia */}
          {activeTab === 'reservas' && (
            <>
              <div className="filters-section">
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 8, marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#64748b' }}>
                    📅 Reservas para hoje - {new Date().toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h3>
                </div>
              </div>

              {tableData.reservas.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma reserva para hoje.</p>
                </div>
              ) : (
                <GenericTable
                  data={tableData.reservas}
                  columns={reservasColumns}
                  loading={loading}
                  currentPage={1}
                  totalPages={1}
                  onPageChange={() => {}}
                  editingRowId={null}
                  currentEditData={{}}
                  className="full-width-table allow-horizontal-scroll"
                  hideEditButton={true}
                />
              )}
            </>
          )}

          {/* Aba de Eventos */}
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
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <GenericTable
                data={tableData.eventos}
                columns={eventosColumns}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages.eventos}
                onPageChange={setCurrentPage}
                editingRowId={null}
                currentEditData={{}}
                hideEditButton={true}
                className="full-width-table allow-horizontal-scroll"
              />
            </>
          )}

          {/* Aba de Avisos */}
          {activeTab === 'avisos' && (
            <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
              {tableData.avisos.length === 0 ? (
                <div className="empty-state"><p>Nenhum aviso disponível.</p></div>
              ) : (
                tableData.avisos.map(av => <AvisoBanner key={av.id} aviso={av} />)
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default PortariaPage;
