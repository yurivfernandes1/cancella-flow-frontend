import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import EncomendaBadge from '../components/Encomendas/EncomendaBadge';
import GenericTable from '../components/GenericTable';
import AddVisitanteDropdown from '../components/Visitantes/AddVisitanteDropdown';
import AddVeiculoDropdown from '../components/Veiculos/AddVeiculoDropdown';

import { useAuth } from '../context/AuthContext';
import api, { avisoAPI, espacoReservaAPI, listaConvidadosAPI, ocorrenciaAPI, eventoAPI } from '../services/api';
import ListaConvidadosModal from '../components/Eventos/ListaConvidadosModal';
import AddListaConvidadosModal from '../components/Eventos/AddListaConvidadosModal';
import EventoModal from '../components/Eventos/EventoModal';
import { FaUsers } from 'react-icons/fa';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import ReservaModal from '../components/Reservas/ReservaModal';
import { validatePlaca, formatPlaca, normalizePlaca, maskPlaca } from '../utils/placaValidator';
import '../styles/MoradorPage.css';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaTrash, FaCar, FaEye } from 'react-icons/fa';
import AddOcorrenciaModal from '../components/Ocorrencias/AddOcorrenciaModal';
import OcorrenciaDetalheModal from '../components/Ocorrencias/OcorrenciaDetalheModal';
import OcorrenciaCard from '../components/Ocorrencias/OcorrenciaCard';
import ScrollableTabs from '../components/common/ScrollableTabs';

