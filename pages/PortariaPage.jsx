import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import GenericTable from '../components/GenericTable';
import AddEncomendaDropdown from '../components/Encomendas/AddEncomendaDropdown';
import ExpandableUnitsTable from '../components/Unidades/ExpandableUnitsTable';

import { useAuth } from '../context/AuthContext';
import api, { espacoReservaAPI, listaConvidadosAPI, ocorrenciaAPI, eventoAPI } from '../services/api';
import ListaConvidadosModal from '../components/Eventos/ListaConvidadosModal';
import { formatPlaca } from '../utils/placaValidator';
import '../styles/PortariaPage.css';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import { avisoAPI } from '../services/api';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaUsers, FaEye, FaQrcode } from 'react-icons/fa';
import QrCodeScanner from '../components/Eventos/QrCodeScanner';
import AddOcorrenciaModal from '../components/Ocorrencias/AddOcorrenciaModal';
import OcorrenciaDetalheModal from '../components/Ocorrencias/OcorrenciaDetalheModal';
import OcorrenciaCard from '../components/Ocorrencias/OcorrenciaCard';

const tabs = [
  { id: 'unidades_moradores', label: 'Unidades e Moradores' },
  { id: 'encomendas', label: 'Gestão de Encomendas' },
  { id: 'visitantes', label: 'Gestão de Visitantes' },
  { id: 'veiculos', label: 'Veículos Cadastrados' },
  { id: 'reservas', label: 'Reservas do Dia' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'lista_convidados', label: 'Lista de Convidados' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'ocorrencias', label: 'Ocorrências' }
];

function PortariaPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'unidades_moradores');
  const [tableData, setTableData] = useState({
    unidades_moradores: [],
    encomendas: [],
    visitantes: [],
    veiculos: [],
    reservas: [],
    eventos: [],
    lista_convidados: [],
    avisos: [],
    ocorrencias: []
  });
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState({
    unidades_moradores: 1,
    encomendas: 1,
    visitantes: 1,
    veiculos: 1,
    reservas: 1,
    eventos: 1,
    lista_convidados: 1,
    avisos: 1,
    ocorrencias: 1
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddEncomenda, setShowAddEncomenda] = useState(false);
  const addEncomendaButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [incluirEntregues, setIncluirEntregues] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showAddOcorrencia, setShowAddOcorrencia] = useState(false);
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);

  // Verificar se o usuário tem acesso
  const isPortaria = user?.groups?.some(group => group.name === 'Portaria');
  const isSindicoPortaria = user?.groups?.some(group => group.name === 'Síndicos') || user?.is_staff;
  const hasAccess = isPortaria || isSindicoPortaria;

  // Checkbox: mostrar apenas listas do dia
  const [somenteHoje, setSomenteHoje] = useState(true);
  const [incluirReservasPassadas, setIncluirReservasPassadas] = useState(false);
  const [incluirFinalizadas, setIncluirFinalizadas] = useState(false);
  const [incluirAvisosExpirados, setIncluirAvisosExpirados] = useState(false);

  // Debug
  React.useEffect(() => {
    console.log('=== DEBUG PORTARIA PAGE ===');
    console.log('User:', user);
    console.log('Groups:', user?.groups);
    console.log('isPortaria:', isPortaria);
    console.log('isSindicoPortaria:', isSindicoPortaria);
    console.log('hasAccess:', hasAccess);
  }, [user, isPortaria, isSindicoPortaria, hasAccess]);

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const fetchData = async (type, page = 1, search = '') => {
    setLoading(true);
    try {
      if (type === 'unidades_moradores') {
        const response = await api.get(`/cadastros/unidades/?page=${page}&search=${search}`);
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, unidades_moradores: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            unidades_moradores: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, unidades_moradores: response.data }));
          setTotalPages(prev => ({ ...prev, unidades_moradores: 1 }));
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
      } else if (type === 'encomendas') {
        let url = `/cadastros/encomendas/?page=${page}&search=${search}`;
        if (incluirEntregues) url += '&incluir_entregues=true';
        const response = await api.get(url);
        if (response.data.results !== undefined) {
          const mappedData = response.data.results.map(item => ({ ...item, unidade_info: item.unidade_identificacao || '-' }));
          const filtered = incluirEntregues ? mappedData : mappedData.filter(item => !item.retirado_em);
          setTableData(prev => ({ ...prev, encomendas: filtered }));
          setTotalPages(prev => ({
            ...prev,
            encomendas: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          const mappedData = response.data.map(item => ({ ...item, unidade_info: item.unidade_identificacao || '-' }));
          const filtered = incluirEntregues ? mappedData : mappedData.filter(item => !item.retirado_em);
          setTableData(prev => ({ ...prev, encomendas: filtered }));
          setTotalPages(prev => ({ ...prev, encomendas: 1 }));
        }
      } else if (type === 'lista_convidados') {
        const d = new Date();
        const hojeLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const params = { search };
        if (somenteHoje) params.data_evento = hojeLocal;
        const res = await listaConvidadosAPI.getListas(params);
        setTableData(prev => ({ ...prev, lista_convidados: Array.isArray(res.data) ? res.data : (res.data.results || []) }));
        setTotalPages(prev => ({ ...prev, lista_convidados: 1 }));
      } else if (type === 'avisos') {
        const paramsAvisos = { page, search };
        if (!incluirAvisosExpirados) paramsAvisos.vigente = 1;
        const response = await avisoAPI.list(paramsAvisos);
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
      } else if (type === 'ocorrencias') {
        const paramsOcorrencias = { search };
        if (incluirFinalizadas) paramsOcorrencias.incluir_finalizadas = true;
        const response = await ocorrenciaAPI.list(paramsOcorrencias);
        const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
        setTableData(prev => ({ ...prev, ocorrencias: data }));
        setTotalPages(prev => ({ ...prev, ocorrencias: 1 }));
      } else if (type === 'reservas') {
        const paramsReservas = { page, search };
        if (incluirReservasPassadas) paramsReservas.incluir_passados = 1;
        const response = await espacoReservaAPI.list(paramsReservas);
        if (response.data.results !== undefined) {
          setTableData(prev => ({ ...prev, reservas: response.data.results }));
          setTotalPages(prev => ({
            ...prev,
            reservas: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          setTableData(prev => ({ ...prev, reservas: Array.isArray(response.data) ? response.data : [] }));
          setTotalPages(prev => ({ ...prev, reservas: 1 }));
        }
      } else if (type === 'eventos') {
        const response = await eventoAPI.list({ page, search });
        const eventosData = response.data.results !== undefined ? response.data.results : response.data;
        setTableData(prev => ({ ...prev, eventos: Array.isArray(eventosData) ? eventosData : [] }));
        setTotalPages(prev => ({
          ...prev,
          eventos: response.data.num_pages || Math.ceil((response.data.count || 1) / 10)
        }));
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
  }, [activeTab, currentPage, searchTerm, somenteHoje, incluirEntregues, incluirReservasPassadas, incluirFinalizadas, incluirAvisosExpirados]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Sincronizar tab da URL com estado
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['unidades_moradores', 'encomendas', 'visitantes', 'veiculos', 'reservas', 'eventos', 'lista_convidados', 'avisos', 'ocorrencias'].includes(tabFromUrl)) {
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
      key: 'created_on',
      header: 'Criado em',
      width: '15%',
      render: (value) => formatDateTime(value)
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
      width: '18%',
      render: (value) => value || '-'
    },
    {
      key: 'descricao',
      header: 'Descrição',
      width: '22%',
      render: (value) => value || '-'
    },
    {
      key: 'local_completo',
      header: 'Local',
      width: '18%',
      render: (value, row) => row.espaco_nome || row.local_texto || '-'
    },
    {
      key: 'data_evento',
      header: 'Data',
      width: '11%',
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'hora_inicio',
      header: 'Início',
      width: '9%',
      render: (value) => value || '-'
    },
    {
      key: 'hora_fim',
      header: 'Término',
      width: '9%',
      render: (value) => value || '-'
    },
  ];

  const ocorrenciasColumns = [
    {
      key: 'titulo',
      header: 'Título',
      width: '25%',
      render: (value) => value || '-'
    },
    {
      key: 'descricao',
      header: 'Descrição',
      width: '25%',
      editable: false,
      render: (value) => value || '-'
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: '10%',
      render: (value) => (
        <span style={{
          padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600,
          background: value === 'problema' ? '#fee2e2' : '#dbeafe',
          color: value === 'problema' ? '#dc2626' : '#1d4ed8',
        }}>
          {value === 'problema' ? 'Problema' : 'Sugestão'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      render: (value) => {
        const bg = { aberta: '#fee2e2', em_andamento: '#fef9c3', resolvida: '#dcfce7', fechada: '#f3f4f6' };
        const color = { aberta: '#dc2626', em_andamento: '#ca8a04', resolvida: '#15803d', fechada: '#6b7280' };
        const label = { aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida', fechada: 'Fechada' };
        return (
          <span style={{
            padding: '2px 8px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600,
            background: bg[value] || '#f3f4f6',
            color: color[value] || '#6b7280',
          }}>
            {label[value] || value}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      header: 'Data',
      width: '15%',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (value, row) => (
        <button
          className="edit-button"
          title="Ver detalhes / Responder"
          onClick={() => setOcorrenciaSelecionada(row)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FaEye /> <span>Ver Detalhes</span>
        </button>
      )
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
      <div className="portaria-page">
        <div className="portaria-content">
          {/* Aba de Unidades e Moradores */}
          {activeTab === 'unidades_moradores' && (
            <>
              <div className="page-header">
                <div className="search-container">
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar por número, bloco ou morador..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <ExpandableUnitsTable
                unidades={tableData.unidades_moradores}
                loading={loading}
                mode="portaria"
                currentPage={currentPage}
                totalPages={totalPages.unidades_moradores}
                onPageChange={setCurrentPage}
              />
            </>
          )}

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
                <div className="filters-container">
                  <div className="filter-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={incluirEntregues}
                        onChange={(e) => { setIncluirEntregues(e.target.checked); setCurrentPage(1); }}
                      />
                      Incluir encomendas entregues
                    </label>
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

          {/* Aba de Reservas */}
          {activeTab === 'reservas' && (
            <>
              <div className="page-header">
                <div className="search-container" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar reservas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <label style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={incluirReservasPassadas}
                      onChange={(e) => { setIncluirReservasPassadas(e.target.checked); setCurrentPage(1); }}
                      style={{ accentColor: '#2abb98', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    Incluir reservas passadas
                  </label>
                </div>
              </div>
              {tableData.reservas.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma reserva encontrada.</p>
                </div>
              ) : (
                <GenericTable
                  data={tableData.reservas}
                  columns={reservasColumns}
                  loading={loading}
                  currentPage={currentPage}
                  totalPages={totalPages.reservas}
                  onPageChange={setCurrentPage}
                  editingRowId={null}
                  currentEditData={{}}
                  className="full-width-table allow-horizontal-scroll"
                  hideEditButton={true}
                />
              )}
            </>
          )}

          {/* Aba de Lista de Convidados */}
          {activeTab === 'lista_convidados' && (
            <>
              <div className="page-header">
                <div className="search-container">
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar listas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', cursor: 'pointer', userSelect: 'none', marginLeft: 12, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={somenteHoje}
                    onChange={(e) => setSomenteHoje(e.target.checked)}
                    style={{ accentColor: '#2abb98', width: 15, height: 15, cursor: 'pointer' }}
                  />
                  Somente hoje
                </label>
                <button
                  onClick={() => setShowQrScanner(true)}
                  className="qr-btn-mobile-only"
                  style={{
                    background: '#2abb98', color: '#fff', border: 'none',
                    borderRadius: 7, padding: '7px 14px', cursor: 'pointer',
                    fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6,
                    marginLeft: 'auto', whiteSpace: 'nowrap',
                  }}
                  title="Confirmar entrada via QR Code"
                >
                  <FaQrcode size={14} /> Ler QR Code
                </button>
              </div>

              <GenericTable
                data={tableData.lista_convidados}
                columns={[
                  { key: 'morador_nome', header: 'Morador', width: '22%', render: (v) => v || '-' },
                  { key: 'titulo', header: 'Título', width: '25%', render: (v) => v || '-' },
                  {
                    key: 'data_evento', header: 'Data do Evento', width: '15%',
                    render: (v) => {
                      if (!v) return '-';
                      const [y, m, d] = v.split('-');
                      return `${d}/${m}/${y}`;
                    }
                  },
                  {
                    key: 'total_convidados', header: 'Convidados', width: '12%',
                    render: (v) => v ?? 0
                  },
                  {
                    key: 'ativa', header: 'Status', width: '10%',
                    render: (v) => (
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                        background: v ? '#dcfce7' : '#f3f4f6', color: v ? '#15803d' : '#6b7280', display: 'inline-block'
                      }}>{v ? 'Ativa' : 'Inativa'}</span>
                    )
                  },
                  {
                    key: 'actions', header: 'Convidados', width: '11%',
                    render: (_, row) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); setListaSelecionada(row); }}
                        style={{
                          background: '#2abb98', color: '#fff', border: 'none',
                          borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                          fontSize: '0.78rem', display: 'flex', alignItems: 'center',
                          gap: 4, whiteSpace: 'nowrap',
                        }}
                        title="Ver lista de convidados"
                      >
                        <FaUsers size={12} /> Ver Lista
                      </button>
                    )
                  },
                ]}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages.lista_convidados}
                onPageChange={setCurrentPage}
                editingRowId={null}
                currentEditData={{}}
                hideEditButton={true}
                className="full-width-table allow-horizontal-scroll"
              />
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
            <>
              <div className="page-header">
                <div className="filters-container">
                  <div className="filter-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={incluirAvisosExpirados}
                        onChange={(e) => { setIncluirAvisosExpirados(e.target.checked); setCurrentPage(1); }}
                      />
                      Incluir avisos expirados
                    </label>
                  </div>
                </div>
              </div>
              <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                {tableData.avisos.length === 0 ? (
                  <div className="empty-state"><p>Nenhum aviso disponível.</p></div>
                ) : (
                  tableData.avisos.map(av => <AvisoBanner key={av.id} aviso={av} />)
                )}
              </div>
            </>
          )}

          {/* Aba de Ocorrências */}
          {activeTab === 'ocorrencias' && (
            <>
              <div className="page-header">
                <div className="page-actions">
                  <button className="add-button" onClick={() => setShowAddOcorrencia(true)}>
                    <FaPlus /> Nova Ocorrência
                  </button>
                </div>
                <div className="search-container" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="search-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Buscar ocorrências..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <label style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={incluirFinalizadas}
                      onChange={(e) => { setIncluirFinalizadas(e.target.checked); setCurrentPage(1); }}
                      style={{ accentColor: '#2abb98', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    Incluir resolvidas
                  </label>
                </div>
              </div>
              <GenericTable
                data={tableData.ocorrencias}
                columns={ocorrenciasColumns}
                loading={loading}
                currentPage={currentPage}
                totalPages={totalPages.ocorrencias}
                onPageChange={setCurrentPage}
                editingRowId={null}
                currentEditData={{}}
                hideEditButton={true}
                className="full-width-table allow-horizontal-scroll"
              />
            </>
          )}
        </div>
      </div>

      {listaSelecionada && (
        <ListaConvidadosModal
          lista={listaSelecionada}
          readOnly={true}
          onClose={() => setListaSelecionada(null)}
        />
      )}

      {showQrScanner && (
        <QrCodeScanner
          onClose={() => setShowQrScanner(false)}
          onConfirmado={() => {
            if (listaSelecionada) fetchData('lista_convidados', currentPage, searchTerm);
          }}
        />
      )}

      {showAddOcorrencia && (
        <AddOcorrenciaModal
          onClose={() => setShowAddOcorrencia(false)}
          onSuccess={() => {
            setShowAddOcorrencia(false);
            fetchData('ocorrencias', 1, searchTerm);
          }}
        />
      )}

      {ocorrenciaSelecionada && (
        <OcorrenciaDetalheModal
          ocorrencia={ocorrenciaSelecionada}
          onClose={() => setOcorrenciaSelecionada(null)}
          onUpdate={() => fetchData('ocorrencias', currentPage, searchTerm)}
        />
      )}
    </>
  );
}

export default PortariaPage;
