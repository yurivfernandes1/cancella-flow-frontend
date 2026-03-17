import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import EncomendaBadge from '../components/Encomendas/EncomendaBadge';
import GenericTable from '../components/GenericTable';
import AddVisitanteDropdown from '../components/Visitantes/AddVisitanteDropdown';
import AddVeiculoDropdown from '../components/Veiculos/AddVeiculoDropdown';

import { useAuth } from '../context/AuthContext';
import api, { avisoAPI, espacoReservaAPI, listaConvidadosAPI, ocorrenciaAPI, eventoAPI, visitanteAPI } from '../services/api';
import { useToast } from '../components/common/Toast';
import ListaConvidadosModal from '../components/Eventos/ListaConvidadosModal';
import AddListaConvidadosModal from '../components/Eventos/AddListaConvidadosModal';
import EventoModal from '../components/Eventos/EventoModal';
import { FaUsers } from 'react-icons/fa';
import AvisosKanbanBoard from '../components/Avisos/AvisosKanbanBoard';
import EncomendasKanbanBoard from '../components/Encomendas/EncomendasKanbanBoard';
import EncomendaDetalheModal from '../components/Encomendas/EncomendaDetalheModal';
import ReservaModal from '../components/Reservas/ReservaModal';
import { validatePlaca, formatPlaca, normalizePlaca, maskPlaca } from '../utils/placaValidator';
import '../styles/MoradorPage.css';
import '../styles/UnitsCards.css';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaTrash, FaCar, FaEye, FaCopy, FaEnvelope, FaDownload } from 'react-icons/fa';
import { downloadQrCode } from '../utils/qrUtils';
import AddOcorrenciaModal from '../components/Ocorrencias/AddOcorrenciaModal';
import OcorrenciaDetalheModal from '../components/Ocorrencias/OcorrenciaDetalheModal';
import OcorrenciasKanbanBoard from '../components/Ocorrencias/OcorrenciasKanbanBoard';

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