const tabs = [
  { id: 'encomendas', label: 'Minhas Encomendas' },
  { id: 'visitantes', label: 'Meus Visitantes' },
  { id: 'veiculos', label: 'Meus Veículos' },
  { id: 'reservas', label: 'Minhas Reservas' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'lista_convidados', label: 'Lista de Convidados' },
  { id: 'avisos', label: 'Avisos' },
  { id: 'ocorrencias', label: 'Minhas Ocorrências' }
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
    lista_convidados: [],
    avisos: [],
    ocorrencias: []
  });
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState({
    encomendas: 1,
    visitantes: 1,
    veiculos: 1,
    reservas: 1,
    eventos: 1,
    lista_convidados: 1,
    avisos: 1,
    ocorrencias: 1
  });
  const [showAddOcorrencia, setShowAddOcorrencia] = useState(false);
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddVisitante, setShowAddVisitante] = useState(false);
  const addVisitanteButtonRef = useRef(null);
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const addVeiculoButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [incluirEntregues, setIncluirEntregues] = useState(false);
  const [incluirReservasPassadas, setIncluirReservasPassadas] = useState(false);
  const [incluirFinalizadas, setIncluirFinalizadas] = useState(false);
  const [incluirAvisosExpirados, setIncluirAvisosExpirados] = useState(false);
  const [somenteHojeLista, setSomenteHojeLista] = useState(true);
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [showAddLista, setShowAddLista] = useState(false);
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);

  // Verificar se o usuário tem acesso
  const isMorador = user?.groups?.some(group => group.name === 'Moradores');
  const isSindico = user?.groups?.some(group => group.name === 'Síndicos');
  const hasAccess = user?.is_staff || isMorador || isSindico;

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const fetchData = async (type, page = 1, search = '') => {
    setLoading(true);
    try {
      if (type === 'encomendas') {
        let url = `/cadastros/encomendas/?page=${page}&search=${search}`;
        if (incluirEntregues) url += '&incluir_entregues=true';
        const response = await api.get(url);
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
      } else if (type === 'lista_convidados') {
        const d = new Date();
        const hojeLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const paramsLista = { search };
        if (somenteHojeLista) paramsLista.data_evento = hojeLocal;
        const response = await listaConvidadosAPI.getListas(paramsLista);
        setTableData(prev => ({ ...prev, lista_convidados: Array.isArray(response.data) ? response.data : (response.data.results || []) }));
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
  }, [activeTab, currentPage, searchTerm, incluirEntregues, incluirReservasPassadas, incluirFinalizadas, incluirAvisosExpirados, somenteHojeLista]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Sincronizar tab da URL com estado
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['encomendas', 'visitantes', 'veiculos', 'reservas', 'eventos', 'avisos', 'ocorrencias'].includes(tabFromUrl)) {
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

  const handleDeleteEvento = async (id) => {
    if (!window.confirm('Deseja excluir este evento?')) return;
    try {
      await eventoAPI.delete(id);
      fetchData('eventos', currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      alert(`Erro ao excluir: ${error.response?.data?.error || 'Ocorreu um erro'}`);
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
      key: 'created_on',
      header: 'Criado em',
      width: '15%',
      render: (value) => formatDateTime(value)
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
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
      width: '10%',
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

  // Colunas para Lista de Convidados
  const listaConvidadosColumns = [
    {
      key: 'titulo',
      header: 'Título',
      width: '30%',
      render: (value) => value || '-'
    },
    {
      key: 'data_evento',
      header: 'Data do Evento',
      width: '18%',
      render: (value) => {
        if (!value) return '-';
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
      }
    },
    {
      key: 'total_convidados',
      header: 'Convidados',
      width: '14%',
      render: (value) => value ?? 0
    },
    {
      key: 'ativa',
      header: 'Status',
      width: '12%',
      render: (value) => (
        <span style={{
          padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
          background: value ? '#dcfce7' : '#f3f4f6',
          color: value ? '#15803d' : '#6b7280',
          display: 'inline-block'
        }}>
          {value ? 'Ativa' : 'Inativa'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '13%',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setListaSelecionada(row); }}
          style={{
            background: '#2abb98',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 10px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
          }}
          title="Gerenciar lista de convidados"
        >
          <FaUsers size={12} /> Gerenciar
        </button>
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
      width: '28%',
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
      width: '13%',
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleDateString('pt-BR');
      }
    },
    {
      key: 'hora_inicio',
      header: 'Horário',
      width: '14%',
      render: (value, row) => {
        if (!value) return '-';
        const horaFim = row.hora_fim || '';
        return `${value.slice(0, 5)} - ${horaFim.slice(0, 5)}`;
      }
    },
    ...(isSindico || user?.is_staff ? [{
      key: 'actions',
      header: 'Ações',
      width: '10%',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button
            onClick={() => { setEditingEvento(row); setShowEventoModal(true); }}
            className="action-button edit-button"
            title="Editar evento"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDeleteEvento(row.id)}
            className="action-button delete-button"
            title="Excluir evento"
          >
            <FaTrash />
          </button>
        </div>
      )
    }] : []),
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
          title="Ver detalhes"
          onClick={() => setOcorrenciaSelecionada(row)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <FaEye /> <span>Ver Detalhes</span>
        </button>
      )
    }
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
        <ScrollableTabs>
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
        </ScrollableTabs>

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

            {activeTab === 'eventos' && (isSindico || user?.is_staff) && (
              <div className="dropdown-wrapper">
                <button className="add-button" onClick={() => { setEditingEvento(null); setShowEventoModal(true); }}>
                  <FaPlus /> Novo Evento
                </button>
              </div>
            )}

            {activeTab === 'lista_convidados' && (
              <div className="dropdown-wrapper">
                <button className="add-button" onClick={() => setShowAddLista(true)}>
                  <FaPlus /> Nova Lista
                </button>
              </div>
            )}

            {activeTab === 'ocorrencias' && (
              <div className="dropdown-wrapper">
                <button className="add-button" onClick={() => setShowAddOcorrencia(true)}>
                  <FaPlus /> Nova Ocorrência
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
          {activeTab === 'encomendas' && (
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
          )}
          {activeTab === 'reservas' && (
            <div className="filters-container">
              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={incluirReservasPassadas}
                    onChange={(e) => { setIncluirReservasPassadas(e.target.checked); setCurrentPage(1); }}
                  />
                  Incluir reservas passadas
                </label>
              </div>
            </div>
          )}
          {activeTab === 'ocorrencias' && (
            <div className="filters-container">
              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={incluirFinalizadas}
                    onChange={(e) => { setIncluirFinalizadas(e.target.checked); setCurrentPage(1); }}
                  />
                  Incluir resolvidas
                </label>
              </div>
            </div>
          )}
          {activeTab === 'lista_convidados' && (
            <div className="filters-container">
              <div className="filter-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={somenteHojeLista}
                    onChange={(e) => { setSomenteHojeLista(e.target.checked); setCurrentPage(1); }}
                  />
                  Somente hoje
                </label>
              </div>
            </div>
          )}
          {activeTab === 'avisos' && (
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
                      : activeTab === 'lista_convidados'
                        ? listaConvidadosColumns
                        : activeTab === 'ocorrencias'
                          ? ocorrenciasColumns
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
            hideEditButton={activeTab === 'encomendas' || activeTab === 'eventos' || activeTab === 'lista_convidados' || activeTab === 'ocorrencias'}
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

      {listaSelecionada && (
        <ListaConvidadosModal
          lista={listaSelecionada}
          readOnly={false}
          onClose={() => setListaSelecionada(null)}
          onUpdate={() => fetchData('lista_convidados', currentPage, searchTerm)}
        />
      )}

      {showAddLista && (
        <AddListaConvidadosModal
          onClose={() => setShowAddLista(false)}
          onSuccess={() => {
            setShowAddLista(false);
            fetchData('lista_convidados', 1, searchTerm);
          }}
          moradorUnidadeId={user?.unidade_id}
        />
      )}

      {showEventoModal && (
        <EventoModal
          isOpen={showEventoModal}
          onClose={() => { setShowEventoModal(false); setEditingEvento(null); }}
          onSuccess={() => {
            setShowEventoModal(false);
            setEditingEvento(null);
            fetchData('eventos', currentPage, searchTerm);
          }}
          evento={editingEvento}
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
    </div>
  );
}

export default MoradorPage;
