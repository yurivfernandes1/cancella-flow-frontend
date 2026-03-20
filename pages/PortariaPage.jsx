import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import GenericTable from '../components/GenericTable';
import AddEncomendaDropdown from '../components/Encomendas/AddEncomendaDropdown';
import ExpandableUnitsTable from '../components/Unidades/ExpandableUnitsTable';

import { useAuth } from '../context/AuthContext';
import api, { espacoReservaAPI, listaConvidadosAPI, ocorrenciaAPI, eventoAPI } from '../services/api';
import ListaConvidadosModal from '../components/Eventos/ListaConvidadosModal';
import EventoCard from '../components/Eventos/EventoCard';
import EventoDetalheModal from '../components/Eventos/EventoDetalheModal';
import EventoModal from '../components/Eventos/EventoModal';
import AddVisitanteDropdown from '../components/Visitantes/AddVisitanteDropdown';
import { formatPlaca } from '../utils/placaValidator';
import '../styles/PortariaPage.css';
import '../styles/UnitsCards.css';
import AvisosKanbanBoard from '../components/Avisos/AvisosKanbanBoard';
import { avisoAPI } from '../services/api';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaUsers, FaEye, FaQrcode, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import QrCodeScanner from '../components/Eventos/QrCodeScanner';
import EncomendasKanbanBoard from '../components/Encomendas/EncomendasKanbanBoard';
import EncomendaDetalheModal from '../components/Encomendas/EncomendaDetalheModal';
import AddOcorrenciaModal from '../components/Ocorrencias/AddOcorrenciaModal';
import OcorrenciaDetalheModal from '../components/Ocorrencias/OcorrenciaDetalheModal';
import OcorrenciasKanbanBoard from '../components/Ocorrencias/OcorrenciasKanbanBoard';

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