const LISTA_CONVIDADOS_CARDS_POR_PAGINA = 12;

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
  const [ocorrenciaStatusPending, setOcorrenciaStatusPending] = useState({});
  const [encomendaSelecionada, setEncomendaSelecionada] = useState(null);
  const [encomendaStatusPending, setEncomendaStatusPending] = useState({});
  const [avisoStatusPending, setAvisoStatusPending] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddVisitante, setShowAddVisitante] = useState(false);
  const addVisitanteButtonRef = useRef(null);
  const [showAddVeiculo, setShowAddVeiculo] = useState(false);
  const addVeiculoButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [incluirReservasPassadas, setIncluirReservasPassadas] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [showAddLista, setShowAddLista] = useState(false);
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [qrCopyStatus, setQrCopyStatus] = useState({});
  const [qrEmailStatus, setQrEmailStatus] = useState({});
  const [qrDownloadStatus, setQrDownloadStatus] = useState({});
  const [visitanteSelecionado, setVisitanteSelecionado] = useState(null);
  const [visitanteModalData, setVisitanteModalData] = useState(null);
  const [visitanteModalSaving, setVisitanteModalSaving] = useState(false);
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [veiculoModalData, setVeiculoModalData] = useState(null);
  const [veiculoModalSaving, setVeiculoModalSaving] = useState(false);
  const ocorrenciaStatusTimerRef = useRef({});
  const ocorrenciaStatusQueueRef = useRef({});
  const ocorrenciaStatusInFlightRef = useRef({});
  const ocorrenciaStatusStableRef = useRef({});

  // Verificar se o usuário tem acesso
  const isMorador = user?.groups?.some(group => group.name === 'Moradores');
  const isSindico = user?.groups?.some(group => group.name === 'Síndicos');
  const hasAccess = user?.is_staff || isMorador || isSindico;

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const toast = useToast();

  const fetchData = async (type, page = 1, search = '') => {
    setLoading(true);
    try {
      if (type === 'encomendas') {
        const url = `/cadastros/encomendas/?page=${page}&search=${search}`;
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
        const paramsLista = { search };
        const response = await listaConvidadosAPI.getListas(paramsLista);
        const listas = Array.isArray(response.data) ? response.data : (response.data.results || []);
        const paginas = Math.max(1, Math.ceil(listas.length / LISTA_CONVIDADOS_CARDS_POR_PAGINA));
        setTableData(prev => ({ ...prev, lista_convidados: listas }));
        setTotalPages(prev => ({ ...prev, lista_convidados: paginas }));
      } else if (type === 'avisos') {
        const paramsAvisos = { page, search };
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
        const paramsOcorrencias = { search, incluir_finalizadas: true };
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
  }, [activeTab, currentPage, searchTerm, incluirReservasPassadas]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Sincronizar tab da URL com estado
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['encomendas', 'visitantes', 'veiculos', 'reservas', 'eventos', 'lista_convidados', 'avisos', 'ocorrencias'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      Object.values(ocorrenciaStatusTimerRef.current).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  const handleSaveVisitante = async (id, data) => {
    try {
      const payload = {
        nome: data.nome,
        documento: data.documento,
        email: data.email || '',
        data_entrada: data.data_entrada ? new Date(data.data_entrada).toISOString() : null,
        data_saida: data.data_saida ? new Date(data.data_saida).toISOString() : null,
        is_permanente: Boolean(data.is_permanente),
        morador_id: data.morador
      };

      await api.patch(`/cadastros/visitantes/${id}/update/`, payload);
      fetchData('visitantes', currentPage, searchTerm);
      setEditingRowId(null);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar visitante:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
      return false;
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

  const applyOcorrenciaStatusLocal = (ocorrenciaId, status) => {
    setTableData(prev => ({
      ...prev,
      ocorrencias: prev.ocorrencias.map(item =>
        item.id === ocorrenciaId ? { ...item, status } : item
      ),
    }));
    setOcorrenciaSelecionada(prev => (prev?.id === ocorrenciaId ? { ...prev, status } : prev));
  };

  const setOcorrenciaPending = (ocorrenciaId, isPending) => {
    setOcorrenciaStatusPending(prev => {
      if (isPending) return { ...prev, [ocorrenciaId]: true };
      const next = { ...prev };
      delete next[ocorrenciaId];
      return next;
    });
  };

  const flushOcorrenciaStatusUpdate = async (ocorrenciaId) => {
    if (ocorrenciaStatusInFlightRef.current[ocorrenciaId]) return;

    const targetStatus = ocorrenciaStatusQueueRef.current[ocorrenciaId];
    if (!targetStatus) return;

    ocorrenciaStatusInFlightRef.current[ocorrenciaId] = true;
    setOcorrenciaPending(ocorrenciaId, true);

    try {
      await ocorrenciaAPI.update(ocorrenciaId, { status: targetStatus });
      ocorrenciaStatusStableRef.current[ocorrenciaId] = targetStatus;
    } catch (error) {
      const stableStatus = ocorrenciaStatusStableRef.current[ocorrenciaId];
      if (stableStatus) {
        ocorrenciaStatusQueueRef.current[ocorrenciaId] = stableStatus;
        applyOcorrenciaStatusLocal(ocorrenciaId, stableStatus);
      }
      console.error('Erro ao atualizar status da ocorrencia:', error);
      alert('Nao foi possivel atualizar o status da ocorrencia.');
    } finally {
      ocorrenciaStatusInFlightRef.current[ocorrenciaId] = false;

      const queuedStatus = ocorrenciaStatusQueueRef.current[ocorrenciaId];
      const stableStatus = ocorrenciaStatusStableRef.current[ocorrenciaId];
      if (queuedStatus && queuedStatus !== stableStatus) {
        flushOcorrenciaStatusUpdate(ocorrenciaId);
        return;
      }

      setOcorrenciaPending(ocorrenciaId, false);
    }
  };

  const handleOcorrenciaStatusChange = (ocorrencia, novoStatus) => {
    const ocorrenciaId = ocorrencia.id;
    if (!ocorrenciaStatusStableRef.current[ocorrenciaId]) {
      ocorrenciaStatusStableRef.current[ocorrenciaId] = ocorrencia.status;
    }

    ocorrenciaStatusQueueRef.current[ocorrenciaId] = novoStatus;
    applyOcorrenciaStatusLocal(ocorrenciaId, novoStatus);
    setOcorrenciaPending(ocorrenciaId, true);

    if (ocorrenciaStatusTimerRef.current[ocorrenciaId]) {
      clearTimeout(ocorrenciaStatusTimerRef.current[ocorrenciaId]);
    }

    ocorrenciaStatusTimerRef.current[ocorrenciaId] = setTimeout(() => {
      flushOcorrenciaStatusUpdate(ocorrenciaId);
    }, 180);
  };

  const getEncomendaStatus = (encomenda) => {
    if (encomenda.contestado_em && !encomenda.contestacao_resolvida) return 'contestada';
    if (encomenda.retirado_em) return 'retirada';
    return 'pendente';
  };

  const handleEncomendaStatusChange = async (_encomenda, _novoStatus) => {
    // Morador não altera status por drag; a contestação acontece no modal.
  };

  const handleAvisoStatusChange = async (_aviso, _novoStatus) => {
    // Morador não altera status de aviso.
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
        marca_modelo: data.marca_modelo,
        is_active: data.is_active !== false,
      };

      // Atualizar veículo existente
      await api.patch(`/cadastros/veiculos/${id}/update/`, payload);
      
      fetchData('veiculos', currentPage, searchTerm);
      setEditingRowId(null);
      return true;
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
      return false;
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

  const isDataEventoHoje = (dataEvento) => {
    if (!dataEvento) return false;
    const hoje = new Date();
    const hojeLocal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    return dataEvento === hojeLocal;
  };

  const toDateTimeLocalValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const openVisitanteModal = (visitante) => {
    setVisitanteSelecionado(visitante);
    setVisitanteModalData({
      nome: visitante.nome || '',
      documento: visitante.documento || '',
      email: visitante.email || '',
      data_entrada: toDateTimeLocalValue(visitante.data_entrada),
      data_saida: toDateTimeLocalValue(visitante.data_saida),
      is_permanente: Boolean(visitante.is_permanente),
    });
  };

  const closeVisitanteModal = () => {
    if (visitanteModalSaving) return;
    setVisitanteSelecionado(null);
    setVisitanteModalData(null);
  };

  const saveVisitanteModal = async () => {
    if (!visitanteSelecionado || !visitanteModalData) return;
    setVisitanteModalSaving(true);
    try {
      const ok = await handleSaveVisitante(visitanteSelecionado.id, {
        ...visitanteSelecionado,
        ...visitanteModalData,
        data_entrada: visitanteModalData.data_entrada ? new Date(visitanteModalData.data_entrada).toISOString() : null,
        data_saida: visitanteModalData.data_saida ? new Date(visitanteModalData.data_saida).toISOString() : null,
      });
      if (ok) {
        closeVisitanteModal();
      }
    } finally {
      setVisitanteModalSaving(false);
    }
  };

  const openVeiculoModal = (veiculo) => {
    setVeiculoSelecionado(veiculo);
    const rawPlaca = veiculo.placa || veiculo.placa_veiculo || veiculo.placa_normalizada || veiculo.placa_formatted || '';
    setVeiculoModalData({
      placa: rawPlaca ? formatPlaca(String(rawPlaca)) : '',
      marca_modelo: veiculo.marca_modelo || '',
      is_active: veiculo.is_active !== false,
    });
  };

  const closeVeiculoModal = () => {
    if (veiculoModalSaving) return;
    setVeiculoSelecionado(null);
    setVeiculoModalData(null);
  };

  const saveVeiculoModal = async () => {
    if (!veiculoSelecionado || !veiculoModalData) return;
    setVeiculoModalSaving(true);
    try {
      const ok = await handleSaveVeiculo(veiculoSelecionado.id, {
        ...veiculoSelecionado,
        ...veiculoModalData,
      });
      if (ok) {
        closeVeiculoModal();
      }
    } finally {
      setVeiculoModalSaving(false);
    }
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

  const handleCopyQrVisitante = async (id, token) => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(String(token));
      setQrCopyStatus(prev => ({ ...prev, [id]: 'copied' }));
      setTimeout(() => setQrCopyStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
    } catch {
      setQrCopyStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setQrCopyStatus(prev => ({ ...prev, [id]: 'idle' })), 2500);
    }
  };

  const handleSendEmailVisitante = async (id, email) => {
    if (!email) return;
    setQrEmailStatus(prev => ({ ...prev, [id]: 'sending' }));
    try {
      await visitanteAPI.enviarQrCode(id);
      setQrEmailStatus(prev => ({ ...prev, [id]: 'sent' }));
      toast.push('E-mail com o QR enviado.', { type: 'success' });
      setTimeout(() => setQrEmailStatus(prev => ({ ...prev, [id]: 'idle' })), 3000);
    } catch {
      setQrEmailStatus(prev => ({ ...prev, [id]: 'error' }));
      toast.push('Falha ao enviar o e-mail.', { type: 'error' });
      setTimeout(() => setQrEmailStatus(prev => ({ ...prev, [id]: 'idle' })), 3000);
    }
  };

  const handleDownloadQrVisitante = async (id, token, nome) => {
    if (!token) return;
    setQrDownloadStatus(prev => ({ ...prev, [id]: 'downloading' }));
    try {
      await downloadQrCode(token, nome);
      setQrDownloadStatus(prev => ({ ...prev, [id]: 'done' }));
      setTimeout(() => setQrDownloadStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
    } catch {
      setQrDownloadStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setQrDownloadStatus(prev => ({ ...prev, [id]: 'idle' })), 2500);
    }
  };

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
      width: '13%',
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
      key: 'email',
      header: 'E-mail',
      width: '15%',
      editable: true,
      render: (value) => value || '-',
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="email"
          value={editData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="email@exemplo.com"
        />
      )
    },
    {
      key: 'data_entrada',
      header: 'Data Entrada',
      width: '16%',
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
      width: '16%',
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
      width: '14%',
      render: (value, row) => {
        const isEditing = editingRowId === row.id;
        const copyStatus = qrCopyStatus[row.id] || 'idle';
        const emailStatus = qrEmailStatus[row.id] || 'idle';
        const downloadStatus = qrDownloadStatus[row.id] || 'idle';

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
                  className={`edit-button${copyStatus === 'copied' ? ' save-button' : copyStatus === 'error' ? ' cancel-button' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleCopyQrVisitante(row.id, row.qr_token); }}
                  title={row.qr_token ? 'Copiar QR Code' : 'QR indisponível'}
                  disabled={!row.qr_token}
                  style={{ color: copyStatus === 'copied' ? '#2abb98' : copyStatus === 'error' ? '#dc2626' : undefined }}
                >
                  {copyStatus === 'copied' ? <FaCheck /> : <FaCopy />}
                </button>
                <button
                  className={`edit-button${emailStatus === 'sent' ? ' save-button' : emailStatus === 'error' ? ' cancel-button' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleSendEmailVisitante(row.id, row.email); }}
                  title={row.email ? 'Reenviar QR por e-mail' : 'Cadastre um e-mail para enviar o QR'}
                  disabled={!row.email || emailStatus === 'sending'}
                  style={{ color: emailStatus === 'sent' ? '#2abb98' : emailStatus === 'error' ? '#dc2626' : undefined, opacity: !row.email ? 0.4 : 1 }}
                >
                  {emailStatus === 'sent' ? <FaCheck /> : <FaEnvelope />}
                </button>
                <button
                  className={`edit-button${downloadStatus === 'done' ? ' save-button' : downloadStatus === 'error' ? ' cancel-button' : ''}`}
                  onClick={(e) => { e.stopPropagation(); handleDownloadQrVisitante(row.id, row.qr_token, row.nome); }}
                  title={row.qr_token ? 'Baixar QR Code' : 'QR indisponível'}
                  disabled={!row.qr_token || downloadStatus === 'downloading'}
                  style={{ color: downloadStatus === 'done' ? '#2abb98' : downloadStatus === 'error' ? '#dc2626' : undefined }}
                >
                  {downloadStatus === 'done' ? <FaCheck /> : <FaDownload />}
                </button>
                <button
                  className="edit-button"
                  onClick={(e) => { e.stopPropagation(); handleEditRow(row.id); }}
                  title="Editar visitante"
                >
                  <FaEdit />
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteVisitante(row.id); }}
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
      render: (_, row) => (
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
        const bg = { aberta: '#fee2e2', em_andamento: '#fef9c3', resolvida: '#dcfce7' };
        const color = { aberta: '#dc2626', em_andamento: '#ca8a04', resolvida: '#15803d' };
        const label = { aberta: 'Aberta', em_andamento: 'Em Andamento', resolvida: 'Resolvida' };
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

  const visitantesPermanentes = (tableData.visitantes || []).filter((visitante) => Boolean(visitante.is_permanente));
  const visitantesNaoPermanentes = (tableData.visitantes || []).filter((visitante) => !Boolean(visitante.is_permanente));
  const listaConvidadosCards = tableData.lista_convidados || [];
  const listaConvidadosInicio = (currentPage - 1) * LISTA_CONVIDADOS_CARDS_POR_PAGINA;
  const listaConvidadosPaginados = listaConvidadosCards.slice(listaConvidadosInicio, listaConvidadosInicio + LISTA_CONVIDADOS_CARDS_POR_PAGINA);

  return (
    <div className="morador-page">

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
        </div>

        {activeTab === 'avisos' ? (
          <AvisosKanbanBoard
            avisos={tableData.avisos}
            loading={loading}
            onStatusChange={handleAvisoStatusChange}
            canDrag={false}
            pendingById={avisoStatusPending}
            visibleStatuses={['ativo']}
          />
        ) : activeTab === 'ocorrencias' ? (
          <OcorrenciasKanbanBoard
            ocorrencias={tableData.ocorrencias}
            loading={loading}
            onCardClick={setOcorrenciaSelecionada}
            onStatusChange={handleOcorrenciaStatusChange}
            canDrag={false}
            pendingById={ocorrenciaStatusPending}
          />
        ) : activeTab === 'encomendas' ? (
          <EncomendasKanbanBoard
            encomendas={tableData.encomendas}
            loading={loading}
            onCardClick={setEncomendaSelecionada}
            onStatusChange={handleEncomendaStatusChange}
            canDrag={false}
            pendingById={encomendaStatusPending}
            currentPage={currentPage}
            totalPages={totalPages.encomendas}
            onPageChange={setCurrentPage}
          />
        ) : activeTab === 'visitantes' ? (
          <>
            <div className="morador-cards-sections">
              <section className="morador-cards-section">
                <div className="morador-cards-section__header">
                  <h3>Permanentes</h3>
                  <span>{visitantesPermanentes.length}</span>
                </div>
                <div className="units-cards-grid">
                  {visitantesPermanentes.length === 0 ? (
                    <div className="empty-state compact">
                      <p>Nenhum visitante permanente encontrado.</p>
                    </div>
                  ) : (
                    visitantesPermanentes.map((visitante) => {
                      const copyStatus = qrCopyStatus[visitante.id] || 'idle';
                      const emailStatus = qrEmailStatus[visitante.id] || 'idle';
                      const downloadStatus = qrDownloadStatus[visitante.id] || 'idle';
                      return (
                        <article
                          key={visitante.id}
                          className="unit-card morador-record-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => openVisitanteModal(visitante)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openVisitanteModal(visitante);
                            }
                          }}
                        >
                          <div className="unit-card__header">
                            <div className="unit-card__header-left">
                              <span className="unit-card__title">{visitante.nome || '-'}</span>
                            </div>
                            <div className="unit-card__header-right">
                              <span className="unit-card__status-badge unit-card__status-badge--active">Permanente</span>
                            </div>
                          </div>
                          <div className="unit-card__summary">
                            <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Documento</span><span className="unit-card__info-value">{visitante.documento || '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">E-mail</span><span className="unit-card__info-value">{visitante.email || '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Entrada</span><span className="unit-card__info-value">{formatDateTime(visitante.data_entrada)}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Saída</span><span className="unit-card__info-value">{formatDateTime(visitante.data_saida)}</span></div>
                            </div>
                            <div className="morador-record-card__actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className={`edit-button${copyStatus === 'copied' ? ' save-button' : copyStatus === 'error' ? ' cancel-button' : ''}`}
                                onClick={() => handleCopyQrVisitante(visitante.id, visitante.qr_token)}
                                title={visitante.qr_token ? 'Copiar QR Code' : 'QR indisponível'}
                                disabled={!visitante.qr_token}
                              >
                                {copyStatus === 'copied' ? <FaCheck /> : <FaCopy />}
                              </button>
                              <button
                                className={`edit-button${emailStatus === 'sent' ? ' save-button' : emailStatus === 'error' ? ' cancel-button' : ''}`}
                                onClick={() => handleSendEmailVisitante(visitante.id, visitante.email)}
                                title={visitante.email ? 'Reenviar QR por e-mail' : 'Cadastre um e-mail para enviar o QR'}
                                disabled={!visitante.email || emailStatus === 'sending'}
                              >
                                {emailStatus === 'sent' ? <FaCheck /> : <FaEnvelope />}
                              </button>
                              <button
                                className={`edit-button${downloadStatus === 'done' ? ' save-button' : downloadStatus === 'error' ? ' cancel-button' : ''}`}
                                onClick={() => handleDownloadQrVisitante(visitante.id, visitante.qr_token, visitante.nome)}
                                title={visitante.qr_token ? 'Baixar QR Code' : 'QR indisponível'}
                                disabled={!visitante.qr_token || downloadStatus === 'downloading'}
                              >
                                {downloadStatus === 'done' ? <FaCheck /> : <FaDownload />}
                              </button>
                              <button
                                className="delete-button card-delete-button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteVisitante(visitante.id); }}
                                title="Excluir visitante"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="morador-cards-section">
                <div className="morador-cards-section__header">
                  <h3>Não permanentes</h3>
                  <span>{visitantesNaoPermanentes.length}</span>
                </div>
                <div className="units-cards-grid">
                  {visitantesNaoPermanentes.length === 0 ? (
                    <div className="empty-state compact">
                      <p>Nenhum visitante não permanente encontrado.</p>
                    </div>
                  ) : (
                    visitantesNaoPermanentes.map((visitante) => {
                      const copyStatus = qrCopyStatus[visitante.id] || 'idle';
                      const emailStatus = qrEmailStatus[visitante.id] || 'idle';
                      const downloadStatus = qrDownloadStatus[visitante.id] || 'idle';
                      return (
                        <article
                          key={visitante.id}
                          className="unit-card morador-record-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => openVisitanteModal(visitante)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openVisitanteModal(visitante);
                            }
                          }}
                        >
                          <div className="unit-card__header">
                            <div className="unit-card__header-left">
                              <span className="unit-card__title">{visitante.nome || '-'}</span>
                            </div>
                            <div className="unit-card__header-right">
                              <span className="unit-card__status-badge unit-card__status-badge--inactive">Não permanente</span>
                            </div>
                          </div>
                          <div className="unit-card__summary">
                            <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Documento</span><span className="unit-card__info-value">{visitante.documento || '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">E-mail</span><span className="unit-card__info-value">{visitante.email || '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Entrada</span><span className="unit-card__info-value">{formatDateTime(visitante.data_entrada)}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Saída</span><span className="unit-card__info-value">{formatDateTime(visitante.data_saida)}</span></div>
                            </div>
                            <div className="morador-record-card__actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className={`edit-button${copyStatus === 'copied' ? ' save-button' : copyStatus === 'error' ? ' cancel-button' : ''}`}
                                onClick={() => handleCopyQrVisitante(visitante.id, visitante.qr_token)}
                                title={visitante.qr_token ? 'Copiar QR Code' : 'QR indisponível'}
                                disabled={!visitante.qr_token}
                              >
                                {copyStatus === 'copied' ? <FaCheck /> : <FaCopy />}
                              </button>
                              <button
                                className={`edit-button${emailStatus === 'sent' ? ' save-button' : emailStatus === 'error' ? ' cancel-button' : ''}`}
                                onClick={() => handleSendEmailVisitante(visitante.id, visitante.email)}
                                title={visitante.email ? 'Reenviar QR por e-mail' : 'Cadastre um e-mail para enviar o QR'}
                                disabled={!visitante.email || emailStatus === 'sending'}
                              >
                                {emailStatus === 'sent' ? <FaCheck /> : <FaEnvelope />}
                              </button>
                              <button
                                className={`edit-button${downloadStatus === 'done' ? ' save-button' : downloadStatus === 'error' ? ' cancel-button' : ''}`}
                                onClick={() => handleDownloadQrVisitante(visitante.id, visitante.qr_token, visitante.nome)}
                                title={visitante.qr_token ? 'Baixar QR Code' : 'QR indisponível'}
                                disabled={!visitante.qr_token || downloadStatus === 'downloading'}
                              >
                                {downloadStatus === 'done' ? <FaCheck /> : <FaDownload />}
                              </button>
                              <button
                                className="delete-button card-delete-button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteVisitante(visitante.id); }}
                                title="Excluir visitante"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <div className="pagination">
              <div className="pagination-info">
                Página {currentPage} de {totalPages.visitantes || 1}
              </div>
              <div className="pagination-controls">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages.visitantes || 1))}
                  disabled={currentPage >= (totalPages.visitantes || 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'veiculos' ? (
          <>
            <div className="units-cards-grid">
              {(tableData.veiculos || []).length === 0 ? (
                <div className="empty-state compact">
                  <p>Nenhum veículo encontrado.</p>
                </div>
              ) : (
                (tableData.veiculos || []).map((veiculo) => {
                  const rawPlaca = veiculo.placa || veiculo.placa_veiculo || veiculo.placa_normalizada || veiculo.placa_formatted || '';
                  const isAtivo = veiculo.is_active !== false;
                  return (
                    <article
                      key={veiculo.id}
                      className={`unit-card morador-record-card ${!isAtivo ? 'unit-card--inactive' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openVeiculoModal(veiculo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openVeiculoModal(veiculo);
                        }
                      }}
                    >
                      <div className="unit-card__header">
                        <div className="unit-card__header-left">
                          <FaCar className="unit-card__icon" />
                          <span className="unit-card__title">{rawPlaca ? formatPlaca(String(rawPlaca)) : 'Sem placa'}</span>
                        </div>
                        <div className="unit-card__header-right">
                          <span className={`unit-card__status-badge ${isAtivo ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                            {isAtivo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="unit-card__summary">
                        <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                          <div className="unit-card__info-item"><span className="unit-card__info-label">Marca e modelo</span><span className="unit-card__info-value">{veiculo.marca_modelo || '-'}</span></div>
                          <div className="unit-card__info-item"><span className="unit-card__info-label">Cadastrado em</span><span className="unit-card__info-value">{formatDateTime(veiculo.created_on || veiculo.created_at || veiculo.data_cadastro || veiculo.created)}</span></div>
                        </div>
                        <div className="morador-record-card__actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="delete-button card-delete-button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteVeiculo(veiculo.id); }}
                            title="Excluir veículo"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="pagination">
              <div className="pagination-info">
                Página {currentPage} de {totalPages.veiculos || 1}
              </div>
              <div className="pagination-controls">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages.veiculos || 1))}
                  disabled={currentPage >= (totalPages.veiculos || 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : activeTab === 'lista_convidados' ? (
          <>
            <div className="units-cards-grid">
              {listaConvidadosPaginados.length === 0 ? (
                <div className="empty-state compact">
                  <p>Nenhuma lista encontrada.</p>
                </div>
              ) : (
                listaConvidadosPaginados.map((lista) => {
                  const isHoje = isDataEventoHoje(lista.data_evento);
                  return (
                    <article
                      key={lista.id}
                      className={`unit-card morador-record-card lista-convidados-card ${isHoje ? 'lista-convidados-card--hoje' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setListaSelecionada(lista)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setListaSelecionada(lista);
                        }
                      }}
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

            <div className="pagination">
              <div className="pagination-info">
                Página {currentPage} de {totalPages.lista_convidados || 1}
              </div>
              <div className="pagination-controls">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages.lista_convidados || 1))}
                  disabled={currentPage >= (totalPages.lista_convidados || 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : (
          <GenericTable
            columns={
              activeTab === 'reservas'
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
              undefined
            }
            className="full-width-table allow-horizontal-scroll"
            editingRowId={null}
            onEditRow={undefined}
            onEditDataChange={undefined}
            hideEditButton={activeTab === 'encomendas' || activeTab === 'eventos' || activeTab === 'lista_convidados' || activeTab === 'ocorrencias'}
            titleColumnKey={activeTab === 'encomendas' ? 'codigo_rastreio' : undefined}
          />
        )}
      </main>

      {visitanteSelecionado && visitanteModalData && (
        <div className="modal-overlay" onClick={closeVisitanteModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2>Editar Visitante</h2>
              <button className="modal-close" onClick={closeVisitanteModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Nome</label>
                <input
                  type="text"
                  value={visitanteModalData.nome}
                  onChange={(e) => setVisitanteModalData((prev) => ({ ...prev, nome: e.target.value }))}
                  disabled={visitanteModalSaving}
                />
              </div>
              <div className="form-group">
                <label>Documento</label>
                <input
                  type="text"
                  value={visitanteModalData.documento}
                  onChange={(e) => setVisitanteModalData((prev) => ({ ...prev, documento: e.target.value }))}
                  disabled={visitanteModalSaving}
                />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="text"
                  value={visitanteModalData.email}
                  onChange={(e) => setVisitanteModalData((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={visitanteModalSaving}
                />
              </div>
              <div className="form-group">
                <label>Data de entrada</label>
                <input
                  type="datetime-local"
                  value={visitanteModalData.data_entrada}
                  onChange={(e) => setVisitanteModalData((prev) => ({ ...prev, data_entrada: e.target.value }))}
                  disabled={visitanteModalSaving}
                />
              </div>
              <div className="form-group">
                <label>Data de saída</label>
                <input
                  type="datetime-local"
                  value={visitanteModalData.data_saida}
                  onChange={(e) => setVisitanteModalData((prev) => ({ ...prev, data_saida: e.target.value }))}
                  disabled={visitanteModalSaving}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(visitanteModalData.is_permanente)}
                    onChange={(e) => setVisitanteModalData((prev) => ({ ...prev, is_permanente: e.target.checked }))}
                    disabled={visitanteModalSaving}
                    style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                  />
                  Visitante permanente
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={closeVisitanteModal} disabled={visitanteModalSaving}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={saveVisitanteModal} disabled={visitanteModalSaving}>
                {visitanteModalSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {veiculoSelecionado && veiculoModalData && (
        <div className="modal-overlay" onClick={closeVeiculoModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h2>Editar Veículo</h2>
              <button className="modal-close" onClick={closeVeiculoModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Placa</label>
                <input
                  type="text"
                  value={veiculoModalData.placa}
                  onChange={(e) => setVeiculoModalData((prev) => ({ ...prev, placa: maskPlaca(e.target.value) }))}
                  placeholder="ABC-1234 ou ABC1D23"
                  disabled={veiculoModalSaving}
                />
              </div>
              <div className="form-group">
                <label>Marca e modelo</label>
                <input
                  type="text"
                  value={veiculoModalData.marca_modelo}
                  onChange={(e) => setVeiculoModalData((prev) => ({ ...prev, marca_modelo: e.target.value }))}
                  disabled={veiculoModalSaving}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(veiculoModalData.is_active)}
                    onChange={(e) => setVeiculoModalData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    disabled={veiculoModalSaving}
                    style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                  />
                  Veículo ativo
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={closeVeiculoModal} disabled={veiculoModalSaving}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={saveVeiculoModal} disabled={veiculoModalSaving}>
                {veiculoModalSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {encomendaSelecionada && (
        <EncomendaDetalheModal
          encomenda={encomendaSelecionada}
          onClose={() => setEncomendaSelecionada(null)}
          onUpdate={() => fetchData('encomendas', currentPage, searchTerm)}
        />
      )}
    </div>
  );
}

export default MoradorPage;
