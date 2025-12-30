import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import EncomendaBadge from '../components/Encomendas/EncomendaBadge';
import GenericTable from '../components/GenericTable';
import AddVisitanteDropdown from '../components/Visitantes/AddVisitanteDropdown';
import AddVeiculoDropdown from '../components/Veiculos/AddVeiculoDropdown';
import { useAuth } from '../context/AuthContext';
import api, { avisoAPI, espacoReservaAPI } from '../services/api';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import ReservaModal from '../components/Reservas/ReservaModal';
import { validatePlaca, formatPlaca, normalizePlaca, maskPlaca } from '../utils/placaValidator';
import '../styles/MoradorPage.css';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaTrash, FaCar } from 'react-icons/fa';

const tabs = [
  { id: 'encomendas', label: 'Minhas Encomendas' },
  { id: 'visitantes', label: 'Meus Visitantes' },
  { id: 'veiculos', label: 'Meus Veículos' },
  { id: 'reservas', label: 'Minhas Reservas' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'avisos', label: 'Avisos' }
];

function MoradorPage() {
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
  const [showAddVisitante, setShowAddVisitante] = useState(false);
  const addVisitanteButtonRef = useRef(null);
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const addVeiculoButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [showReservaModal, setShowReservaModal] = useState(false);

  // Verificar se o usuário tem acesso
  const isMorador = user?.groups?.some(group => group.name === 'Moradores');
  const hasAccess = user?.is_staff || isMorador;

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
          const mappedData = response.data.results.map(item => ({
            ...item,
            unidade_info: item.unidade_identificacao || '-'
          }));
          setTableData(prev => ({ ...prev, encomendas: mappedData }));
          setTotalPages(prev => ({
            ...prev,
            encomendas: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          // Mapear unidade_identificacao para unidade_info
          const mappedData = response.data.map(item => ({
            ...item,
            unidade_info: item.unidade_identificacao || '-'
          }));
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
        const response = await espacoReservaAPI.list({ page, search });
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, reservas: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            reservas: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, reservas: response.data }));
          setTotalPages(prev => ({ ...prev, reservas: 1 }));
        }
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

  const handleSaveVisitante = async (id, data) => {
    try {
      const payload = {
        nome: data.nome,
        documento: data.documento,
        data_entrada: data.data_entrada ? new Date(data.data_entrada).toISOString() : null,
        data_saida: data.data_saida ? new Date(data.data_saida).toISOString() : null,
        is_permanente: Boolean(data.is_permanente),
        morador_id: data.morador
      };

      await api.patch(`/cadastros/visitantes/${id}/update/`, payload);
      fetchData('visitantes', currentPage, searchTerm);
      setEditingRowId(null);
    } catch (error) {
      console.error('Erro ao atualizar visitante:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
    }
  };

  const handleDeleteVisitante = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este visitante?')) {
      return;
    }

    try {
      await api.delete(`/cadastros/visitantes/${id}/delete/`);
      fetchData('visitantes', currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao excluir visitante:', error);
      alert(`Erro ao excluir: ${error.response?.data?.error || 'Ocorreu um erro ao excluir'}`);
    }
  };

  const handleSaveVeiculo = async (id, data) => {
    // Validar placa
    if (!validatePlaca(data.placa)) {
      alert('Placa inválida. Use o formato ABC-1234 (antigo) ou ABC1D23 (Mercosul).');
      return;
    }

    try {
      const payload = {
        placa: normalizePlaca(data.placa),
        marca_modelo: data.marca_modelo
      };

      // Atualizar veículo existente
      await api.patch(`/cadastros/veiculos/${id}/update/`, payload);
      
      fetchData('veiculos', currentPage, searchTerm);
      setEditingRowId(null);
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
    }
  };

  const handleDeleteVeiculo = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este veículo?')) {
      return;
    }

    try {
      await api.delete(`/cadastros/veiculos/${id}/delete/`);
      fetchData('veiculos', currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
      alert(`Erro ao excluir: ${error.response?.data?.error || 'Ocorreu um erro ao excluir'}`);
    }
  };

  const handleDeleteReserva = async (id) => {
    if (!window.confirm('Deseja cancelar esta reserva?')) {
      return;
    }

    try {
      await espacoReservaAPI.delete(id);
      alert('Reserva cancelada com sucesso!');
      fetchData('reservas', currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao cancelar reserva:', error);
      alert(`Erro ao cancelar: ${error.response?.data?.error || 'Ocorreu um erro ao cancelar'}`);
    }
  };

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

  const encomendasColumns = [
    {
      key: 'descricao',
      header: 'Descrição',
      width: '25%',
      render: (value) => value || '-'
    },
    {
      key: 'codigo_rastreio',
      header: 'Código Rastreio',
      width: '20%',
      render: (value) => value || '-'
    },
    {
      key: 'retirado_por',
      header: 'Retirado Por',
      width: '18%',
      render: (value) => value || '-'
    },
    {
      key: 'retirado_em',
      header: 'Data Retirada',
      width: '18%',
      render: (value) => formatDateTime(value)
    },
    {
      key: 'created_on',
      header: 'Cadastrada em',
      width: '18%',
      render: (value) => formatDateTime(value)
    }
    // Nenhuma coluna editável
  ];

  const visitantesColumns = [
    {
      key: 'nome',
      header: 'Nome',
      width: '20%',
      editable: true,
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      )
    },
    {
      key: 'documento',
      header: 'Documento',
      width: '15%',
      editable: true,
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.documento || ''}
          onChange={(e) => handleInputChange('documento', e.target.value)}
        />
      )
    },
    {
      key: 'data_entrada',
      header: 'Data Entrada',
      width: '18%',
      editable: true,
      render: (value) => formatDateTime(value),
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="datetime-local"
          value={editData.data_entrada ? new Date(editData.data_entrada).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleInputChange('data_entrada', e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      )
    },
    {
      key: 'data_saida',
      header: 'Data Saída',
      width: '18%',
      editable: true,
      render: (value) => formatDateTime(value),
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="datetime-local"
          value={editData.data_saida ? new Date(editData.data_saida).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleInputChange('data_saida', e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      )
    },
    {
      key: 'is_permanente',
      header: 'Permanente',
      width: '10%',
      editable: true,
      render: (value) => (
        <span className={value ? 'status-active' : 'status-inactive'}>
          {value ? 'Sim' : 'Não'}
        </span>
      ),
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_permanente)}
          onChange={(e) => handleInputChange('is_permanente', e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'esta_no_condominio',
      header: 'Status',
      width: '10%',
      editable: true,
      render: (value) => (
        <span className={value ? 'status-active' : 'status-inactive'}>
          {value ? 'Presente' : 'Saiu'}
        </span>
      ),
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.esta_no_condominio)}
          onChange={(e) => handleInputChange('esta_no_condominio', e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '9%',
      render: (row) => {
        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveVisitante(row.id, currentEditData && currentEditData.id === row.id ? currentEditData : row);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRow(row.id);
                  }}
                  title="Editar visitante"
                >
                  <FaEdit />
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVisitante(row.id);
                  }}
                  title="Excluir visitante"
                >
                  <FaTrash />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  // Colunas para Reservas
  const reservasColumns = [
    {
      key: 'espaco_nome',
      header: 'Espaço',
      width: '30%',
      render: (value) => value || '-'
    },
    {
      key: 'data_reserva',
      header: 'Data',
      width: '25%',
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
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
      width: '15%',
      editable: false,
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
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '15%',
      render: (row) => (
        <div className="actions-column">
          <button
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteReserva(row.id);
            }}
            title="Cancelar reserva"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  // Colunas para Eventos (somente visualização)
  const eventosColumns = [
    {
      key: 'titulo',
      header: 'Título',
      width: '25%',
      render: (value) => value || '-'
    },
    {
      key: 'descricao',
      header: 'Descrição',
      width: '30%',
      render: (value) => value || '-'
    },
    {
      key: 'local_completo',
      header: 'Local',
      width: '20%',
      render: (value) => value || '-'
    },
    {
      key: 'data_evento',
      header: 'Data',
      width: '12%',
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleDateString('pt-BR');
      }
    },
    {
      key: 'hora_inicio',
      header: 'Horário',
      width: '13%',
      render: (value, row) => {
        if (!value) return '-';
        const horaFim = row.hora_fim || '';
        return `${value.slice(0, 5)} - ${horaFim.slice(0, 5)}`;
      }
    }
    // Nenhuma coluna editável
  ];

  // Colunas para Veículos
  const veiculosColumns = [
    {
      key: 'placa',
      header: 'Placa',
      width: '25%',
      editable: true,
      render: (value, row) => {
        // aceitar múltiplas chaves que a API pode retornar
        const rawPlaca = value || row.placa_veiculo || row.placa_normalizada || row.placa_formatted || '';
        const isValid = validatePlaca(rawPlaca);
        return (
          <span style={{ color: isValid ? '#2abb98' : '#dc2626', fontWeight: 'bold' }}>
            {rawPlaca ? formatPlaca(String(rawPlaca)) : '-'}
          </span>
        );
      },
      editComponent: (editData, handleInputChange) => {
        const isValid = validatePlaca(editData.placa || '');
        return (
          <input
            className="edit-input"
            type="text"
            value={editData.placa || ''}
            onChange={(e) => {
              const masked = maskPlaca(e.target.value);
              handleInputChange('placa', masked);
            }}
            placeholder="ABC-1234 ou ABC1D23"
            style={{ 
              borderColor: editData.placa ? (isValid ? '#2abb98' : '#dc2626') : '#ccc',
              borderWidth: '2px'
            }}
            maxLength={8}
          />
        );
      }
    },
    {
      key: 'marca_modelo',
      header: 'Marca e Modelo',
      width: '35%',
      editable: true,
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.marca_modelo || ''}
          onChange={(e) => handleInputChange('marca_modelo', e.target.value)}
          placeholder="Ex: Fiat Uno"
        />
      )
    },
    {
      key: 'created_on',
      header: 'Data de Cadastro',
      width: '25%',
      render: (value, row) => {
        // aceitar diferentes campos de data que o backend pode retornar
        const rawDate = value || row.created_at || row.data_cadastro || row.created || null;
        return formatDateTime(rawDate);
      }
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '15%',
      render: (row) => {
        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const dataToSave = currentEditData && currentEditData.id === row.id ? currentEditData : row;
                    handleSaveVeiculo(row.id, dataToSave);
                  }}
                  title="Salvar veículo"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRow(row.id);
                  }}
                  title="Editar veículo"
                >
                  <FaEdit />
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVeiculo(row.id);
                  }}
                  title="Excluir veículo"
                >
                  <FaTrash />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="morador-page">
      <Header />

      <main className="morador-content">
        {isMorador && user?.unidade_id && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '0.75rem'
          }}>
            <EncomendaBadge unidadeId={user.unidade_id} />
          </div>
        )}
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

        <div className="page-header">
          <div className="page-actions">
            {activeTab === 'visitantes' && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-button"
                  onClick={() => setShowAddVisitante(!showAddVisitante)}
                  ref={addVisitanteButtonRef}
                >
                  <FaPlus /> Adicionar Visitante
                </button>
                {showAddVisitante && (
                  <AddVisitanteDropdown
                    onClose={() => setShowAddVisitante(false)}
                    onSuccess={() => {
                      fetchData('visitantes', currentPage, searchTerm);
                      setShowAddVisitante(false);
                    }}
                    triggerRef={addVisitanteButtonRef}
                  />
                )}
              </div>
            )}

            {activeTab === 'veiculos' && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-button"
                  onClick={() => setShowAddVeiculo(!showAddVeiculo)}
                  ref={addVeiculoButtonRef}
                >
                  <FaCar /> Adicionar Veículo
                </button>
                {showAddVeiculo && (
                  <AddVeiculoDropdown
                    onClose={() => setShowAddVeiculo(false)}
                    onSuccess={() => {
                      fetchData('veiculos', currentPage, searchTerm);
                      setShowAddVeiculo(false);
                    }}
                    triggerRef={addVeiculoButtonRef}
                  />
                )}
              </div>
            )}

            {activeTab === 'reservas' && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-button"
                  onClick={() => setShowReservaModal(true)}
                >
                  <FaPlus /> Nova Reserva
                </button>
              </div>
            )}
          </div>

          {activeTab !== 'avisos' && (
            <div className="search-container">
              <div className="search-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          )}
        </div>

        {activeTab === 'avisos' ? (
          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            {tableData.avisos.length === 0 ? (
              <div className="empty-state">
                <p>Nenhum aviso no momento.</p>
              </div>
            ) : (
              tableData.avisos.map(av => (
                <AvisoBanner key={av.id} aviso={av} />
              ))
            )}
          </div>
        ) : (
          <GenericTable
            columns={
              activeTab === 'encomendas' 
                ? encomendasColumns 
                : activeTab === 'visitantes'
                  ? visitantesColumns
                  : activeTab === 'reservas'
                    ? reservasColumns
                    : activeTab === 'eventos'
                      ? eventosColumns
                      : veiculosColumns
            }
            data={tableData[activeTab]}
            loading={loading}
            onPageChange={(page) => setCurrentPage(page)}
            totalPages={totalPages[activeTab]}
            currentPage={currentPage}
            onSave={
              activeTab === 'visitantes' 
                ? handleSaveVisitante 
                : activeTab === 'veiculos'
                  ? handleSaveVeiculo
                  : undefined
            }
            className="full-width-table allow-horizontal-scroll"
            editingRowId={activeTab === 'visitantes' || activeTab === 'veiculos' ? editingRowId : null}
            onEditRow={activeTab === 'visitantes' || activeTab === 'veiculos' ? handleEditRow : undefined}
            onEditDataChange={activeTab === 'visitantes' || activeTab === 'veiculos' ? setCurrentEditData : undefined}
            hideEditButton={activeTab === 'encomendas' || activeTab === 'eventos' || activeTab === 'avisos'}
            titleColumnKey={activeTab === 'encomendas' ? 'codigo_rastreio' : undefined}
          />
        )}
      </main>

      {showReservaModal && (
        <ReservaModal
          onClose={() => setShowReservaModal(false)}
          onSuccess={() => {
            setShowReservaModal(false);
            fetchData('reservas', currentPage, searchTerm);
          }}
        />
      )}
    </div>
  );
}

export default MoradorPage;