const LISTA_CONVIDADOS_CARDS_POR_PAGINA = 12;

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
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const [listaSelecionada, setListaSelecionada] = useState(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [showAddOcorrencia, setShowAddOcorrencia] = useState(false);
  const [showAddVisitante, setShowAddVisitante] = useState(false);
  const addVisitanteButtonRef = useRef(null);
  const [visitanteScope, setVisitanteScope] = useState('mine');
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);
  const [ocorrenciaStatusPending, setOcorrenciaStatusPending] = useState({});
  const [encomendaSelecionada, setEncomendaSelecionada] = useState(null);
  const [encomendaStatusPending, setEncomendaStatusPending] = useState({});
  const [avisoStatusPending, setAvisoStatusPending] = useState({});
  const [showRetiradaModal, setShowRetiradaModal] = useState(false);
  const [retiradaNome, setRetiradaNome] = useState('');
  const [retiradaTarget, setRetiradaTarget] = useState(null);
  const [incluirVisitantesPassados, setIncluirVisitantesPassados] = useState(false);
  const [expandedVisitanteCards, setExpandedVisitanteCards] = useState({});

  // Verificar se o usuário tem acesso
  const isPortaria = user?.groups?.some(group => group.name === 'Portaria');
  const isSindicoPortaria = user?.groups?.some(group => group.name === 'Síndicos') || user?.is_staff;
  const hasAccess = isPortaria || isSindicoPortaria;

  const [incluirReservasPassadas, setIncluirReservasPassadas] = useState(false);
  const [incluirEventosConcluidos, setIncluirEventosConcluidos] = useState(false);
  const encomendaStatusTimerRef = useRef({});
  const encomendaStatusQueueRef = useRef({});
  const encomendaStatusInFlightRef = useRef({});
  const encomendaStatusStableRef = useRef({});
  const ocorrenciaStatusTimerRef = useRef({});
  const ocorrenciaStatusQueueRef = useRef({});
  const ocorrenciaStatusInFlightRef = useRef({});
  const ocorrenciaStatusStableRef = useRef({});

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
        const params = new URLSearchParams({ page, search, incluir_passados: incluirVisitantesPassados ? '1' : '0' });
        // Para síndicos, permitir escopo (mine|all)
        if (isSindicoPortaria) params.set('scope', visitanteScope === 'all' ? 'all' : 'mine');
        const query = `/cadastros/visitantes/?${params.toString()}`;
        const response = await api.get(query);
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
        const url = `/cadastros/encomendas/?page=${page}&search=${search}`;
        const response = await api.get(url);
        if (response.data.results !== undefined) {
          const mappedData = response.data.results.map(item => ({ ...item, unidade_info: item.unidade_identificacao || '-' }));
          setTableData(prev => ({ ...prev, encomendas: mappedData }));
          setTotalPages(prev => ({
            ...prev,
            encomendas: response.data.num_pages || Math.ceil(response.data.count / 10)
          }));
        } else {
          const mappedData = response.data.map(item => ({ ...item, unidade_info: item.unidade_identificacao || '-' }));
          setTableData(prev => ({ ...prev, encomendas: mappedData }));
          setTotalPages(prev => ({ ...prev, encomendas: 1 }));
        }
      } else if (type === 'lista_convidados') {
        const params = { search };
        const res = await listaConvidadosAPI.getListas(params);
        const listas = Array.isArray(res.data) ? res.data : (res.data.results || []);
        const hoje = new Date();
        const hojeLocal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const listasVisiveis = listas.filter((lista) => lista?.data_evento && lista.data_evento >= hojeLocal);
        const paginas = Math.max(1, Math.ceil(listasVisiveis.length / LISTA_CONVIDADOS_CARDS_POR_PAGINA));
        setTableData(prev => ({ ...prev, lista_convidados: listasVisiveis }));
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
        const params = { page, search };
        // só incluir eventos concluídos quando o usuário for síndico/portaia com permissão e flag marcada
        if (isSindicoPortaria && incluirEventosConcluidos) params.incluir_finalizados = 1;
        const response = await eventoAPI.list(params);
        const eventosData = response.data.results !== undefined ? response.data.results : response.data;
        let eventosArray = Array.isArray(eventosData) ? eventosData : [];
        // Para usuários não síndicos, filtrar eventos já finalizados localmente como segurança
        if (!isSindicoPortaria) {
          const now = new Date();
          eventosArray = eventosArray.filter(ev => {
            // usar datetime_fim se disponível, senão comparar data_evento+hora_fim
            const fim = ev.datetime_fim || (ev.data_evento && ev.hora_fim ? `${ev.data_evento}T${ev.hora_fim}` : null);
            if (!fim) return true;
            const dt = new Date(fim);
            return isNaN(dt.getTime()) ? true : dt >= now;
          });
        }
        setTableData(prev => ({ ...prev, eventos: eventosArray }));
        setTotalPages(prev => ({
          ...prev,
          eventos: response.data.num_pages || Math.ceil((response.data.count || eventosArray.length || 1) / 10)
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
  }, [activeTab, currentPage, searchTerm, incluirReservasPassadas, incluirVisitantesPassados, incluirEventosConcluidos]);

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

  useEffect(() => {
    return () => {
      Object.values(ocorrenciaStatusTimerRef.current).forEach((timerId) => clearTimeout(timerId));
      Object.values(encomendaStatusTimerRef.current).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

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

  const applyEncomendaStatusLocal = (encomendaId, status, retiradoPor = null) => {
    setTableData((prev) => ({
      ...prev,
      encomendas: prev.encomendas.map((item) => {
        if (item.id !== encomendaId) return item;
        if (status === 'pendente') {
          return {
            ...item,
            retirado_em: null,
            retirado_por: '',
            contestacao_resolvida: true,
          };
        }
        if (status === 'retirada') {
          return {
            ...item,
            retirado_em: item.retirado_em || new Date().toISOString(),
            retirado_por: retiradoPor || item.retirado_por || user?.full_name || user?.username || 'Portaria',
            contestacao_resolvida: true,
          };
        }
        return item;
      }),
    }));
    setEncomendaSelecionada((prev) => {
      if (!prev || prev.id !== encomendaId) return prev;
      if (status === 'pendente') {
        return { ...prev, retirado_em: null, retirado_por: '', contestacao_resolvida: true };
      }
      if (status === 'retirada') {
        return {
          ...prev,
          retirado_em: prev.retirado_em || new Date().toISOString(),
          retirado_por: retiradoPor || prev.retirado_por || user?.full_name || user?.username || 'Portaria',
          contestacao_resolvida: true,
        };
      }
      return prev;
    });
  };

  const setEncomendaPending = (encomendaId, isPending) => {
    setEncomendaStatusPending((prev) => {
      if (isPending) return { ...prev, [encomendaId]: true };
      const next = { ...prev };
      delete next[encomendaId];
      return next;
    });
  };

  const flushEncomendaStatusUpdate = async (encomendaId) => {
    if (encomendaStatusInFlightRef.current[encomendaId]) return;

    const queued = encomendaStatusQueueRef.current[encomendaId];
    const targetStatus = queued?.status;
    if (!targetStatus || targetStatus === 'contestada') return;

    encomendaStatusInFlightRef.current[encomendaId] = true;
    setEncomendaPending(encomendaId, true);

    const patch = { status_encomenda: targetStatus };
    const atual = tableData.encomendas.find((item) => item.id === encomendaId);
    if (atual?.contestado_em && !atual?.contestacao_resolvida) {
      patch.resolver_contestacao = true;
    }
    if (targetStatus === 'retirada') {
      patch.retirado_por = queued?.retiradoPor || '';
    }

    try {
      await api.patch(`/cadastros/encomendas/${encomendaId}/update/`, patch);
      encomendaStatusStableRef.current[encomendaId] = targetStatus;
    } catch (error) {
      const stableStatus = encomendaStatusStableRef.current[encomendaId];
      if (stableStatus) {
        encomendaStatusQueueRef.current[encomendaId] = { status: stableStatus };
        applyEncomendaStatusLocal(encomendaId, stableStatus);
      }
      console.error('Erro ao alterar status da encomenda:', error);
      alert('Não foi possível atualizar o status da encomenda.');
    } finally {
      encomendaStatusInFlightRef.current[encomendaId] = false;

      const queuedStatus = encomendaStatusQueueRef.current[encomendaId]?.status;
      const stableStatus = encomendaStatusStableRef.current[encomendaId];
      if (queuedStatus && queuedStatus !== stableStatus) {
        flushEncomendaStatusUpdate(encomendaId);
        return;
      }

      setEncomendaPending(encomendaId, false);
    }
  };

  const handleEncomendaStatusChange = (encomenda, novoStatus) => {
    if (novoStatus === 'contestada') return;

    const currentStatus = getEncomendaStatus(encomenda);
    if (currentStatus === 'contestada') {
      alert('Encomendas contestadas só podem ser alteradas pelo síndico.');
      return;
    }

    if (novoStatus === 'retirada') {
      setRetiradaTarget(encomenda);
      setRetiradaNome('');
      setShowRetiradaModal(true);
      return;
    }

    const encomendaId = encomenda.id;
    if (!encomendaStatusStableRef.current[encomendaId]) {
      encomendaStatusStableRef.current[encomendaId] = currentStatus;
    }

    encomendaStatusQueueRef.current[encomendaId] = { status: novoStatus };
    applyEncomendaStatusLocal(encomendaId, novoStatus);
    setEncomendaPending(encomendaId, true);

    if (encomendaStatusTimerRef.current[encomendaId]) {
      clearTimeout(encomendaStatusTimerRef.current[encomendaId]);
    }

    encomendaStatusTimerRef.current[encomendaId] = setTimeout(() => {
      flushEncomendaStatusUpdate(encomendaId);
    }, 180);
  };

  const confirmRetiradaEncomenda = () => {
    if (!retiradaTarget) return;
    const nome = (retiradaNome || '').trim();
    if (!nome) {
      alert('Informe quem retirou a encomenda.');
      return;
    }

    const encomenda = retiradaTarget;
    const encomendaId = encomenda.id;
    const currentStatus = getEncomendaStatus(encomenda);
    if (!encomendaStatusStableRef.current[encomendaId]) {
      encomendaStatusStableRef.current[encomendaId] = currentStatus;
    }

    encomendaStatusQueueRef.current[encomendaId] = { status: 'retirada', retiradoPor: nome };
    applyEncomendaStatusLocal(encomendaId, 'retirada', nome);
    setEncomendaPending(encomendaId, true);

    if (encomendaStatusTimerRef.current[encomendaId]) {
      clearTimeout(encomendaStatusTimerRef.current[encomendaId]);
    }

    encomendaStatusTimerRef.current[encomendaId] = setTimeout(() => {
      flushEncomendaStatusUpdate(encomendaId);
    }, 180);

    setShowRetiradaModal(false);
    setRetiradaTarget(null);
    setRetiradaNome('');
  };

  const handleAvisoStatusChange = async (_aviso, _novoStatus) => {
    // Portaria apenas visualiza avisos.
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

  const getHojeDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const isVisitanteEntradaHoje = (visitante) => {
    if (!visitante?.data_entrada) return false;
    const entrada = new Date(visitante.data_entrada);
    const hoje = getHojeDate();
    return (
      entrada.getFullYear() === hoje.getFullYear() &&
      entrada.getMonth() === hoje.getMonth() &&
      entrada.getDate() === hoje.getDate()
    );
  };

  const isVisitanteEntrou = (visitante) => {
    if (!visitante?.data_entrada) return false;
    return new Date(visitante.data_entrada) <= new Date();
  };

  const isVisitanteSaiu = (visitante) => Boolean(visitante?.data_saida);

  const sortVisitantesByPrioridade = (a, b) => {
    const aHoje = isVisitanteEntradaHoje(a);
    const bHoje = isVisitanteEntradaHoje(b);
    if (aHoje !== bHoje) return aHoje ? -1 : 1;

    const agora = new Date();
    const aEntrada = a?.data_entrada ? new Date(a.data_entrada) : null;
    const bEntrada = b?.data_entrada ? new Date(b.data_entrada) : null;
    const aFutura = aEntrada && aEntrada > agora;
    const bFutura = bEntrada && bEntrada > agora;

    if (aFutura !== bFutura) return aFutura ? -1 : 1;

    if (aFutura && bFutura) {
      return aEntrada - bEntrada;
    }

    if (aEntrada && bEntrada) {
      return bEntrada - aEntrada;
    }

    return String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR');
  };

  const patchVisitante = async (id, payload) => {
    try {
      await api.patch(`/cadastros/visitantes/${id}/update/`, payload);
      fetchData('visitantes', currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao atualizar visitante:', error);
      alert(`Erro ao atualizar visitante: ${error.response?.data?.error || 'Ocorreu um erro ao atualizar'}`);
    }
  };

  const handleMarcarEntradaVisitante = async (visitante) => {
    const agoraIso = new Date().toISOString();
    await patchVisitante(visitante.id, {
      data_entrada: agoraIso,
      data_saida: null,
    });
  };

  const handleMarcarSaidaVisitante = async (visitante) => {
    const agoraIso = new Date().toISOString();
    await patchVisitante(visitante.id, {
      data_saida: agoraIso,
    });
  };

  const toggleVisitanteCard = (visitanteId) => {
    setExpandedVisitanteCards((prev) => ({
      ...prev,
      [visitanteId]: !prev[visitanteId],
    }));
  };

  const visitantesOrdenados = [...(tableData.visitantes || [])].sort(sortVisitantesByPrioridade);
  const visitantesPermanentes = visitantesOrdenados.filter((v) => Boolean(v.is_permanente));
  const visitantesNaoPermanentes = visitantesOrdenados.filter((v) => !Boolean(v.is_permanente));

  const getHojeLocal = () => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  };

  const isDataEventoHoje = (dataEvento) => Boolean(dataEvento) && dataEvento === getHojeLocal();

  const isDataEventoFutura = (dataEvento) => Boolean(dataEvento) && dataEvento > getHojeLocal();

  const listasConvidadosOrdenadas = [...(tableData.lista_convidados || [])].sort((a, b) => {
    const dataA = a?.data_evento || '';
    const dataB = b?.data_evento || '';
    if (dataA !== dataB) return dataA.localeCompare(dataB);
    return String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR');
  });

  const listasConvidadosHoje = listasConvidadosOrdenadas.filter((lista) => isDataEventoHoje(lista.data_evento));
  const listasConvidadosFuturas = listasConvidadosOrdenadas.filter((lista) => isDataEventoFutura(lista.data_evento));
  const listasConvidadosInicio = (currentPage - 1) * LISTA_CONVIDADOS_CARDS_POR_PAGINA;
  const listasConvidadosPaginadas = listasConvidadosOrdenadas.slice(
    listasConvidadosInicio,
    listasConvidadosInicio + LISTA_CONVIDADOS_CARDS_POR_PAGINA
  );
  const listasConvidadosHojePaginadas = listasConvidadosPaginadas.filter((lista) => isDataEventoHoje(lista.data_evento));
  const listasConvidadosFuturasPaginadas = listasConvidadosPaginadas.filter((lista) => isDataEventoFutura(lista.data_evento));

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
              </div>

              <EncomendasKanbanBoard
                encomendas={tableData.encomendas}
                loading={loading}
                onCardClick={setEncomendaSelecionada}
                onStatusChange={handleEncomendaStatusChange}
                canDrag={isPortaria}
                pendingById={encomendaStatusPending}
                currentPage={currentPage}
                totalPages={totalPages.encomendas}
                onPageChange={setCurrentPage}
                canDragCard={(encomenda, currentStatus) => currentStatus !== 'contestada' && !Boolean(encomendaStatusPending[encomenda.id])}
                canMoveStatus={(_encomenda, nextStatus, currentStatus) => currentStatus !== 'contestada' && nextStatus !== 'contestada'}
              />
            </>
          )}

          {/* Aba de Visitantes */}
          {activeTab === 'visitantes' && (
            <>
              <div className="page-header">
                <div className="search-container" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                  <label style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={incluirVisitantesPassados}
                      onChange={(e) => { setIncluirVisitantesPassados(e.target.checked); setCurrentPage(1); }}
                      style={{ accentColor: '#2abb98', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    Incluir visitantes de datas anteriores
                  </label>
                  {isSindicoPortaria && (
                    <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: '0.85rem', color: '#374151' }}>Escopo:</label>
                      <select value={visitanteScope} onChange={(e) => setVisitanteScope(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6 }}>
                        <option value="mine">Meus visitantes</option>
                        <option value="all">Todos do condomínio</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                {(isPortaria || isSindicoPortaria) && (
                  <div className="dropdown-wrapper">
                    <button className="add-button" onClick={() => setShowAddVisitante(true)} ref={addVisitanteButtonRef}>
                      <FaPlus /> Adicionar Visitante
                    </button>
                    {showAddVisitante && (
                      <AddVisitanteDropdown onClose={() => setShowAddVisitante(false)} onSuccess={() => { fetchData('visitantes', 1, searchTerm); setShowAddVisitante(false); }} triggerRef={addVisitanteButtonRef} />
                    )}
                  </div>
                )}
              </div>

              <div className="portaria-lista-cards-sections">
                <section className="portaria-lista-cards-section">
                  <div className="portaria-lista-cards-section__header">
                    <h3>Visitantes permanentes</h3>
                    <span>{visitantesPermanentes.length}</span>
                  </div>
                  <div className="units-cards-grid">
                    {visitantesPermanentes.length === 0 ? (
                      <div className="empty-state compact">
                        <p>Nenhum visitante permanente nesta página.</p>
                      </div>
                    ) : (
                      visitantesPermanentes.map((visitante) => {
                        const entrou = isVisitanteEntrou(visitante);
                        const saiu = isVisitanteSaiu(visitante);
                        const entradaHoje = isVisitanteEntradaHoje(visitante);
                        const isExpanded = Boolean(expandedVisitanteCards[visitante.id]);
                        return (
                          <article
                            key={visitante.id}
                            className={`unit-card portaria-visitante-card ${isExpanded ? 'unit-card--expanded' : ''} ${entradaHoje ? 'portaria-visitante-card--hoje' : ''}`}
                          >
                            <div className="unit-card__header">
                              <div className="unit-card__header-left">
                                <span className="unit-card__title">{visitante.nome || '-'}</span>
                              </div>
                              <div className="unit-card__header-right">
                                {entradaHoje && <span className="portaria-lista-card__dia-badge">Hoje</span>}
                                <span className="unit-card__status-badge unit-card__status-badge--active">Permanente</span>
                                <button
                                  className="unit-card__edit-btn"
                                  onClick={() => toggleVisitanteCard(visitante.id)}
                                  title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                >
                                  {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                                </button>
                              </div>
                            </div>
                            <div className="unit-card__summary">
                              <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                                <div className="unit-card__info-item"><span className="unit-card__info-label">Morador</span><span className="unit-card__info-value">{visitante.morador_nome || '-'}</span></div>
                                <div className="unit-card__info-item"><span className="unit-card__info-label">Documento</span><span className="unit-card__info-value">{visitante.documento || '-'}</span></div>
                              </div>
                              <div className="portaria-visitante-card__status-row">
                                <span className={`unit-card__status-badge ${entrou ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>Entrou: {entrou ? 'Sim' : 'Não'}</span>
                                <span className={`unit-card__status-badge ${saiu ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>Saiu: {saiu ? 'Sim' : 'Não'}</span>
                              </div>
                              <div className="portaria-visitante-card__actions">
                                <button
                                  className="portaria-visitante-card__btn"
                                  onClick={() => handleMarcarEntradaVisitante(visitante)}
                                  disabled={entrou && !saiu}
                                  title="Marcar entrada"
                                >
                                  <FaCheck size={12} /> Entrou
                                </button>
                                <button
                                  className="portaria-visitante-card__btn portaria-visitante-card__btn--saida"
                                  onClick={() => handleMarcarSaidaVisitante(visitante)}
                                  disabled={!entrou || saiu}
                                  title="Marcar saída"
                                >
                                  <FaTimes size={12} /> Saiu
                                </button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="unit-card__residents portaria-visitante-card__details">
                                <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Entrou</span><span className="unit-card__info-value">{entrou ? 'Sim' : 'Não'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Saiu</span><span className="unit-card__info-value">{saiu ? 'Sim' : 'Não'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Entrada</span><span className="unit-card__info-value">{formatDateTime(visitante.data_entrada)}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Saída</span><span className="unit-card__info-value">{formatDateTime(visitante.data_saida)}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Unidade</span><span className="unit-card__info-value">{visitante.morador_unidade_identificacao || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Bloco</span><span className="unit-card__info-value">{visitante.morador_unidade_bloco || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Número</span><span className="unit-card__info-value">{visitante.morador_unidade_numero || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">E-mail</span><span className="unit-card__info-value">{visitante.email || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Veículo</span><span className="unit-card__info-value">{visitante.placa_veiculo ? formatPlaca(String(visitante.placa_veiculo)) : '-'}</span></div>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="portaria-lista-cards-section">
                  <div className="portaria-lista-cards-section__header">
                    <h3>Visitantes não permanentes</h3>
                    <span>{visitantesNaoPermanentes.length}</span>
                  </div>
                  <div className="units-cards-grid">
                    {visitantesNaoPermanentes.length === 0 ? (
                      <div className="empty-state compact">
                        <p>Nenhum visitante não permanente nesta página.</p>
                      </div>
                    ) : (
                      visitantesNaoPermanentes.map((visitante) => {
                        const entrou = isVisitanteEntrou(visitante);
                        const saiu = isVisitanteSaiu(visitante);
                        const entradaHoje = isVisitanteEntradaHoje(visitante);
                        const isExpanded = Boolean(expandedVisitanteCards[visitante.id]);
                        return (
                          <article
                            key={visitante.id}
                            className={`unit-card portaria-visitante-card ${isExpanded ? 'unit-card--expanded' : ''} ${entradaHoje ? 'portaria-visitante-card--hoje' : ''}`}
                          >
                            <div className="unit-card__header">
                              <div className="unit-card__header-left">
                                <span className="unit-card__title">{visitante.nome || '-'}</span>
                              </div>
                              <div className="unit-card__header-right">
                                {entradaHoje && <span className="portaria-lista-card__dia-badge">Hoje</span>}
                                <span className="unit-card__status-badge unit-card__status-badge--inactive">Não permanente</span>
                                <button
                                  className="unit-card__edit-btn"
                                  onClick={() => toggleVisitanteCard(visitante.id)}
                                  title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                >
                                  {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                                </button>
                              </div>
                            </div>
                            <div className="unit-card__summary">
                              <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                                <div className="unit-card__info-item"><span className="unit-card__info-label">Morador</span><span className="unit-card__info-value">{visitante.morador_nome || '-'}</span></div>
                                <div className="unit-card__info-item"><span className="unit-card__info-label">Documento</span><span className="unit-card__info-value">{visitante.documento || '-'}</span></div>
                              </div>
                              <div className="portaria-visitante-card__status-row">
                                <span className={`unit-card__status-badge ${entrou ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>Entrou: {entrou ? 'Sim' : 'Não'}</span>
                                <span className={`unit-card__status-badge ${saiu ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>Saiu: {saiu ? 'Sim' : 'Não'}</span>
                              </div>
                              <div className="portaria-visitante-card__actions">
                                <button
                                  className="portaria-visitante-card__btn"
                                  onClick={() => handleMarcarEntradaVisitante(visitante)}
                                  disabled={entrou && !saiu}
                                  title="Marcar entrada"
                                >
                                  <FaCheck size={12} /> Entrou
                                </button>
                                <button
                                  className="portaria-visitante-card__btn portaria-visitante-card__btn--saida"
                                  onClick={() => handleMarcarSaidaVisitante(visitante)}
                                  disabled={!entrou || saiu}
                                  title="Marcar saída"
                                >
                                  <FaTimes size={12} /> Saiu
                                </button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="unit-card__residents portaria-visitante-card__details">
                                <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Entrou</span><span className="unit-card__info-value">{entrou ? 'Sim' : 'Não'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Saiu</span><span className="unit-card__info-value">{saiu ? 'Sim' : 'Não'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Entrada</span><span className="unit-card__info-value">{formatDateTime(visitante.data_entrada)}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Saída</span><span className="unit-card__info-value">{formatDateTime(visitante.data_saida)}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Unidade</span><span className="unit-card__info-value">{visitante.morador_unidade_identificacao || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Bloco</span><span className="unit-card__info-value">{visitante.morador_unidade_bloco || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Número</span><span className="unit-card__info-value">{visitante.morador_unidade_numero || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">E-mail</span><span className="unit-card__info-value">{visitante.email || '-'}</span></div>
                                  <div className="unit-card__info-item"><span className="unit-card__info-label">Veículo</span><span className="unit-card__info-value">{visitante.placa_veiculo ? formatPlaca(String(visitante.placa_veiculo)) : '-'}</span></div>
                                </div>
                              </div>
                            )}
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

              <div className="portaria-lista-cards-sections">
                <section className="portaria-lista-cards-section">
                  <div className="portaria-lista-cards-section__header">
                    <h3>Listas de hoje</h3>
                    <span>{listasConvidadosHoje.length}</span>
                  </div>
                  <div className="units-cards-grid">
                    {listasConvidadosHojePaginadas.length === 0 ? (
                      <div className="empty-state compact">
                        <p>Nenhuma lista do dia nesta página.</p>
                      </div>
                    ) : (
                      listasConvidadosHojePaginadas.map((lista) => (
                        <article
                          key={lista.id}
                          className="unit-card portaria-lista-card portaria-lista-card--hoje"
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
                              <span className="portaria-lista-card__dia-badge">Hoje</span>
                            </div>
                          </div>
                          <div className="unit-card__summary">
                            <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Morador</span><span className="unit-card__info-value">{lista.morador_nome || '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Data do evento</span><span className="unit-card__info-value">{lista.data_evento ? lista.data_evento.split('-').reverse().join('/') : '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Convidados</span><span className="unit-card__info-value">{lista.total_convidados ?? 0}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Status</span><span className="unit-card__info-value">{lista.ativa ? 'Ativa' : 'Inativa'}</span></div>
                            </div>
                            <div className="portaria-lista-card__actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="portaria-lista-card__open-btn"
                                onClick={() => setListaSelecionada(lista)}
                                title="Ver lista de convidados"
                              >
                                <FaUsers size={12} /> Ver Lista
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                <section className="portaria-lista-cards-section">
                  <div className="portaria-lista-cards-section__header">
                    <h3>Listas futuras</h3>
                    <span>{listasConvidadosFuturas.length}</span>
                  </div>
                  <div className="units-cards-grid">
                    {listasConvidadosFuturasPaginadas.length === 0 ? (
                      <div className="empty-state compact">
                        <p>Nenhuma lista futura nesta página.</p>
                      </div>
                    ) : (
                      listasConvidadosFuturasPaginadas.map((lista) => (
                        <article
                          key={lista.id}
                          className="unit-card portaria-lista-card"
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
                              <span className={`unit-card__status-badge ${lista.ativa ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                                {lista.ativa ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                          </div>
                          <div className="unit-card__summary">
                            <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Morador</span><span className="unit-card__info-value">{lista.morador_nome || '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Data do evento</span><span className="unit-card__info-value">{lista.data_evento ? lista.data_evento.split('-').reverse().join('/') : '-'}</span></div>
                              <div className="unit-card__info-item"><span className="unit-card__info-label">Convidados</span><span className="unit-card__info-value">{lista.total_convidados ?? 0}</span></div>
                            </div>
                            <div className="portaria-lista-card__actions" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="portaria-lista-card__open-btn"
                                onClick={() => setListaSelecionada(lista)}
                                title="Ver lista de convidados"
                              >
                                <FaUsers size={12} /> Ver Lista
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isSindicoPortaria && (
                    <label className="checkbox-label">
                      <input type="checkbox" checked={incluirEventosConcluidos} onChange={(e) => { setIncluirEventosConcluidos(e.target.checked); setCurrentPage(1); }} />
                      Incluir eventos concluídos
                    </label>
                  )}
                </div>
                {isSindicoPortaria && (
                  <div>
                    <button className="add-button" onClick={() => { setEditingEvento(null); setShowEventoModal(true); }}><FaPlus /> Novo Evento</button>
                  </div>
                )}
              </div>

              <div className="units-cards-grid" style={{ marginTop: 12 }}>
                {(tableData.eventos || []).length === 0 ? (
                  <div className="empty-state compact"><p>Nenhum evento encontrado.</p></div>
                ) : (
                  (tableData.eventos || []).map((ev) => (
                    <EventoCard key={ev.id} evento={ev} onOpen={(e) => setEventoSelecionado(e)} />
                  ))
                )}
              </div>

              <div className="pagination" style={{ marginTop: 12 }}>
                <div className="pagination-info">Página {currentPage} de {totalPages.eventos || 1}</div>
                <div className="pagination-controls">
                  <button type="button" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage <= 1}>Anterior</button>
                  <button type="button" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages.eventos || 1))} disabled={currentPage >= (totalPages.eventos || 1)}>Próxima</button>
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
                  onSuccess={() => { setShowEventoModal(false); setEditingEvento(null); fetchData('eventos', currentPage, searchTerm); }}
                  evento={editingEvento}
                />
              )}
            </>
          )}

          {/* Aba de Avisos */}
          {activeTab === 'avisos' && (
            <>
              <div className="page-header" />
              <AvisosKanbanBoard
                avisos={tableData.avisos}
                loading={loading}
                onStatusChange={handleAvisoStatusChange}
                canDrag={false}
                pendingById={avisoStatusPending}
                visibleStatuses={['ativo']}
              />
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
                </div>
              </div>
              <OcorrenciasKanbanBoard
                ocorrencias={tableData.ocorrencias}
                loading={loading}
                onCardClick={setOcorrenciaSelecionada}
                onStatusChange={handleOcorrenciaStatusChange}
                canDrag={false}
                pendingById={ocorrenciaStatusPending}
              />
            </>
          )}
        </div>
      </div>

      {listaSelecionada && (
        <ListaConvidadosModal
          lista={listaSelecionada}
          onClose={() => setListaSelecionada(null)}
        />
      )}

      {encomendaSelecionada && (
        <EncomendaDetalheModal
          encomenda={encomendaSelecionada}
          onClose={() => setEncomendaSelecionada(null)}
          onUpdate={() => fetchData('encomendas', currentPage, searchTerm)}
        />
      )}

      {showRetiradaModal && (
        <div className="modal-overlay" onClick={() => setShowRetiradaModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>Confirmar Retirada</h2>
              <button className="modal-close" onClick={() => setShowRetiradaModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Quem retirou a encomenda?</label>
                <input
                  type="text"
                  value={retiradaNome}
                  onChange={(e) => setRetiradaNome(e.target.value)}
                  placeholder="Nome de quem retirou"
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowRetiradaModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmRetiradaEncomenda}>
                Confirmar Retirada
              </button>
            </div>
          </div>
        </div>
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
