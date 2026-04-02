import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import { useAuth } from '../context/AuthContext';
import ProtectedImage from '../components/common/ProtectedImage';
import AddUserDropdown from '../components/Users/AddUserDropdown';
import UsersCards from '../components/Users/UsersCards';
import PasswordResetModal from '../components/Users/PasswordResetModal';
import GenericTable from '../components/GenericTable';
import { useToast } from '../components/common/Toast';
import api, * as apiServices from '../services/api';
import { generateStrongPassword } from '../utils/passwordGenerator';
import { validateCPF } from '../utils/validators';
import '../styles/UsersPage.css';
import '../styles/UnitsCards.css';
import '../styles/Modal.css';
import {
  FaClipboardList,
  FaCopy,
  FaDownload,
  FaEyeSlash,
  FaEdit,
  FaPlus,
  FaQrcode,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUserFriends,
  FaUsers,
} from 'react-icons/fa';

const eventoCerimonialAPI = apiServices.eventoCerimonialAPI || {
  list: (params = {}) => api.get('/cadastros/eventos-cerimonial/', { params }),
  create: (data) => api.post('/cadastros/eventos-cerimonial/create/', data),
  get: (id) => api.get(`/cadastros/eventos-cerimonial/${id}/`),
  patch: (id, data) => api.patch(`/cadastros/eventos-cerimonial/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/eventos-cerimonial/${id}/delete/`),
  gerarConvite: (id, tipo) => api.post(`/cadastros/eventos-cerimonial/${id}/convites/${tipo}/gerar/`),
  listFuncionariosCadastrados: (params = {}) => api.get('/cadastros/eventos-cerimonial/funcionarios-cadastrados/', { params }),
  listFuncionarios: (id) => api.get(`/cadastros/eventos-cerimonial/${id}/funcionarios/`),
  addFuncionario: (id, data) => api.post(`/cadastros/eventos-cerimonial/${id}/funcionarios/`, data),
  patchFuncionario: (id, funcionarioId, data) => api.patch(`/cadastros/eventos-cerimonial/${id}/funcionarios/${funcionarioId}/`, data),
  deleteFuncionario: (id, funcionarioId) => api.delete(`/cadastros/eventos-cerimonial/${id}/funcionarios/${funcionarioId}/`),
  listFuncoesFesta: (params = {}) => api.get('/cadastros/eventos-cerimonial/funcoes/', { params }),
  createFuncaoFesta: (data) => api.post('/cadastros/eventos-cerimonial/funcoes/', data),
  patchFuncaoFesta: (funcaoId, data) => api.patch(`/cadastros/eventos-cerimonial/funcoes/${funcaoId}/`, data),
  deleteFuncaoFesta: (funcaoId) => api.delete(`/cadastros/eventos-cerimonial/funcoes/${funcaoId}/`),
};

const listaConvidadosCerimonialAPI = apiServices.listaConvidadosCerimonialAPI || {
  getListas: (params = {}) => api.get('/cadastros/listas-convidados-cerimonial/', { params }),
  criarLista: (data) => api.post('/cadastros/listas-convidados-cerimonial/', data),
  getLista: (listaId) => api.get(`/cadastros/listas-convidados-cerimonial/${listaId}/`),
  buscarCpfSimples: (cpf) => api.get('/cadastros/listas-convidados-cerimonial/buscar-cpf/', { params: { cpf } }),
  buscarConvidadosAnteriores: (q = '') => api.get('/cadastros/listas-convidados-cerimonial/convidados-anteriores/', { params: { q } }),
  adicionarConvidado: (listaId, data) => api.post(`/cadastros/listas-convidados-cerimonial/${listaId}/adicionar-convidado/`, data),
  atualizarConvidado: (listaId, convidadoId, data) => api.patch(`/cadastros/listas-convidados-cerimonial/${listaId}/convidados/${convidadoId}/update/`, data),
  removerConvidado: (listaId, convidadoId) => api.delete(`/cadastros/listas-convidados-cerimonial/${listaId}/convidados/${convidadoId}/delete/`),
  confirmarEntrada: (listaId, convidadoId) => api.patch(`/cadastros/listas-convidados-cerimonial/${listaId}/convidados/${convidadoId}/confirmar-entrada/`),
  enviarQrCode: (listaId, convidadoId) => api.post(`/cadastros/listas-convidados-cerimonial/${listaId}/convidados/${convidadoId}/enviar-qrcode/`),
  downloadQrCode: (token) => api.get('/cadastros/listas-convidados-cerimonial/download-qrcode/', { params: { token }, responseType: 'blob' }),
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatCurrency = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrencyInputToDecimalString = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '0.00';
  return (Number(digits) / 100).toFixed(2);
};

const getPrimeiroNome = (nomeCompleto) => {
  const nome = String(nomeCompleto || '').trim();
  if (!nome) return '-';
  return nome.split(/\s+/)[0] || '-';
};

const normalizeConvidadoMatchField = (value) => String(value || '').trim().toLowerCase();

const normalizeCpfDigits = (value) => String(value || '').replace(/\D/g, '');

const findConvidadoByStableData = (convidados, reference) => {
  const lista = Array.isArray(convidados) ? convidados : [];
  const qrToken = String(reference?.qr_token || '').trim().toLowerCase();
  if (qrToken) {
    const byQrToken = lista.find((c) => String(c?.qr_token || '').trim().toLowerCase() === qrToken);
    if (byQrToken?.id) return byQrToken;
  }

  const refCpf = normalizeCpfDigits(reference?.cpf);
  const refNome = normalizeConvidadoMatchField(reference?.nome);
  const refEmail = normalizeConvidadoMatchField(reference?.email);

  if (refCpf && refNome && refEmail) {
    const byCpfNomeEmail = lista.find((c) => {
      const cCpf = normalizeCpfDigits(c?.cpf);
      const cNome = normalizeConvidadoMatchField(c?.nome);
      const cEmail = normalizeConvidadoMatchField(c?.email);
      return cCpf === refCpf && cNome === refNome && cEmail === refEmail;
    });
    if (byCpfNomeEmail?.id) return byCpfNomeEmail;
  }

  if (refNome && refEmail) {
    const byNomeEmail = lista.find((c) => {
      const cNome = normalizeConvidadoMatchField(c?.nome);
      const cEmail = normalizeConvidadoMatchField(c?.email);
      return cNome === refNome && cEmail === refEmail;
    });
    if (byNomeEmail?.id) return byNomeEmail;
  }

  return null;
};

const getFuncaoPrincipalFuncionario = (item) => {
  if (item?.is_recepcao) return 'Recepção';

  const funcoes = Array.isArray(item?.funcoes) ? item.funcoes : [];
  if (funcoes.length > 0) {
    return String(funcoes[0]?.nome || '').trim() || 'Sem função';
  }

  const legado = String(item?.funcao || '').trim();
  if (!legado) return 'Sem função';
  return legado.split(',')[0].trim() || 'Sem função';
};

const eventoActionGridStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
  marginBottom: 8,
  justifyContent: 'center',
};

const eventoActionButtonBaseStyle = {
  width: 40,
  height: 40,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  borderRadius: 10,
};

const eventoToggleButtonStyle = (opened, palette) => ({
  ...eventoActionButtonBaseStyle,
  background: opened ? palette.bgActive : '#ffffff',
  color: opened ? '#ffffff' : palette.color,
  border: `1px solid ${opened ? palette.bgActive : palette.border}`,
  boxShadow: opened ? '0 6px 16px rgba(15, 23, 42, 0.18)' : 'none',
});

const formatCepValue = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatCpfValue = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhoneValue = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const parseBooleanToken = (value) => {
  const v = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'sim', 'yes', 'vip', 'x', 'ok'].includes(v);
};

const createConvidadoRow = () => ({
  rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  cpf: '',
  nome: '',
  email: '',
  vip: false,
  confirmado: false,
  buscando: false,
  encontrado: false,
  erro: '',
});

const createFuncaoFestaRow = () => ({
  rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  nome: '',
  ativo: true,
});

const parseAtivoToken = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return true;
  if (['0', 'false', 'nao', 'não', 'inativo', 'off'].includes(v)) return false;
  return true;
};

const convidadoModalStyles = {
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  iconBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '7px 8px',
    lineHeight: 0,
    color: '#9ca3af',
    flexShrink: 0,
  },
  btnSec: {
    padding: '7px 14px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.83rem',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
};

const funcaoFestaModalStyles = {
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: 0,
    marginBottom: 10,
  },
  gridWrapper: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 10,
    background: '#f8fafc',
    marginBottom: 10,
    display: 'grid',
    gap: 8,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 90px 42px',
    gap: 8,
    alignItems: 'center',
  },
  colLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#64748b',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
    outline: 'none',
  },
  removeBtn: {
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#9ca3af',
    borderRadius: 8,
    height: 36,
  },
  addRowSection: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
};

const cleanPastedCell = (value) => {
  const raw = String(value || '').trim();
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1).trim();
  }
  return raw;
};

const splitClipboardRows = (text) => String(text || '').split(/\r\n|\n|\r/);

const splitClipboardCols = (line) => {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.split(',');
};

const parseClipboardGrid = (text) => {
  const rows = splitClipboardRows(text)
    .map((line) => String(line || ''))
    .filter((line, idx, arr) => {
      if (idx === arr.length - 1) return String(line || '').trim().length > 0;
      return true;
    })
    .map((line) => splitClipboardCols(line).map(cleanPastedCell));

  return rows.filter((row) => row.some((cell) => String(cell || '').trim()));
};

const isHeaderLine = (cols) => {
  const c0 = String(cols[0] || '').trim().toLowerCase();
  const c1 = String(cols[1] || '').trim().toLowerCase();
  const c2 = String(cols[2] || '').trim().toLowerCase();
  return c0 === 'cpf' || c1 === 'nome' || c2 === 'email';
};

const CONVIDADOS_PAGE_SIZE = 5;

function CerimonialistaPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const hasAccess = user?.groups?.some((g) => g.name === 'Cerimonialista');
  const activeTabRaw = searchParams.get('tab') || 'eventos';
  const activeTab = ['lista_convidados', 'lista_funcionarios'].includes(activeTabRaw) ? 'eventos' : activeTabRaw;

  const [eventos, setEventos] = useState([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const [eventosSearch, setEventosSearch] = useState('');

  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [eventoEditing, setEventoEditing] = useState(null);
  const [eventoSaving, setEventoSaving] = useState(false);
  const [eventoError, setEventoError] = useState('');
  const [eventoForm, setEventoForm] = useState({
    nome: '',
    datetime_inicio: '',
    datetime_fim: '',
    cep: '',
    numero: '',
    complemento: '',
    numero_pessoas: 1,
    evento_confirmado: false,
    organizadores_ids: [],
    funcionarios_ids: [],
    imagem: null,
  });
  const [organizadoresUsers, setOrganizadoresUsers] = useState([]);
  const [associacoesExpanded, setAssociacoesExpanded] = useState(false);
  const [organizadoresExpanded, setOrganizadoresExpanded] = useState(false);
  const [funcionariosAssocExpanded, setFuncionariosAssocExpanded] = useState(false);
  const [organizadoresSearch, setOrganizadoresSearch] = useState('');
  const [cepLookup, setCepLookup] = useState({
    loading: false,
    error: '',
    data: null,
  });

  const [conviteModal, setConviteModal] = useState({ open: false, data: null });

  const [listasConvidados, setListasConvidados] = useState([]);
  const [listaConvidadosLoading, setListaConvidadosLoading] = useState(false);
  const [listasExpandidas, setListasExpandidas] = useState({});
  const [convidadoModalOpen, setConvidadoModalOpen] = useState(false);
  const [convidadoSaving, setConvidadoSaving] = useState(false);
  const [convidadoEditing, setConvidadoEditing] = useState(null);
  const [convidadoListaId, setConvidadoListaId] = useState(null);
  const [convidadoForm, setConvidadoForm] = useState({
    cpf: '',
    nome: '',
    email: '',
    vip: false,
    confirmado: false,
  });
  const [convidadoRows, setConvidadoRows] = useState([createConvidadoRow()]);
  const [qtdAdicionarConvidados, setQtdAdicionarConvidados] = useState(1);
  const [showImportarConvidadoAnterior, setShowImportarConvidadoAnterior] = useState(false);
  const [buscaConvidadoAnterior, setBuscaConvidadoAnterior] = useState('');
  const [resultadosConvidadoAnterior, setResultadosConvidadoAnterior] = useState([]);
  const [buscandoConvidadoAnterior, setBuscandoConvidadoAnterior] = useState(false);
  const [convidadosSearchPorEvento, setConvidadosSearchPorEvento] = useState({});
  const [convidadosPagePorEvento, setConvidadosPagePorEvento] = useState({});

  const [organizadoresPorEvento, setOrganizadoresPorEvento] = useState({});
  const [organizadoresLoadingPorEvento, setOrganizadoresLoadingPorEvento] = useState({});
  const [organizadoresExpandidos, setOrganizadoresExpandidos] = useState({});
  const [organizadoresSelecionadosPorEvento, setOrganizadoresSelecionadosPorEvento] = useState({});
  const [organizadoresSavingPorEvento, setOrganizadoresSavingPorEvento] = useState({});

  const [funcionariosPorEvento, setFuncionariosPorEvento] = useState({});
  const [funcionariosLoadingPorEvento, setFuncionariosLoadingPorEvento] = useState({});
  const [funcionariosExpandidos, setFuncionariosExpandidos] = useState({});
  const [funcionariosDetalhesExpandidosPorEvento, setFuncionariosDetalhesExpandidosPorEvento] = useState({});
  const [funcionarioEventoSelecionadoId, setFuncionarioEventoSelecionadoId] = useState('');
  const [funcionarioModalOpen, setFuncionarioModalOpen] = useState(false);
  const [funcionarioEditing, setFuncionarioEditing] = useState(null);
  const [funcionarioSaving, setFuncionarioSaving] = useState(false);
  const [cpfUsoStatus, setCpfUsoStatus] = useState({
    checking: false,
    exists: false,
    invalid: false,
    message: '',
  });
  const [recepcaoUsers, setRecepcaoUsers] = useState([]);
  const [funcionarioForm, setFuncionarioForm] = useState({
    is_recepcao: false,
    usuario: '',
    email: '',
    phone: '',
    usuario_is_active: false,
    nome: '',
    documento: '',
    funcoes_ids: [],
    horario_entrada: '',
    horario_saida: '',
    pagamento_realizado: false,
    valor_pagamento: '0.00',
  });
  const [funcionariosCadastrados, setFuncionariosCadastrados] = useState([]);
  const [funcionariosCadastradosLoading, setFuncionariosCadastradosLoading] = useState(false);

  const [funcoesFesta, setFuncoesFesta] = useState([]);
  const [funcoesFestaLoading, setFuncoesFestaLoading] = useState(false);
  const [funcoesFestaSearch, setFuncoesFestaSearch] = useState('');
  const [funcaoFestaModalOpen, setFuncaoFestaModalOpen] = useState(false);
  const [funcaoFestaEditing, setFuncaoFestaEditing] = useState(null);
  const [funcaoFestaSaving, setFuncaoFestaSaving] = useState(false);
  const [funcaoFestaForm, setFuncaoFestaForm] = useState({
    nome: '',
    ativo: true,
  });
  const [funcaoFestaRows, setFuncaoFestaRows] = useState([createFuncaoFestaRow()]);
  const [qtdAdicionarFuncoes, setQtdAdicionarFuncoes] = useState(1);

  const addOrganizadorButtonRef = useRef(null);
  const addFuncionarioButtonRef = useRef(null);

  const [organizadoresCadastro, setOrganizadoresCadastro] = useState([]);
  const [organizadoresCadastroLoading, setOrganizadoresCadastroLoading] = useState(false);
  const [organizadoresCadastroSearch, setOrganizadoresCadastroSearch] = useState('');
  const [organizadoresCadastroPage, setOrganizadoresCadastroPage] = useState(1);
  const [organizadoresCadastroTotalPages, setOrganizadoresCadastroTotalPages] = useState(1);
  const [showAddOrganizadorCadastro, setShowAddOrganizadorCadastro] = useState(false);

  const [funcionariosCadastro, setFuncionariosCadastro] = useState([]);
  const [funcionariosCadastroLoading, setFuncionariosCadastroLoading] = useState(false);
  const [funcionariosCadastroSearch, setFuncionariosCadastroSearch] = useState('');
  const [funcionariosCadastroPage, setFuncionariosCadastroPage] = useState(1);
  const [funcionariosCadastroTotalPages, setFuncionariosCadastroTotalPages] = useState(1);
  const [showAddFuncionarioCadastro, setShowAddFuncionarioCadastro] = useState(false);

  const [resetInfo, setResetInfo] = useState({
    show: false,
    title: '',
    subtitle: '',
    message: '',
  });

  const eventosFiltrados = useMemo(() => {
    if (!eventosSearch.trim()) return eventos;
    const q = eventosSearch.toLowerCase();
    return eventos.filter((ev) =>
      (ev.nome || '').toLowerCase().includes(q) ||
      (ev.endereco_completo || '').toLowerCase().includes(q)
    );
  }, [eventos, eventosSearch]);

  const organizadoresFiltrados = useMemo(() => {
    const q = (organizadoresSearch || '').trim().toLowerCase();
    if (!q) return organizadoresUsers;
    return organizadoresUsers.filter((u) =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [organizadoresUsers, organizadoresSearch]);

  const loadEventos = async () => {
    setEventosLoading(true);
    try {
      const response = await eventoCerimonialAPI.list();
      const data = Array.isArray(response.data?.results)
        ? response.data.results
        : (Array.isArray(response.data) ? response.data : []);
      setEventos(data);
    } catch (e) {
      console.error('Erro ao carregar eventos do cerimonial', e);
      setEventos([]);
    } finally {
      setEventosLoading(false);
    }
  };

  const loadListasConvidados = async () => {
    setListaConvidadosLoading(true);
    try {
      const response = await listaConvidadosCerimonialAPI.getListas();
      const data = Array.isArray(response.data) ? response.data : (response.data?.results || []);
      setListasConvidados(data);
    } catch (e) {
      console.error('Erro ao carregar listas de convidados do cerimonial', e);
      setListasConvidados([]);
    } finally {
      setListaConvidadosLoading(false);
    }
  };

  const loadRecepcaoUsers = async () => {
    try {
      const response = await api.get('/access/users/simple/', { params: { type: 'recepcao' } });
      const data = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.results) ? response.data.results : []);
      setRecepcaoUsers(data);
    } catch (e) {
      console.error('Erro ao carregar usuários de recepção', e);
      setRecepcaoUsers([]);
    }
  };

  const loadOrganizadoresUsers = async () => {
    try {
      const response = await api.get('/access/users/simple/', { params: { type: 'organizadores_evento' } });
      const data = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.results) ? response.data.results : []);
      setOrganizadoresUsers(data);
    } catch (e) {
      console.error('Erro ao carregar usuários organizadores', e);
      setOrganizadoresUsers([]);
    }
  };

  const loadFuncionariosCadastrados = async (search = '', isRecepcao = null) => {
    setFuncionariosCadastradosLoading(true);
    try {
      const params = {};
      if (search) params.q = search;
      if (typeof isRecepcao === 'boolean') {
        params.is_recepcao = isRecepcao ? '1' : '0';
      }
      const response = await eventoCerimonialAPI.listFuncionariosCadastrados(params);
      setFuncionariosCadastrados(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Erro ao carregar funcionários cadastrados', e);
      setFuncionariosCadastrados([]);
    } finally {
      setFuncionariosCadastradosLoading(false);
    }
  };

  const loadFuncoesFesta = async (search = '') => {
    setFuncoesFestaLoading(true);
    try {
      const response = await eventoCerimonialAPI.listFuncoesFesta({ search });
      setFuncoesFesta(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Erro ao carregar funções da festa', e);
      setFuncoesFesta([]);
    } finally {
      setFuncoesFestaLoading(false);
    }
  };

  const loadFuncionariosEvento = async (eventoId) => {
    if (!eventoId) {
      return;
    }
    setFuncionariosLoadingPorEvento((prev) => ({
      ...prev,
      [eventoId]: true,
    }));
    try {
      const response = await eventoCerimonialAPI.listFuncionarios(eventoId);
      setFuncionariosPorEvento((prev) => ({
        ...prev,
        [eventoId]: Array.isArray(response.data) ? response.data : [],
      }));
    } catch (e) {
      console.error('Erro ao carregar funcionários do evento', e);
      setFuncionariosPorEvento((prev) => ({
        ...prev,
        [eventoId]: [],
      }));
    } finally {
      setFuncionariosLoadingPorEvento((prev) => ({
        ...prev,
        [eventoId]: false,
      }));
    }
  };

  const loadOrganizadoresEvento = async (eventoId) => {
    if (!eventoId) return;

    setOrganizadoresLoadingPorEvento((prev) => ({
      ...prev,
      [eventoId]: true,
    }));

    try {
      const response = await eventoCerimonialAPI.get(eventoId);
      const organizadores = Array.isArray(response.data?.organizadores)
        ? response.data.organizadores
        : [];
      setOrganizadoresPorEvento((prev) => ({
        ...prev,
        [eventoId]: organizadores,
      }));
      setOrganizadoresSelecionadosPorEvento((prev) => ({
        ...prev,
        [eventoId]: organizadores.map((u) => String(u.id)),
      }));
    } catch (e) {
      console.error('Erro ao carregar organizadores do evento', e);
      setOrganizadoresPorEvento((prev) => ({
        ...prev,
        [eventoId]: [],
      }));
    } finally {
      setOrganizadoresLoadingPorEvento((prev) => ({
        ...prev,
        [eventoId]: false,
      }));
    }
  };

  const loadUsuariosCadastro = async (tipo, page, search) => {
    const isOrganizadores = tipo === 'organizadores_evento';
    if (isOrganizadores) {
      setOrganizadoresCadastroLoading(true);
    } else {
      setFuncionariosCadastroLoading(true);
    }

    try {
      const response = await api.get('/access/users/', {
        params: {
          type: tipo,
          page,
          search,
        },
      });

      const list = response.data?.results || [];
      const totalPages = response.data?.num_pages || 1;

      if (isOrganizadores) {
        setOrganizadoresCadastro(Array.isArray(list) ? list : []);
        setOrganizadoresCadastroTotalPages(totalPages);
      } else {
        setFuncionariosCadastro(Array.isArray(list) ? list : []);
        setFuncionariosCadastroTotalPages(totalPages);
      }
    } catch (error) {
      console.error(`Erro ao carregar usuários (${tipo})`, error);
      if (isOrganizadores) {
        setOrganizadoresCadastro([]);
        setOrganizadoresCadastroTotalPages(1);
      } else {
        setFuncionariosCadastro([]);
        setFuncionariosCadastroTotalPages(1);
      }
    } finally {
      if (isOrganizadores) {
        setOrganizadoresCadastroLoading(false);
      } else {
        setFuncionariosCadastroLoading(false);
      }
    }
  };

  const loadOrganizadoresCadastro = async (page = organizadoresCadastroPage, search = organizadoresCadastroSearch) => {
    await loadUsuariosCadastro('organizadores_evento', page, search);
  };

  const loadFuncionariosCadastro = async (page = funcionariosCadastroPage, search = funcionariosCadastroSearch) => {
    await loadUsuariosCadastro('recepcao', page, search);
  };

  const handleSaveUsuarioCadastro = async (tipo, id, data) => {
    const payload = {
      full_name: data.full_name,
      email: data.email,
      cpf: data.cpf,
      phone: data.phone,
      is_active: Boolean(data.is_active),
    };

    if (data.username) payload.username = data.username;

    await api.patch(`/access/profile/${id}/`, payload);
    if (tipo === 'organizadores_evento') {
      await loadOrganizadoresCadastro();
      await loadOrganizadoresUsers();
    } else {
      await loadFuncionariosCadastro();
      await loadRecepcaoUsers();
    }
  };

  const handleDeactivateUsuarioCadastro = async (tipo, userItem) => {
    if (!userItem?.id) return;
    if (!window.confirm(`Desativar usuário "${userItem.full_name || userItem.username}"?`)) return;

    await api.patch(`/access/profile/${userItem.id}/`, {
      is_active: false,
    });

    if (tipo === 'organizadores_evento') {
      await loadOrganizadoresCadastro();
      await loadOrganizadoresUsers();
    } else {
      await loadFuncionariosCadastro();
      await loadRecepcaoUsers();
    }
  };

  const handleResetPasswordUsuarioCadastro = async (id, username) => {
    const password = generateStrongPassword();

    const response = await api.patch(`/access/profile/${id}/`, {
      password,
    });
    const senhaEmailEnviado = Boolean(response?.data?.senha_email_enviado);
    const senhaEmailErro = response?.data?.senha_email_erro;

    setResetInfo({
      show: true,
      title: 'Senha redefinida',
      subtitle: username ? `Usuário: ${username}` : '',
      message: senhaEmailEnviado
        ? 'Uma nova senha foi enviada por e-mail para o usuário.'
        : `Senha redefinida, mas não foi possível enviar e-mail${
            senhaEmailErro ? `: ${senhaEmailErro}` : ''
          }.`,
    });
  };

  useEffect(() => {
    if (!hasAccess) return;
    loadEventos();
    loadListasConvidados();
    loadRecepcaoUsers();
    loadOrganizadoresUsers();
    loadFuncoesFesta();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess || activeTab !== 'organizadores_evento') return;
    const t = setTimeout(() => {
      loadOrganizadoresCadastro(organizadoresCadastroPage, organizadoresCadastroSearch);
    }, 250);
    return () => clearTimeout(t);
  }, [hasAccess, activeTab, organizadoresCadastroPage, organizadoresCadastroSearch]);

  useEffect(() => {
    if (!hasAccess || activeTab !== 'funcionarios') return;
    const t = setTimeout(() => {
      loadFuncionariosCadastro(funcionariosCadastroPage, funcionariosCadastroSearch);
    }, 250);
    return () => clearTimeout(t);
  }, [hasAccess, activeTab, funcionariosCadastroPage, funcionariosCadastroSearch]);

  useEffect(() => {
    if (!hasAccess || activeTab !== 'funcoes_festa') return;
    const t = setTimeout(() => {
      loadFuncoesFesta(funcoesFestaSearch);
    }, 250);
    return () => clearTimeout(t);
  }, [hasAccess, activeTab, funcoesFestaSearch]);

  const openCreateEvento = () => {
    setEventoEditing(null);
    setEventoError('');
    setEventoForm({
      nome: '',
      datetime_inicio: '',
      datetime_fim: '',
      cep: '',
      numero: '',
      complemento: '',
      numero_pessoas: 1,
      evento_confirmado: false,
      organizadores_ids: [],
      funcionarios_ids: [],
      imagem: null,
    });
    setAssociacoesExpanded(false);
    setOrganizadoresExpanded(false);
    setFuncionariosAssocExpanded(false);
    setOrganizadoresSearch('');
    setCepLookup({ loading: false, error: '', data: null });
    setEventoModalOpen(true);
  };

  const openEditEvento = async (evento) => {
    setEventoError('');
    setEventoEditing(evento);

    try {
      const response = await eventoCerimonialAPI.get(evento.id);
      const detail = response.data || {};

      setEventoForm({
        nome: detail.nome || '',
        datetime_inicio: formatDateInput(detail.datetime_inicio),
        datetime_fim: formatDateInput(detail.datetime_fim),
        cep: detail.cep || '',
        numero: detail.numero || '',
        complemento: detail.complemento || '',
        numero_pessoas: detail.numero_pessoas || 1,
        evento_confirmado: Boolean(detail.evento_confirmado),
        organizadores_ids: Array.isArray(detail.organizadores)
          ? detail.organizadores.map((u) => String(u.id))
          : [],
        funcionarios_ids: Array.isArray(detail.funcionarios)
          ? detail.funcionarios.map((u) => String(u.id))
          : [],
        imagem: null,
      });

      setCepLookup({
        loading: false,
        error: '',
        data: {
          street: detail.logradouro || '',
          neighborhood: detail.bairro || '',
          city: detail.cidade || '',
          state: detail.estado || '',
        },
      });
    } catch (err) {
      console.error('Erro ao carregar dados completos do evento', err);
      setEventoForm({
        nome: evento.nome || '',
        datetime_inicio: formatDateInput(evento.datetime_inicio),
        datetime_fim: formatDateInput(evento.datetime_fim),
        cep: '',
        numero: '',
        complemento: '',
        numero_pessoas: evento.numero_pessoas || 1,
        evento_confirmado: Boolean(evento.evento_confirmado),
        organizadores_ids: [],
        funcionarios_ids: [],
        imagem: null,
      });
      setCepLookup({ loading: false, error: '', data: null });
    }

    setAssociacoesExpanded(true);
    setOrganizadoresExpanded(true);
    setFuncionariosAssocExpanded(true);
    setOrganizadoresSearch('');
    setEventoModalOpen(true);
  };

  const validarCep = async (cepDigits) => {
    const normalized = String(cepDigits || '').replace(/\D/g, '');
    if (normalized.length !== 8) {
      setCepLookup({ loading: false, error: 'CEP deve conter 8 dígitos.', data: null });
      return false;
    }

    setCepLookup((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${normalized}`);
      if (!response.ok) {
        setCepLookup({ loading: false, error: 'CEP não encontrado.', data: null });
        return false;
      }
      const data = await response.json();
      setCepLookup({ loading: false, error: '', data });
      return true;
    } catch (err) {
      console.error('Erro ao validar CEP', err);
      setCepLookup({ loading: false, error: 'Não foi possível validar o CEP agora.', data: null });
      return false;
    }
  };

  const toggleEventoUsuario = (field, userId) => {
    const userIdStr = String(userId);
    setEventoForm((prev) => {
      const atual = Array.isArray(prev[field]) ? prev[field] : [];
      const existe = atual.includes(userIdStr);
      return {
        ...prev,
        [field]: existe ? atual.filter((id) => id !== userIdStr) : [...atual, userIdStr],
      };
    });
  };

  const saveEvento = async (e) => {
    e.preventDefault();
    setEventoSaving(true);
    setEventoError('');
    try {
      const cepDigits = (eventoForm.cep || '').replace(/\D/g, '');
      const cepValido = await validarCep(cepDigits);
      if (!cepValido) {
        setEventoError('Informe um CEP válido para continuar.');
        return;
      }

      const payload = new FormData();
      payload.append('nome', eventoForm.nome);
      payload.append('datetime_inicio', eventoForm.datetime_inicio);
      payload.append('datetime_fim', eventoForm.datetime_fim);
      payload.append('cep', cepDigits);
      payload.append('numero', eventoForm.numero || '');
      payload.append('complemento', eventoForm.complemento || '');
      payload.append('numero_pessoas', String(eventoForm.numero_pessoas || 1));
      payload.append('evento_confirmado', eventoForm.evento_confirmado ? 'true' : 'false');
      (eventoForm.organizadores_ids || []).forEach((id, index) => {
        payload.append(`organizadores_ids[${index}]`, id);
      });
      (eventoForm.funcionarios_ids || []).forEach((id, index) => {
        payload.append(`funcionarios_ids[${index}]`, id);
      });
      if (eventoForm.imagem instanceof File) {
        payload.append('imagem', eventoForm.imagem);
      }

      let savedEventoId = eventoEditing?.id || null;
      let savedEventoNome = eventoForm.nome;

      if (eventoEditing?.id) {
        await eventoCerimonialAPI.patch(eventoEditing.id, payload);
      } else {
        const createResponse = await eventoCerimonialAPI.create(payload);
        savedEventoId = createResponse?.data?.id || null;
        savedEventoNome = createResponse?.data?.nome || eventoForm.nome;

        if (savedEventoId) {
          try {
            await listaConvidadosCerimonialAPI.criarLista({
              evento: savedEventoId,
              titulo: `Lista de Convidados - ${savedEventoNome}`,
            });
          } catch (listErr) {
            // A API já cria automaticamente; este fallback evita inconsistências de ambiente.
            console.warn('Fallback de criação de lista não aplicado', listErr);
          }
        }
      }
      setEventoModalOpen(false);
      await loadEventos();
      await loadListasConvidados();
    } catch (err) {
      console.error('Erro ao salvar evento', err);
      setEventoError(err.response?.data?.error || 'Erro ao salvar evento.');
    } finally {
      setEventoSaving(false);
    }
  };

  const enderecoCompletoPreview = useMemo(() => {
    const dados = cepLookup.data;
    if (!dados) return '';

    const partes = [];
    const street = dados.street || '';
    const neighborhood = dados.neighborhood || '';
    const city = dados.city || '';
    const state = dados.state || '';
    const numero = eventoForm.numero || '';
    const complemento = eventoForm.complemento || '';
    const cep = (eventoForm.cep || '').replace(/\D/g, '');

    if (street) {
      partes.push(numero ? `${street}, ${numero}` : street);
    } else if (numero) {
      partes.push(`Número ${numero}`);
    }
    if (complemento) {
      partes.push(complemento);
    }
    if (neighborhood) {
      partes.push(neighborhood);
    }
    if (city && state) {
      partes.push(`${city} - ${state}`);
    } else if (city) {
      partes.push(city);
    }
    if (cep.length === 8) {
      partes.push(`CEP: ${cep.slice(0, 5)}-${cep.slice(5)}`);
    }

    return partes.join(', ');
  }, [cepLookup.data, eventoForm.numero, eventoForm.complemento, eventoForm.cep]);

  const deleteEvento = async (evento) => {
    if (!window.confirm(`Excluir evento "${evento.nome}"?`)) return;
    try {
      await eventoCerimonialAPI.delete(evento.id);
      await loadEventos();
      await loadListasConvidados();
    } catch (err) {
      console.error('Erro ao excluir evento', err);
      alert(err.response?.data?.error || 'Erro ao excluir evento.');
    }
  };

  const criarListaEvento = async (evento) => {
    try {
      await listaConvidadosCerimonialAPI.criarLista({
        evento: evento.id,
        titulo: `Lista de Convidados - ${evento.nome}`,
      });
      await loadListasConvidados();
      setListasExpandidas((prev) => ({ ...prev, [evento.id]: true }));
    } catch (err) {
      console.error('Erro ao criar lista de convidados', err);
      alert(err.response?.data?.error || 'Erro ao criar lista de convidados.');
    }
  };

  const openAddConvidado = (listaId) => {
    setConvidadoEditing(null);
    setConvidadoListaId(listaId);
    setConvidadoForm({ cpf: '', nome: '', email: '', vip: false, confirmado: false });
    setConvidadoRows([createConvidadoRow()]);
    setQtdAdicionarConvidados(1);
    setShowImportarConvidadoAnterior(false);
    setBuscaConvidadoAnterior('');
    setResultadosConvidadoAnterior([]);
    setConvidadoModalOpen(true);
  };

  const openEditConvidado = (listaId, convidado) => {
    setConvidadoEditing(convidado);
    setConvidadoListaId(listaId);
    setConvidadoForm({
      cpf: formatCpfValue(convidado.cpf || ''),
      nome: convidado.nome || '',
      email: convidado.email || '',
      vip: Boolean(convidado.vip),
      confirmado: Boolean(convidado.entrada_confirmada),
    });
    setConvidadoModalOpen(true);
  };

  const buscarNomePorCpf = async (cpfDigits) => {
    if (String(cpfDigits || '').length !== 11) return '';
    try {
      const resp = await listaConvidadosCerimonialAPI.buscarCpfSimples(cpfDigits);
      return resp?.data?.nome || '';
    } catch {
      return '';
    }
  };

  const preencherNomeConvidadoFormPorCpf = async () => {
    const cpfDigits = String(convidadoForm.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11 || String(convidadoForm.nome || '').trim()) return;
    const nome = await buscarNomePorCpf(cpfDigits);
    if (nome) {
      setConvidadoForm((prev) => ({ ...prev, nome }));
    }
  };

  const addConvidadoRow = () => {
    setConvidadoRows((prev) => [...prev, createConvidadoRow()]);
  };

  const addConvidadoRows = () => {
    const qtd = Number.isFinite(Number(qtdAdicionarConvidados)) ? Math.max(1, Number(qtdAdicionarConvidados)) : 1;
    setConvidadoRows((prev) => [...prev, ...Array.from({ length: qtd }, () => createConvidadoRow())]);
  };

  const removeConvidadoRow = (rowId) => {
    setConvidadoRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.rowId !== rowId);
    });
  };

  const updateConvidadoRow = (rowId, field, value) => {
    setConvidadoRows((prev) => prev.map((row) => {
      if (row.rowId !== rowId) return row;
      if (field === 'cpf') {
        return { ...row, cpf: formatCpfValue(value), encontrado: false, erro: '' };
      }
      return { ...row, [field]: value };
    }));
  };

  const preencherNomeConvidadoRowPorCpf = async (rowId) => {
    const row = convidadoRows.find((r) => r.rowId === rowId);
    if (!row) return;
    const cpfDigits = String(row.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11 || String(row.nome || '').trim()) return;

    setConvidadoRows((prev) => prev.map((r) => r.rowId === rowId ? { ...r, buscando: true } : r));
    const nome = await buscarNomePorCpf(cpfDigits);
    setConvidadoRows((prev) => prev.map((r) => {
      if (r.rowId !== rowId) return r;
      return {
        ...r,
        buscando: false,
        nome: nome || r.nome,
        encontrado: Boolean(nome),
      };
    }));
  };

  const handleConvidadoGridPaste = (rowId, startField, e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;

    const grid = parseClipboardGrid(text);
    if (!grid.length) return;

    const hasMatrixData = grid.length > 1 || (grid[0] && grid[0].length > 1);
    if (!hasMatrixData) return;

    e.preventDefault();

    const fieldOrder = ['cpf', 'nome', 'email', 'vip', 'confirmado'];
    const startFieldIndex = Math.max(0, fieldOrder.indexOf(startField));

    setConvidadoRows((prev) => {
      const startIndex = prev.findIndex((r) => r.rowId === rowId);
      const safeStart = startIndex >= 0 ? startIndex : 0;
      const next = [...prev];

      grid.forEach((cells, idx) => {
        if (isHeaderLine(cells) && startFieldIndex === 0) return;

        const targetIndex = safeStart + idx;
        while (targetIndex >= next.length) {
          next.push(createConvidadoRow());
        }

        const current = next[targetIndex] || createConvidadoRow();
        const updated = { ...current, buscando: false };

        cells.forEach((cell, cellIndex) => {
          const targetField = fieldOrder[startFieldIndex + cellIndex];
          if (!targetField) return;
          if (targetField === 'cpf') {
            updated.cpf = formatCpfValue(cell);
            return;
          }
          if (targetField === 'vip' || targetField === 'confirmado') {
            updated[targetField] = parseBooleanToken(cell);
            return;
          }
          updated[targetField] = String(cell || '').trim();
        });

        if (targetIndex < next.length) {
          next[targetIndex] = updated;
        }
      });

      return next;
    });
  };

  const handleBuscarConvidadoAnterior = async (value) => {
    setBuscaConvidadoAnterior(value);
    if (!String(value || '').trim()) {
      setResultadosConvidadoAnterior([]);
      return;
    }
    setBuscandoConvidadoAnterior(true);
    try {
      const resp = await listaConvidadosCerimonialAPI.buscarConvidadosAnteriores(String(value || '').trim());
      setResultadosConvidadoAnterior(Array.isArray(resp?.data) ? resp.data : []);
    } catch {
      setResultadosConvidadoAnterior([]);
    } finally {
      setBuscandoConvidadoAnterior(false);
    }
  };

  const handleImportarConvidadoAnterior = (convidado) => {
    const novo = {
      ...createConvidadoRow(),
      cpf: formatCpfValue(convidado?.cpf_formatado || convidado?.cpf || ''),
      nome: String(convidado?.nome || '').trim(),
      email: String(convidado?.email || '').trim(),
      vip: Boolean(convidado?.vip),
      confirmado: false,
      encontrado: true,
    };

    setConvidadoRows((prev) => {
      const emptyIndex = prev.findIndex((r) => !r.cpf && !r.nome && !r.email);
      if (emptyIndex < 0) return [...prev, novo];
      const next = [...prev];
      next[emptyIndex] = novo;
      return next;
    });
  };

  const saveConvidado = async (e) => {
    e.preventDefault();
    if (!convidadoListaId) return;

    setConvidadoSaving(true);
    try {
      const resolveConvidadoIdAtualizado = async (listaId, convidadoRef) => {
        try {
          const resp = await listaConvidadosCerimonialAPI.getLista(listaId);
          const convidadosAtualizados = Array.isArray(resp?.data?.convidados)
            ? resp.data.convidados
            : [];
          return findConvidadoByStableData(convidadosAtualizados, convidadoRef)?.id || null;
        } catch (resolveErr) {
          console.error('Erro ao recarregar lista para resolver convidado', resolveErr);
          return null;
        }
      };

      if (convidadoEditing?.id) {
        const cpfDigits = String(convidadoForm.cpf || '').replace(/\D/g, '');
        if (cpfDigits && cpfDigits.length !== 11) {
          alert('CPF inválido. Informe 11 dígitos ou deixe em branco.');
          return;
        }

        const payload = {
          cpf: cpfDigits,
          nome: String(convidadoForm.nome || '').trim(),
          email: String(convidadoForm.email || '').trim(),
          vip: Boolean(convidadoForm.vip),
        };
        let convidadoIdAlvo = convidadoEditing.id;
        try {
          await listaConvidadosCerimonialAPI.atualizarConvidado(convidadoListaId, convidadoIdAlvo, payload);
        } catch (updateErr) {
          if (updateErr?.response?.status !== 404) {
            throw updateErr;
          }
          const convidadoAtualizadoId = await resolveConvidadoIdAtualizado(convidadoListaId, convidadoEditing);
          if (!convidadoAtualizadoId || String(convidadoAtualizadoId) === String(convidadoIdAlvo)) {
            throw updateErr;
          }
          convidadoIdAlvo = convidadoAtualizadoId;
          await listaConvidadosCerimonialAPI.atualizarConvidado(convidadoListaId, convidadoIdAlvo, payload);
        }

        const confirmadoAtual = Boolean(convidadoEditing.entrada_confirmada);
        const confirmadoNovo = Boolean(convidadoForm.confirmado);
        if (confirmadoAtual !== confirmadoNovo) {
          await listaConvidadosCerimonialAPI.confirmarEntrada(convidadoListaId, convidadoIdAlvo);
        }
      } else {
        const rowsValidos = convidadoRows
          .map((row) => ({
            ...row,
            cpfDigits: String(row.cpf || '').replace(/\D/g, ''),
            nomeTrim: String(row.nome || '').trim(),
            emailTrim: String(row.email || '').trim(),
          }))
          .filter((row) => row.nomeTrim && row.emailTrim);

        const rowsComCpfInvalido = rowsValidos.filter(
          (row) => row.cpfDigits && row.cpfDigits.length !== 11,
        );
        if (rowsComCpfInvalido.length) {
          alert('Há convidados com CPF inválido. Informe 11 dígitos ou deixe o CPF em branco.');
          return;
        }

        if (!rowsValidos.length) {
          alert('Preencha nome e e-mail válidos para pelo menos um convidado.');
          return;
        }

        const erros = [];
        let sucessos = 0;
        for (const row of rowsValidos) {
          try {
            await listaConvidadosCerimonialAPI.adicionarConvidado(convidadoListaId, {
              cpf: row.cpfDigits,
              nome: row.nomeTrim,
              email: row.emailTrim,
              vip: Boolean(row.vip),
              confirmado: Boolean(row.confirmado),
            });
            sucessos += 1;
          } catch (rowErr) {
            const msg = rowErr?.response?.data?.error || `Erro ao adicionar ${row.nomeTrim || row.cpfDigits}`;
            erros.push(msg);
          }
        }

        if (erros.length) {
          alert(erros.join(' | '));
        }
        if (!sucessos) {
          return;
        }
      }
      setConvidadoModalOpen(false);
      await loadListasConvidados();
    } catch (err) {
      console.error('Erro ao salvar convidado', err);
      alert(err.response?.data?.error || 'Erro ao salvar convidado.');
    } finally {
      setConvidadoSaving(false);
    }
  };

  const deleteConvidado = async (listaId, convidado) => {
    if (!window.confirm(`Remover convidado "${convidado.nome}"?`)) return;
    try {
      const resolveConvidadoIdAtualizado = async () => {
        try {
          const resp = await listaConvidadosCerimonialAPI.getLista(listaId);
          const convidadosAtualizados = Array.isArray(resp?.data?.convidados)
            ? resp.data.convidados
            : [];
          return findConvidadoByStableData(convidadosAtualizados, convidado)?.id || null;
        } catch (resolveErr) {
          console.error('Erro ao recarregar lista para resolver convidado', resolveErr);
          return null;
        }
      };

      let convidadoIdAlvo = convidado.id;
      try {
        await listaConvidadosCerimonialAPI.removerConvidado(listaId, convidadoIdAlvo);
      } catch (removeErr) {
        if (removeErr?.response?.status !== 404) {
          throw removeErr;
        }
        const convidadoAtualizadoId = await resolveConvidadoIdAtualizado();
        if (!convidadoAtualizadoId || String(convidadoAtualizadoId) === String(convidadoIdAlvo)) {
          throw removeErr;
        }
        convidadoIdAlvo = convidadoAtualizadoId;
        await listaConvidadosCerimonialAPI.removerConvidado(listaId, convidadoIdAlvo);
      }

      await loadListasConvidados();
    } catch (err) {
      console.error('Erro ao remover convidado', err);
      alert(err.response?.data?.error || 'Erro ao remover convidado.');
    }
  };

  const enviarQrCodeConvidado = async (listaId, convidado) => {
    const resposta = String(convidado?.resposta_presenca || '').toLowerCase();
    if (resposta !== 'confirmado') {
      alert('O QR Code só pode ser enviado para convidados com presença confirmada.');
      return;
    }

    try {
      await listaConvidadosCerimonialAPI.enviarQrCode(listaId, convidado.id);
      alert('QR Code enviado com sucesso.');
    } catch (err) {
      console.error('Erro ao enviar QR Code do convidado', err);
      alert(err.response?.data?.error || 'Não foi possível enviar o QR Code agora.');
    }
  };

  const baixarQrCodeConvidado = async (convidado) => {
    const token = String(convidado?.qr_token || '').trim();
    if (!token) {
      toast?.push('QR Code indisponível para este convidado.', { type: 'error' });
      return;
    }

    try {
      const response = await listaConvidadosCerimonialAPI.downloadQrCode(token);
      const blob = response?.data instanceof Blob
        ? response.data
        : new Blob([response?.data], { type: 'image/png' });

      const disposition = response?.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^\";]+)\"?/i);
      let filename = `qrcode-${String(convidado?.nome || 'convidado').trim().replace(/\s+/g, '-').toLowerCase()}.png`;
      if (match) {
        try {
          filename = decodeURIComponent(match[1] || match[2] || filename);
        } catch {
          filename = match[1] || match[2] || filename;
        }
      }

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar QR Code do convidado', err);
      toast?.push(err.response?.data?.error || 'Não foi possível baixar o QR Code agora.', { type: 'error' });
    }
  };

  const getListaByEventoId = (eventoId) => {
    return listasConvidados.find((lista) => String(lista.evento) === String(eventoId));
  };

  const toggleListaConvidadosEvento = (eventoId) => {
    setListasExpandidas((prev) => ({
      ...prev,
      [eventoId]: !prev[eventoId],
    }));
  };

  const updateConvidadosSearchEvento = (eventoId, value) => {
    setConvidadosSearchPorEvento((prev) => ({
      ...prev,
      [eventoId]: value,
    }));
    setConvidadosPagePorEvento((prev) => ({
      ...prev,
      [eventoId]: 1,
    }));
  };

  const changeConvidadosPageEvento = (eventoId, nextPage, totalPages) => {
    const safeTotal = Math.max(1, Number(totalPages || 1));
    const safePage = Math.min(Math.max(1, Number(nextPage || 1)), safeTotal);
    setConvidadosPagePorEvento((prev) => ({
      ...prev,
      [eventoId]: safePage,
    }));
  };

  const toggleOrganizadoresEvento = async (eventoId) => {
    const proximoAberto = !organizadoresExpandidos[eventoId];
    setOrganizadoresExpandidos((prev) => ({
      ...prev,
      [eventoId]: proximoAberto,
    }));

    if (proximoAberto && !Object.prototype.hasOwnProperty.call(organizadoresPorEvento, eventoId)) {
      await loadOrganizadoresEvento(eventoId);
    }
  };

  const salvarOrganizadoresEvento = async (eventoId) => {
    const idsSelecionados = organizadoresSelecionadosPorEvento[eventoId] || [];
    setOrganizadoresSavingPorEvento((prev) => ({
      ...prev,
      [eventoId]: true,
    }));
    try {
      await eventoCerimonialAPI.patch(eventoId, {
        organizadores_ids: idsSelecionados,
      });
      await loadOrganizadoresEvento(eventoId);
      await loadEventos();
    } catch (err) {
      console.error('Erro ao salvar organizadores do evento', err);
      alert(err.response?.data?.error || 'Erro ao salvar organizadores do evento.');
    } finally {
      setOrganizadoresSavingPorEvento((prev) => ({
        ...prev,
        [eventoId]: false,
      }));
    }
  };

  const toggleFuncionariosEvento = async (eventoId) => {
    const proximoAberto = !funcionariosExpandidos[eventoId];
    setFuncionariosExpandidos((prev) => ({
      ...prev,
      [eventoId]: proximoAberto,
    }));

    if (proximoAberto && !Object.prototype.hasOwnProperty.call(funcionariosPorEvento, eventoId)) {
      await loadFuncionariosEvento(eventoId);
    }
  };

  const toggleDetalhesFuncionarioEvento = (eventoId, funcionarioId) => {
    setFuncionariosDetalhesExpandidosPorEvento((prev) => {
      const eventoKey = String(eventoId);
      const funcionarioKey = String(funcionarioId);
      const atuais = prev[eventoKey] || {};
      return {
        ...prev,
        [eventoKey]: {
          ...atuais,
          [funcionarioKey]: !atuais[funcionarioKey],
        },
      };
    });
  };

  const generateConviteOrganizador = async (eventoId, eventoNome = '') => {
    try {
      const response = await eventoCerimonialAPI.gerarConvite(eventoId, 'organizador');
      setConviteModal({
        open: true,
        data: {
          ...response.data,
          evento_nome: eventoNome || response?.data?.evento_nome || '',
        },
      });
    } catch (err) {
      console.error('Erro ao gerar convite', err);
      alert(err.response?.data?.error || 'Erro ao gerar convite.');
    }
  };

  const generateConviteRecepcao = async (eventoId, eventoNome = '') => {
    try {
      const response = await eventoCerimonialAPI.gerarConvite(eventoId, 'recepcao');
      setConviteModal({
        open: true,
        data: {
          ...response.data,
          evento_nome: eventoNome || response?.data?.evento_nome || '',
        },
      });
    } catch (err) {
      console.error('Erro ao gerar convite', err);
      alert(err.response?.data?.error || 'Erro ao gerar convite.');
    }
  };

  const copyInviteLink = async () => {
    const url = conviteModal?.data?.signup_url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copiado.');
    } catch {
      alert('Não foi possível copiar o link.');
    }
  };

  const saveInviteQrImage = async () => {
    const qrDataUrl = conviteModal?.data?.qr_code_data_url;
    if (!qrDataUrl) {
      alert('QR Code indisponível para download.');
      return;
    }

    const eventoNome = String(conviteModal?.data?.evento_nome || '').trim() || 'Evento';
    const tipoConvite = conviteModal?.data?.tipo === 'organizador' ? 'Organizador do Evento' : 'Recepção';

    const sanitizeFileName = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight) => {
      const words = String(text || '').split(/\s+/);
      const lines = [];
      let currentLine = '';

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = candidate;
        }
      });

      if (currentLine) lines.push(currentLine);
      lines.forEach((line, index) => {
        ctx.fillText(line, x, y + (index * lineHeight));
      });
      return lines.length;
    };

    try {
      const qrImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = qrDataUrl;
      });

      const padding = 24;
      const canvasWidth = Math.max(360, qrImage.width + (padding * 2));
      const maxTextWidth = canvasWidth - (padding * 2);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível');

      ctx.font = '700 20px Arial';
      const tituloHeight = 28;
      ctx.font = '600 15px Arial';
      const tipoHeight = 22;
      ctx.font = '600 16px Arial';
      const linhasEvento = Math.max(1, Math.ceil(ctx.measureText(`Evento: ${eventoNome}`).width / maxTextWidth));
      const eventoBlockHeight = linhasEvento * 22;

      const headerHeight = padding + tituloHeight + tipoHeight + eventoBlockHeight + 10;
      const footerHeight = padding;
      const canvasHeight = headerHeight + qrImage.height + footerHeight;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      let y = padding;
      ctx.fillStyle = '#111827';
      ctx.font = '700 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code de Convite', canvasWidth / 2, y);

      y += tituloHeight;
      ctx.fillStyle = '#334155';
      ctx.font = '600 15px Arial';
      ctx.fillText(tipoConvite, canvasWidth / 2, y);

      y += tipoHeight;
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 16px Arial';
      const eventoText = `Evento: ${eventoNome}`;
      drawWrappedText(ctx, eventoText, canvasWidth / 2, y, maxTextWidth, 22);

      const qrX = (canvasWidth - qrImage.width) / 2;
      const qrY = headerHeight;
      ctx.drawImage(qrImage, qrX, qrY, qrImage.width, qrImage.height);

      const link = document.createElement('a');
      const tipoSlug = conviteModal?.data?.tipo === 'organizador' ? 'organizador' : 'recepcao';
      const eventoSlug = sanitizeFileName(eventoNome || 'evento');
      link.download = `convite-${tipoSlug}-${eventoSlug}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Erro ao salvar imagem do QR Code', err);
      alert('Não foi possível salvar a imagem do QR Code.');
    }
  };

  const openAddFuncionario = (eventoId) => {
    setFuncionarioEventoSelecionadoId(String(eventoId));
    setFuncionarioEditing(null);
    setFuncionarioForm({
      is_recepcao: false,
      usuario: '',
      email: '',
      phone: '',
      usuario_is_active: false,
      nome: '',
      documento: '',
      funcoes_ids: [],
      horario_entrada: '',
      horario_saida: '',
      pagamento_realizado: false,
      valor_pagamento: '0.00',
    });
    setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: '' });
    loadFuncionariosCadastrados();
    loadFuncoesFesta();
    setFuncionarioModalOpen(true);
  };

  const openEditFuncionario = (eventoId, item) => {
    setFuncionarioEventoSelecionadoId(String(eventoId));
    setFuncionarioEditing(item);
    setFuncionarioForm({
      is_recepcao: Boolean(item.is_recepcao),
      usuario: item.usuario ? String(item.usuario) : '',
      email: item.usuario_email || '',
      phone: formatPhoneValue(item.usuario_phone || ''),
      usuario_is_active: item.usuario_ativo === null || item.usuario_ativo === undefined ? false : Boolean(item.usuario_ativo),
      nome: item.nome || '',
      documento: formatCpfValue(item.documento || ''),
      funcoes_ids: Array.isArray(item.funcoes) && item.funcoes.length > 0 ? [item.funcoes[0].id] : [],
      horario_entrada: formatDateInput(item.horario_entrada),
      horario_saida: formatDateInput(item.horario_saida),
      pagamento_realizado: Boolean(item.pagamento_realizado),
      valor_pagamento: String(item.valor_pagamento ?? '0.00'),
    });
    setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: '' });
    loadFuncionariosCadastrados();
    loadFuncoesFesta();
    setFuncionarioModalOpen(true);
  };

  const handleSelectFuncionarioCadastrado = (usuarioId) => {
    const selecionado = funcionariosCadastrados.find((u) => String(u.id) === String(usuarioId));
    if (!selecionado) {
      setFuncionarioForm((prev) => ({
        ...prev,
        usuario: '',
        usuario_is_active: prev.is_recepcao,
      }));
      return;
    }

    setFuncionarioForm((prev) => ({
      ...prev,
      usuario: String(selecionado.id),
      nome: selecionado.full_name || selecionado.username || prev.nome,
      documento: formatCpfValue(selecionado.cpf || prev.documento),
      email: selecionado.email || prev.email,
      phone: formatPhoneValue(selecionado.phone || prev.phone),
      usuario_is_active: Boolean(selecionado.is_active),
    }));
  };

  useEffect(() => {
    if (!funcionarioModalOpen) {
      setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: '' });
      return;
    }

    const podeValidarCpf = !funcionarioForm.usuario || Boolean(funcionarioEditing);
    if (!podeValidarCpf) {
      setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: '' });
      return;
    }

    const cpfDigits = String(funcionarioForm.documento || '').replace(/\D/g, '');
    if (!cpfDigits) {
      setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: '' });
      return;
    }

    if (cpfDigits.length < 11) {
      setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: '' });
      return;
    }

    if (!validateCPF(cpfDigits)) {
      setCpfUsoStatus({ checking: false, exists: false, invalid: true, message: 'CPF inválido.' });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCpfUsoStatus({ checking: true, exists: false, invalid: false, message: 'Validando CPF...' });
      try {
        const response = await eventoCerimonialAPI.listFuncionariosCadastrados({ q: cpfDigits });
        const lista = Array.isArray(response.data) ? response.data : [];
        const cpfJaExiste = lista.some((usuario) => {
          const usuarioId = String(usuario.id || '');
          const usuarioEdicaoId = String(funcionarioEditing?.usuario || '');
          if (usuarioEdicaoId && usuarioId && usuarioId === usuarioEdicaoId) {
            return false;
          }
          const docDigits = String(usuario.cpf || '').replace(/\D/g, '');
          return docDigits === cpfDigits;
        });

        if (cancelled) return;

        setCpfUsoStatus(
          cpfJaExiste
            ? { checking: false, exists: true, invalid: false, message: 'CPF já está sendo usado por um funcionário.' }
            : { checking: false, exists: false, invalid: false, message: 'CPF disponível na base de funcionários.' }
        );
      } catch {
        if (cancelled) return;
        setCpfUsoStatus({ checking: false, exists: false, invalid: false, message: 'Não foi possível validar o CPF agora.' });
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    funcionarioModalOpen,
    funcionarioForm.documento,
    funcionarioForm.usuario,
    funcionarioEditing,
  ]);

  const saveFuncionario = async (e) => {
    e.preventDefault();
    if (!funcionarioEventoSelecionadoId) return;
    setFuncionarioSaving(true);
    try {
      const validaCpfNoFormulario = !funcionarioForm.usuario || Boolean(funcionarioEditing);
      const cpfDigits = String(funcionarioForm.documento || '').replace(/\D/g, '');
      if (validaCpfNoFormulario && cpfDigits.length === 11 && !validateCPF(cpfDigits)) {
        alert('CPF inválido. Verifique os dígitos informados.');
        return;
      }

      if (validaCpfNoFormulario && cpfUsoStatus.exists) {
        alert('Este CPF já está sendo usado por um funcionário.');
        return;
      }

      const cadastroComUsuarioExistente = !funcionarioEditing?.id && Boolean(funcionarioForm.usuario);
      const payload = {
        usuario: funcionarioForm.usuario || null,
        nome: funcionarioForm.nome,
        documento: String(funcionarioForm.documento || '').replace(/\D/g, '').slice(0, 11),
        email: funcionarioForm.email,
        phone: String(funcionarioForm.phone || '').replace(/\D/g, '').slice(0, 11),
        is_recepcao: Boolean(funcionarioForm.is_recepcao),
        usuario_is_active: Boolean(funcionarioForm.usuario_is_active),
        funcoes_ids:
          funcionarioForm.is_recepcao || cadastroComUsuarioExistente
            ? []
            : (funcionarioForm.funcoes_ids || []),
        valor_pagamento: funcionarioForm.valor_pagamento || '0.00',
      };
      let response;
      if (funcionarioEditing?.id) {
        response = await eventoCerimonialAPI.patchFuncionario(funcionarioEventoSelecionadoId, funcionarioEditing.id, payload);
      } else {
        response = await eventoCerimonialAPI.addFuncionario(funcionarioEventoSelecionadoId, payload);
      }

      if (response?.data?.usuario_ativado) {
        if (response.data.usuario_email_enviado) {
          alert('Usuário ativado e nova senha enviada por e-mail.');
        } else {
          alert(`Usuário ativado, mas o envio de e-mail falhou${response.data.usuario_email_erro ? `: ${response.data.usuario_email_erro}` : '.'}`);
        }
      }

      setFuncionarioModalOpen(false);
      await loadFuncionariosEvento(funcionarioEventoSelecionadoId);
      await loadFuncionariosCadastrados();
    } catch (err) {
      console.error('Erro ao salvar funcionário', err);
      alert(err.response?.data?.error || 'Erro ao salvar funcionário.');
    } finally {
      setFuncionarioSaving(false);
    }
  };

  const deleteFuncionario = async (eventoId, item) => {
    if (!eventoId) return;
    if (!window.confirm(`Excluir funcionário "${item.nome}"?`)) return;
    try {
      await eventoCerimonialAPI.deleteFuncionario(eventoId, item.id);
      await loadFuncionariosEvento(eventoId);
    } catch (err) {
      console.error('Erro ao excluir funcionário', err);
      alert(err.response?.data?.error || 'Erro ao excluir funcionário.');
    }
  };

  const desfazerCheckoutRecepcao = async (eventoId, item) => {
    if (!eventoId || !item?.id || !item?.is_recepcao || !item?.horario_saida) return;
    if (!window.confirm(`Desfazer checkout de ${item.nome || 'funcionário'}?`)) return;
    try {
      await eventoCerimonialAPI.patchFuncionario(eventoId, item.id, {
        horario_saida: null,
      });
      await loadFuncionariosEvento(eventoId);
      toast?.push('Checkout desfeito com sucesso.', { type: 'success' });
    } catch (err) {
      console.error('Erro ao desfazer checkout', err);
      toast?.push(err.response?.data?.error || 'Não foi possível desfazer o checkout.', { type: 'error' });
    }
  };

  const desfazerCheckinRecepcao = async (eventoId, item) => {
    if (!eventoId || !item?.id || !item?.is_recepcao || !item?.horario_entrada) return;
    if (!window.confirm(`Desfazer check-in de ${item.nome || 'funcionário'}? Isso também remove o checkout.`)) return;
    try {
      await eventoCerimonialAPI.patchFuncionario(eventoId, item.id, {
        horario_entrada: null,
        horario_saida: null,
      });
      await loadFuncionariosEvento(eventoId);
      toast?.push('Check-in desfeito com sucesso.', { type: 'success' });
    } catch (err) {
      console.error('Erro ao desfazer check-in', err);
      toast?.push(err.response?.data?.error || 'Não foi possível desfazer o check-in.', { type: 'error' });
    }
  };

  const openCreateFuncaoFesta = () => {
    setFuncaoFestaEditing(null);
    setFuncaoFestaForm({ nome: '', ativo: true });
    setFuncaoFestaRows([createFuncaoFestaRow()]);
    setQtdAdicionarFuncoes(1);
    setFuncaoFestaModalOpen(true);
  };

  const openEditFuncaoFesta = (item) => {
    setFuncaoFestaEditing(item);
    setFuncaoFestaForm({
      nome: item.nome || '',
      ativo: Boolean(item.ativo),
    });
    setFuncaoFestaRows([createFuncaoFestaRow()]);
    setQtdAdicionarFuncoes(1);
    setFuncaoFestaModalOpen(true);
  };

  const addFuncaoFestaRow = () => {
    setFuncaoFestaRows((prev) => [...prev, createFuncaoFestaRow()]);
  };

  const addFuncaoFestaRows = () => {
    const qtd = Number.isFinite(Number(qtdAdicionarFuncoes)) ? Math.max(1, Number(qtdAdicionarFuncoes)) : 1;
    setFuncaoFestaRows((prev) => [...prev, ...Array.from({ length: qtd }, () => createFuncaoFestaRow())]);
  };

  const removeFuncaoFestaRow = (rowId) => {
    setFuncaoFestaRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.rowId !== rowId);
    });
  };

  const updateFuncaoFestaRow = (rowId, field, value) => {
    setFuncaoFestaRows((prev) => prev.map((row) => (
      row.rowId === rowId ? { ...row, [field]: value } : row
    )));
  };

  const handleFuncaoFestaGridPaste = (rowId, e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;

    const grid = parseClipboardGrid(text);
    const hasMatrixData = grid.length > 1 || (grid[0] && grid[0].length > 1);
    if (!hasMatrixData) return;

    e.preventDefault();

    setFuncaoFestaRows((prev) => {
      const startIndex = prev.findIndex((r) => r.rowId === rowId);
      const safeStart = startIndex >= 0 ? startIndex : 0;
      const next = [...prev];

      grid.forEach((cells, idx) => {
        const c0 = String(cells[0] || '').trim().toLowerCase();
        if (idx === 0 && (c0 === 'funcao' || c0 === 'função' || c0 === 'nome')) {
          return;
        }

        const targetIndex = safeStart + idx;
        while (targetIndex >= next.length) {
          next.push(createFuncaoFestaRow());
        }

        const current = next[targetIndex] || createFuncaoFestaRow();
        next[targetIndex] = {
          ...current,
          nome: String(cells[0] || '').trim(),
          ativo: parseAtivoToken(cells[1]),
        };
      });

      return next;
    });
  };

  const saveFuncaoFesta = async (e) => {
    e.preventDefault();
    setFuncaoFestaSaving(true);
    try {
      if (funcaoFestaEditing?.id) {
        const payload = {
          nome: funcaoFestaForm.nome,
          ativo: Boolean(funcaoFestaForm.ativo),
        };
        await eventoCerimonialAPI.patchFuncaoFesta(funcaoFestaEditing.id, payload);
      } else {
        const itens = funcaoFestaRows
          .map((row) => ({
            nome: String(row.nome || '').trim(),
            ativo: Boolean(row.ativo),
          }))
          .filter((row) => row.nome.length > 0);

        if (!itens.length) {
          alert('Preencha ao menos uma função para cadastrar.');
          return;
        }

        const response = await eventoCerimonialAPI.createFuncaoFesta({ itens });
        const erros = Array.isArray(response?.data?.errors) ? response.data.errors : [];
        if (erros.length) {
          alert(`Algumas funções não foram criadas: ${erros.map((err) => err.error).join(' | ')}`);
        }
      }

      setFuncaoFestaModalOpen(false);
      await loadFuncoesFesta(funcoesFestaSearch);
    } catch (err) {
      console.error('Erro ao salvar função', err);
      alert(err.response?.data?.error || 'Erro ao salvar função.');
    } finally {
      setFuncaoFestaSaving(false);
    }
  };

  const deleteFuncaoFesta = async (item) => {
    if (!item?.id) return;
    if (!window.confirm(`Excluir função "${item.nome}"?`)) return;
    try {
      await eventoCerimonialAPI.deleteFuncaoFesta(item.id);
      await loadFuncoesFesta(funcoesFestaSearch);
    } catch (err) {
      console.error('Erro ao excluir função', err);
      alert(err.response?.data?.error || 'Erro ao excluir função.');
    }
  };

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const renderEventos = () => (
    <>
      <div className="page-header" style={{ marginBottom: 10 }}>
        <div className="search-container">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Buscar eventos..."
              value={eventosSearch}
              onChange={(e) => setEventosSearch(e.target.value)}
            />
          </div>
        </div>

        <button className="add-button" type="button" onClick={openCreateEvento}>
          <FaPlus /> Novo Evento
        </button>
      </div>

      <div className="units-cards-grid">
        {eventosLoading ? (
          <div className="empty-state compact"><p>Carregando eventos...</p></div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="empty-state compact"><p>Nenhum evento encontrado.</p></div>
        ) : (
          eventosFiltrados.map((ev) => {
            const listaEvento = getListaByEventoId(ev.id);
            const convidadosSearch = String(convidadosSearchPorEvento[ev.id] || '');
            const convidadosFiltrados = (listaEvento?.convidados || []).filter((convidado) =>
              String(convidado?.nome || '').toLowerCase().includes(convidadosSearch.trim().toLowerCase())
            );
            const convidadosTotalPages = Math.max(1, Math.ceil(convidadosFiltrados.length / CONVIDADOS_PAGE_SIZE));
            const convidadosCurrentPageRaw = Number(convidadosPagePorEvento[ev.id] || 1);
            const convidadosCurrentPage = Math.min(Math.max(1, convidadosCurrentPageRaw), convidadosTotalPages);
            const convidadosSliceStart = (convidadosCurrentPage - 1) * CONVIDADOS_PAGE_SIZE;
            const convidadosPaginados = convidadosFiltrados.slice(
              convidadosSliceStart,
              convidadosSliceStart + CONVIDADOS_PAGE_SIZE
            );
            const listaAberta = Boolean(listasExpandidas[ev.id]);
            const organizadoresAberto = Boolean(organizadoresExpandidos[ev.id]);
            const organizadoresEvento = organizadoresPorEvento[ev.id] || [];
            const organizadoresLoading = Boolean(organizadoresLoadingPorEvento[ev.id]);
            const organizadoresSaving = Boolean(organizadoresSavingPorEvento[ev.id]);
            const organizadoresSelecionados = organizadoresSelecionadosPorEvento[ev.id] || [];
            const organizadoresOptionsMap = new Map();
            [...(organizadoresUsers || []), ...organizadoresEvento].forEach((u) => {
              const id = String(u.id || '');
              if (!id) return;
              const nome = u.full_name || u.username || `Usuário ${id}`;
              const telefone = u.phone ? ` - ${u.phone}` : '';
              organizadoresOptionsMap.set(id, {
                value: id,
                label: `${nome}${telefone}`,
              });
            });
            const organizadoresOptions = Array.from(organizadoresOptionsMap.values())
              .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
            const organizadoresSelecionadosOptions = organizadoresOptions
              .filter((opt) => organizadoresSelecionados.includes(opt.value));
            const funcionariosAberto = Boolean(funcionariosExpandidos[ev.id]);
            const funcionariosEvento = funcionariosPorEvento[ev.id] || [];
            const funcionariosLoading = Boolean(funcionariosLoadingPorEvento[ev.id]);

            return (
            <article key={ev.id} className="unit-card morador-record-card">
              <div className="unit-card__header">
                <div className="unit-card__header-left">
                  <span className="unit-card__title">{ev.nome}</span>
                </div>
                <div className="unit-card__header-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`unit-card__status-badge ${ev.evento_confirmado ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                    {ev.evento_confirmado ? 'Confirmado' : 'Pendente'}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditEvento(ev)}
                    aria-label="Editar evento"
                    title="Editar evento"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.55)',
                      background: 'rgba(255,255,255,0.16)',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>

              <div className="unit-card__summary">
                {ev.imagem_url && (
                  <div style={{ marginBottom: 10 }}>
                    <ProtectedImage
                      src={ev.imagem_url}
                      alt={`Imagem do evento ${ev.nome}`}
                      style={{
                        width: '100%',
                        height: 160,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </div>
                )}
                <div className="unit-card__info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem' }}>
                  <div className="unit-card__info-item">
                    <span className="unit-card__info-label">Início</span>
                    <span className="unit-card__info-value">{formatDateTime(ev.datetime_inicio)}</span>
                  </div>
                  <div className="unit-card__info-item">
                    <span className="unit-card__info-label">Fim</span>
                    <span className="unit-card__info-value">{formatDateTime(ev.datetime_fim)}</span>
                  </div>
                  <div className="unit-card__info-item">
                    <span className="unit-card__info-label">Pessoas</span>
                    <span className="unit-card__info-value">{ev.numero_pessoas || '-'}</span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#64748b', marginBottom: 3 }}>
                    Local
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                    {ev.endereco_completo || '-'}
                  </div>
                </div>
              </div>

              <div style={eventoActionGridStyle}>
                <button
                  type="button"
                  className="add-button"
                  title="Organizadores"
                  aria-label="Organizadores"
                  onClick={() => toggleOrganizadoresEvento(ev.id)}
                  style={eventoToggleButtonStyle(organizadoresAberto, {
                    bgActive: '#2563eb',
                    color: '#2563eb',
                    border: '#bfdbfe',
                  })}
                >
                  <FaUserFriends />
                </button>
                <button
                  type="button"
                  className="add-button"
                  onClick={() => toggleListaConvidadosEvento(ev.id)}
                  title={listaAberta ? 'Ocultar lista de convidados' : 'Abrir lista de convidados'}
                  aria-label={listaAberta ? 'Ocultar lista de convidados' : 'Abrir lista de convidados'}
                  style={eventoToggleButtonStyle(listaAberta, {
                    bgActive: '#0f766e',
                    color: '#0f766e',
                    border: '#99f6e4',
                  })}
                >
                  <FaClipboardList />
                </button>
                <button
                  type="button"
                  className="add-button"
                  onClick={() => toggleFuncionariosEvento(ev.id)}
                  title={funcionariosAberto ? 'Ocultar funcionários' : 'Mostrar funcionários'}
                  aria-label={funcionariosAberto ? 'Ocultar funcionários' : 'Mostrar funcionários'}
                  style={eventoToggleButtonStyle(funcionariosAberto, {
                    bgActive: '#6d28d9',
                    color: '#6d28d9',
                    border: '#ddd6fe',
                  })}
                >
                  {funcionariosAberto ? <FaEyeSlash /> : <FaUsers />}
                </button>
                <button
                  type="button"
                  className="add-button"
                  onClick={() => deleteEvento(ev)}
                  title="Excluir evento"
                  aria-label="Excluir evento"
                  style={{ ...eventoActionButtonBaseStyle, background: '#b91c1c' }}
                >
                  <FaTrash />
                </button>
              </div>

              {organizadoresAberto && (
                <div style={{ marginTop: 14, border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                      Organizadores do Evento
                    </div>
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => generateConviteOrganizador(ev.id, ev.nome)}
                      style={{ padding: '6px 10px', background: '#1f3a68' }}
                    >
                      <FaQrcode /> QR novo organizador
                    </button>
                  </div>

                  {organizadoresLoading ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Carregando organizadores...</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <Select
                          isMulti
                          options={organizadoresOptions}
                          value={organizadoresSelecionadosOptions}
                          placeholder="Buscar e selecionar organizadores..."
                          noOptionsMessage={() => 'Nenhum organizador encontrado'}
                          onChange={(selectedOptions) => {
                            const ids = Array.isArray(selectedOptions)
                              ? selectedOptions.map((opt) => String(opt.value))
                              : [];
                            setOrganizadoresSelecionadosPorEvento((prev) => ({
                              ...prev,
                              [ev.id]: ids,
                            }));
                          }}
                          classNamePrefix="select"
                        />
                        <button
                          type="button"
                          className="add-button"
                          onClick={() => salvarOrganizadoresEvento(ev.id)}
                          disabled={organizadoresSaving}
                          style={{ padding: '8px 12px', background: '#2563eb', opacity: organizadoresSaving ? 0.7 : 1, width: 'fit-content' }}
                        >
                          {organizadoresSaving ? 'Salvando...' : 'Salvar seleção'}
                        </button>
                      </div>

                      <div style={{ color: '#334155', fontSize: 13 }}>
                        Selecionados: <strong>{organizadoresSelecionados.length}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {listaAberta && (
                <div style={{ marginTop: 14, border: '1px solid #dbeafe', background: '#f8fbff', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                      {listaEvento?.titulo || 'Lista de Convidados'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ color: '#334155', fontSize: 13 }}>
                        Total: <strong>{listaEvento?.total_convidados ?? 0}</strong>
                      </div>
                      {listaEvento && (
                        <button
                          type="button"
                          className="add-button"
                          onClick={() => openAddConvidado(listaEvento.id)}
                          style={{ padding: '6px 10px', background: '#1e40af' }}
                        >
                          <FaPlus /> Convidado
                        </button>
                      )}
                    </div>
                  </div>

                  {listaConvidadosLoading ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Carregando convidados...</p>
                  ) : !listaEvento ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <p style={{ margin: 0, color: '#64748b' }}>Nenhuma lista criada para este evento.</p>
                      <div>
                        <button
                          type="button"
                          className="add-button"
                          onClick={() => criarListaEvento(ev)}
                          style={{ padding: '7px 11px', background: '#1e40af' }}
                        >
                          <FaPlus /> Criar lista agora
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-wrapper" style={{ minWidth: 240, flex: '1 1 240px' }}>
                          <FaSearch className="search-icon" />
                          <input
                            className="search-input"
                            type="text"
                            placeholder="Buscar convidado por nome..."
                            value={convidadosSearch}
                            onChange={(e) => updateConvidadosSearchEvento(ev.id, e.target.value)}
                          />
                        </div>
                        <div style={{ color: '#475569', fontSize: 12 }}>
                          Mostrando {convidadosPaginados.length} de {convidadosFiltrados.length}
                        </div>
                      </div>

                      {convidadosFiltrados.length === 0 ? (
                        <p style={{ margin: 0, color: '#64748b' }}>
                          {convidadosSearch.trim() ? 'Nenhum convidado encontrado para a busca.' : 'Lista sem convidados no momento.'}
                        </p>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {convidadosPaginados.map((c) => {
                              const podeEnviarQr = String(c.resposta_presenca || '').toLowerCase() === 'confirmado';
                              return (
                                <div
                                  key={c.id}
                                  style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    padding: '10px 12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 10,
                                    background: c.vip ? '#fffbeb' : '#fff',
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {c.nome}
                                    {c.vip && (
                                      <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 999, fontSize: 11, padding: '2px 8px' }}>
                                        VIP
                                      </span>
                                    )}
                                  </div>

                                  <div className="actions-column" style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="edit-button"
                                      onClick={() => openEditConvidado(listaEvento.id, c)}
                                      title="Editar convidado"
                                      aria-label="Editar convidado"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      type="button"
                                      className="save-button"
                                      onClick={() => enviarQrCodeConvidado(listaEvento.id, c)}
                                      disabled={!podeEnviarQr}
                                      style={!podeEnviarQr ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                      title={podeEnviarQr ? 'Enviar QR Code por e-mail' : 'Disponível somente para presença confirmada'}
                                      aria-label="Enviar QR Code"
                                    >
                                      <FaQrcode />
                                    </button>
                                    <button
                                      type="button"
                                      className="save-button"
                                      onClick={() => baixarQrCodeConvidado(c)}
                                      disabled={!c.qr_token}
                                      style={!c.qr_token ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                      title={c.qr_token ? 'Baixar QR Code' : 'QR Code indisponível'}
                                      aria-label="Baixar QR Code"
                                    >
                                      <FaDownload />
                                    </button>
                                    <button
                                      type="button"
                                      className="delete-button"
                                      onClick={() => deleteConvidado(listaEvento.id, c)}
                                      title="Excluir convidado"
                                      aria-label="Excluir convidado"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {convidadosTotalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <button
                                type="button"
                                className="add-button"
                                style={{ padding: '6px 10px' }}
                                disabled={convidadosCurrentPage <= 1}
                                onClick={() => changeConvidadosPageEvento(ev.id, convidadosCurrentPage - 1, convidadosTotalPages)}
                              >
                                Anterior
                              </button>

                              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                Página {convidadosCurrentPage} de {convidadosTotalPages}
                              </span>

                              <button
                                type="button"
                                className="add-button"
                                style={{ padding: '6px 10px' }}
                                disabled={convidadosCurrentPage >= convidadosTotalPages}
                                onClick={() => changeConvidadosPageEvento(ev.id, convidadosCurrentPage + 1, convidadosTotalPages)}
                              >
                                Próxima
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {funcionariosAberto && (
                <div style={{ marginTop: 14, border: '1px solid #e9d5ff', background: '#faf5ff', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: '#5b21b6' }}>
                      Lista de Funcionários
                    </div>
                    <button type="button" className="add-button" onClick={() => openAddFuncionario(ev.id)} style={{ padding: '6px 10px', background: '#5b21b6' }}>
                      <FaPlus /> Novo Funcionário
                    </button>
                  </div>

                  {funcionariosLoading ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Carregando funcionários...</p>
                  ) : funcionariosEvento.length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Nenhum funcionário cadastrado para este evento.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {funcionariosEvento.map((item) => {
                        const primeiroNome = getPrimeiroNome(item.nome || item.usuario_nome);
                        const funcaoPrincipal = getFuncaoPrincipalFuncionario(item);
                        const detalhesAbertos = Boolean(
                          funcionariosDetalhesExpandidosPorEvento[String(ev.id)]?.[String(item.id)]
                        );

                        return (
                          <div
                            key={item.id}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: 8,
                              padding: '10px 12px',
                              background: '#fff',
                              display: 'grid',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="expand-button"
                                  onClick={() => toggleDetalhesFuncionarioEvento(ev.id, item.id)}
                                  title={detalhesAbertos ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                  aria-label={detalhesAbertos ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                                >
                                  {detalhesAbertos ? '▾' : '▸'}
                                </button>
                                <span style={{ fontWeight: 700, color: '#111827' }}>{primeiroNome}</span>
                                <span
                                  style={{
                                    color: '#5b21b6',
                                    background: '#ede9fe',
                                    border: '1px solid #ddd6fe',
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                  }}
                                >
                                  {funcaoPrincipal}
                                </span>
                              </div>

                              <div className="actions-column" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="edit-button"
                                  onClick={() => openEditFuncionario(ev.id, item)}
                                  title="Editar funcionário"
                                  aria-label="Editar funcionário"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  type="button"
                                  className="delete-button"
                                  onClick={() => deleteFuncionario(ev.id, item)}
                                  title="Excluir funcionário"
                                  aria-label="Excluir funcionário"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>

                            {detalhesAbertos && (
                              <div
                                style={{
                                  borderTop: '1px solid #f1f5f9',
                                  paddingTop: 8,
                                  color: '#6b7280',
                                  fontSize: 13,
                                  display: 'grid',
                                  gap: 4,
                                }}
                              >
                                <div>Nome completo: {item.nome || '-'}</div>
                                <div>Documento: {item.documento_mascarado || item.documento || '-'}</div>
                                <div>
                                  Funções: {Array.isArray(item.funcoes) && item.funcoes.length > 0 ? item.funcoes.map((f) => f.nome).join(', ') : (item.funcao || '-')}
                                </div>
                                <div>Entrada: {formatDateTime(item.horario_entrada)} • Saída: {formatDateTime(item.horario_saida)}</div>
                                {item.is_recepcao && (item.horario_entrada || item.horario_saida) && (
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                    <button
                                      type="button"
                                      className="add-button"
                                      style={{ padding: '6px 10px', background: '#7c3aed' }}
                                      disabled={!item.horario_saida}
                                      onClick={() => desfazerCheckoutRecepcao(ev.id, item)}
                                      title="Desfazer checkout da recepção"
                                    >
                                      Desfazer checkout
                                    </button>
                                    <button
                                      type="button"
                                      className="add-button"
                                      style={{ padding: '6px 10px', background: '#5b21b6' }}
                                      disabled={!item.horario_entrada}
                                      onClick={() => desfazerCheckinRecepcao(ev.id, item)}
                                      title="Desfazer check-in da recepção"
                                    >
                                      Desfazer check-in
                                    </button>
                                  </div>
                                )}
                                <div>Valor: {formatCurrency(item.valor_pagamento)} • {item.pagamento_realizado ? 'Pago' : 'Pendente'}</div>
                                {item.usuario_ativo !== null && item.usuario_ativo !== undefined && (
                                  <div style={{ color: item.usuario_ativo ? '#166534' : '#92400e', fontWeight: 600 }}>
                                    Usuário: {item.usuario_ativo ? 'Ativo' : 'Inativo'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
          })
        )}
      </div>
    </>
  );

  const renderOrganizadoresCadastro = () => {
    return (
      <>
        <div className="page-header">
          <div className="page-actions">
            <button
              ref={addOrganizadorButtonRef}
              className="add-button"
              onClick={() => setShowAddOrganizadorCadastro(true)}
            >
              <FaPlus /> Novo Organizador de Evento
            </button>
          </div>

          <div className="search-container">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Buscar organizadores..."
                value={organizadoresCadastroSearch}
                onChange={(e) => {
                  setOrganizadoresCadastroSearch(e.target.value);
                  setOrganizadoresCadastroPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <UsersCards
          users={organizadoresCadastro}
          loading={organizadoresCadastroLoading}
          userType="cerimonialista"
          currentPage={organizadoresCadastroPage}
          totalPages={organizadoresCadastroTotalPages}
          onPageChange={setOrganizadoresCadastroPage}
          onSave={(id, data) => handleSaveUsuarioCadastro('organizadores_evento', id, data)}
          onResetPassword={(id) => {
            const target = organizadoresCadastro.find((u) => u.id === id);
            handleResetPasswordUsuarioCadastro(id, target?.username);
          }}
          onDelete={(u) => handleDeactivateUsuarioCadastro('organizadores_evento', u)}
        />

        {showAddOrganizadorCadastro && (
          <AddUserDropdown
            onClose={() => setShowAddOrganizadorCadastro(false)}
            onSuccess={() => {
              setShowAddOrganizadorCadastro(false);
              loadOrganizadoresCadastro(1, organizadoresCadastroSearch);
            }}
            triggerRef={addOrganizadorButtonRef}
            userType="organizador_evento"
            position="center"
          />
        )}
      </>
    );
  };

  const renderFuncionariosCadastro = () => {
    return (
      <>
        <div className="page-header">
          <div className="page-actions">
            <button
              ref={addFuncionarioButtonRef}
              className="add-button"
              onClick={() => setShowAddFuncionarioCadastro(true)}
            >
              <FaPlus /> Novo Funcionário
            </button>
          </div>

          <div className="search-container">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Buscar funcionários..."
                value={funcionariosCadastroSearch}
                onChange={(e) => {
                  setFuncionariosCadastroSearch(e.target.value);
                  setFuncionariosCadastroPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <UsersCards
          users={funcionariosCadastro}
          loading={funcionariosCadastroLoading}
          userType="cerimonialista"
          currentPage={funcionariosCadastroPage}
          totalPages={funcionariosCadastroTotalPages}
          onPageChange={setFuncionariosCadastroPage}
          onSave={(id, data) => handleSaveUsuarioCadastro('recepcao', id, data)}
          onResetPassword={(id) => {
            const target = funcionariosCadastro.find((u) => u.id === id);
            handleResetPasswordUsuarioCadastro(id, target?.username);
          }}
          onDelete={(u) => handleDeactivateUsuarioCadastro('recepcao', u)}
        />

        {showAddFuncionarioCadastro && (
          <AddUserDropdown
            onClose={() => setShowAddFuncionarioCadastro(false)}
            onSuccess={() => {
              setShowAddFuncionarioCadastro(false);
              loadFuncionariosCadastro(1, funcionariosCadastroSearch);
            }}
            triggerRef={addFuncionarioButtonRef}
            userType="recepcao"
            position="center"
          />
        )}
      </>
    );
  };

  const renderFuncoesFestaCadastro = () => {
    const funcoesFestaColumns = [
      {
        key: 'nome',
        header: 'Função',
      },
      {
        key: 'ativo',
        header: 'Status',
        render: (value) => (
          <span style={{
            padding: '3px 9px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            color: value ? '#166534' : '#92400e',
            background: value ? '#dcfce7' : '#fef3c7',
          }}>
            {value ? 'Ativa' : 'Inativa'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Criado em',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'updated_at',
        header: 'Atualizado em',
        render: (value) => formatDateTime(value),
      },
      {
        key: 'actions',
        header: 'Ações',
        render: (value, row) => (
          <div className="actions-column">
            <button
              type="button"
              className="edit-button"
              onClick={() => openEditFuncaoFesta(row)}
              title="Editar função"
            >
              <FaEdit />
            </button>
            <button
              type="button"
              className="delete-button"
              onClick={() => deleteFuncaoFesta(row)}
              title="Excluir função"
            >
              <FaTrash />
            </button>
          </div>
        ),
      },
    ];

    return (
      <>
        <div className="page-header">
          <div className="page-actions">
            <button className="add-button" onClick={openCreateFuncaoFesta}>
              <FaPlus /> Nova Função
            </button>
          </div>

          <div className="search-container">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Buscar funções..."
                value={funcoesFestaSearch}
                onChange={(e) => setFuncoesFestaSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <GenericTable
          columns={funcoesFestaColumns}
          data={funcoesFesta}
          loading={funcoesFestaLoading}
          totalPages={1}
          currentPage={1}
          onPageChange={() => {}}
          className="full-width-table allow-horizontal-scroll"
          hideEditButton
          titleColumnKey="nome"
        />
      </>
    );
  };

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        {activeTab === 'eventos' && renderEventos()}
        {activeTab === 'organizadores_evento' && renderOrganizadoresCadastro()}
        {activeTab === 'funcionarios' && renderFuncionariosCadastro()}
        {activeTab === 'funcoes_festa' && renderFuncoesFestaCadastro()}

        {resetInfo.show && (
          <PasswordResetModal
            title={resetInfo.title}
            subtitle={resetInfo.subtitle}
            message={resetInfo.message}
            onClose={() =>
              setResetInfo({ show: false, title: '', subtitle: '', message: '' })
            }
          />
        )}

        {eventoModalOpen && (
          <div className="modal-overlay" onClick={() => setEventoModalOpen(false)}>
            <div className="modal-container" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{eventoEditing ? 'Editar Evento' : 'Novo Evento'}</h2>
                <button className="modal-close" onClick={() => setEventoModalOpen(false)}><FaTimes /></button>
              </div>
              <form onSubmit={saveEvento}>
                <div className="modal-content">
                  <div className="form-group">
                    <label>Nome</label>
                    <input value={eventoForm.nome} onChange={(e) => setEventoForm((p) => ({ ...p, nome: e.target.value }))} required />
                  </div>
                  <div
                    style={{
                      border: '1px solid #dbeafe',
                      background: '#f8fbff',
                      borderRadius: 10,
                      padding: '10px 12px',
                      marginBottom: 10,
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ color: '#1f2937' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>Status do Evento</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Defina se o evento está confirmado para operação.</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={eventoForm.evento_confirmado}
                          onChange={(e) => setEventoForm((p) => ({ ...p, evento_confirmado: e.target.checked }))}
                          style={{ width: 18, height: 18 }}
                        />
                        <span
                          style={{
                            borderRadius: 999,
                            padding: '4px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: eventoForm.evento_confirmado ? '#166534' : '#92400e',
                            background: eventoForm.evento_confirmado ? '#dcfce7' : '#fef3c7',
                          }}
                        >
                          {eventoForm.evento_confirmado ? 'Confirmado' : 'Pendente'}
                        </span>
                      </div>
                    </label>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Data/Hora início</label>
                      <input type="datetime-local" value={eventoForm.datetime_inicio} onChange={(e) => setEventoForm((p) => ({ ...p, datetime_inicio: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Data/Hora fim</label>
                      <input type="datetime-local" value={eventoForm.datetime_fim} onChange={(e) => setEventoForm((p) => ({ ...p, datetime_fim: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>CEP</label>
                      <input
                        value={formatCepValue(eventoForm.cep)}
                        onChange={(e) => {
                          const cepValue = e.target.value.replace(/\D/g, '').slice(0, 8);
                          setEventoForm((p) => ({ ...p, cep: cepValue }));
                          if (cepLookup.error) {
                            setCepLookup((prev) => ({ ...prev, error: '' }));
                          }
                        }}
                        onBlur={() => validarCep(eventoForm.cep)}
                        placeholder="00000-000"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Número</label>
                      <input value={eventoForm.numero} onChange={(e) => setEventoForm((p) => ({ ...p, numero: e.target.value }))} required />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Complemento</label>
                      <input value={eventoForm.complemento} onChange={(e) => setEventoForm((p) => ({ ...p, complemento: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Número de pessoas</label>
                      <input type="number" min="1" value={eventoForm.numero_pessoas} onChange={(e) => setEventoForm((p) => ({ ...p, numero_pessoas: e.target.value }))} required />
                    </div>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: 13, marginBottom: 4 }}>Endereço completo do evento</div>
                    {cepLookup.loading ? (
                      <div style={{ color: '#64748b', fontSize: 13 }}>Validando CEP...</div>
                    ) : cepLookup.error ? (
                      <div style={{ color: '#dc2626', fontSize: 13 }}>{cepLookup.error}</div>
                    ) : (
                      <div style={{ color: '#0f172a', fontSize: 13 }}>{enderecoCompletoPreview || 'Informe um CEP válido para visualizar o endereço completo.'}</div>
                    )}
                  </div>

                  <div style={{ border: '1px solid #d1d5db', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setAssociacoesExpanded((v) => !v)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        background: '#f8fafc',
                        color: '#1f2937',
                        padding: '10px 12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {associacoesExpanded ? 'Ocultar' : 'Mostrar'} associação de organizadores e funcionários (opcional) • Org: {eventoForm.organizadores_ids.length} • Func: {eventoForm.funcionarios_ids.length}
                    </button>

                    {associacoesExpanded && (
                      <div style={{ padding: 12, display: 'grid', gap: 10 }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setOrganizadoresExpanded((v) => !v)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 'none',
                              background: '#fff',
                              color: '#1f2937',
                              padding: '9px 11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Organizadores ({eventoForm.organizadores_ids.length})
                          </button>
                          {organizadoresExpanded && (
                            <div style={{ borderTop: '1px solid #e2e8f0', padding: 10, display: 'grid', gap: 8 }}>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <input
                                  value={organizadoresSearch}
                                  onChange={(e) => setOrganizadoresSearch(e.target.value)}
                                  placeholder="Buscar organizador..."
                                  style={{
                                    flex: 1,
                                    minWidth: 190,
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    padding: '8px 10px',
                                  }}
                                />
                                <button
                                  type="button"
                                  className="add-button"
                                  onClick={() => {
                                    if (!eventoEditing?.id) {
                                      alert('Salve o evento primeiro para gerar o QR de convite do organizador.');
                                      return;
                                    }
                                    generateConviteOrganizador(eventoEditing.id, eventoEditing?.nome || eventoForm.nome);
                                  }}
                                  style={{ padding: '8px 12px', background: '#1f3a68' }}
                                >
                                  <FaQrcode /> QR novo organizador
                                </button>
                              </div>

                              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 6 }}>
                              {organizadoresUsers.length === 0 ? (
                                <div style={{ color: '#64748b', fontSize: 13 }}>Nenhum organizador encontrado.</div>
                              ) : (
                                organizadoresFiltrados.map((u) => (
                                  <label key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#1f2937' }}>
                                    <input
                                      type="checkbox"
                                      checked={eventoForm.organizadores_ids.includes(String(u.id))}
                                      onChange={() => toggleEventoUsuario('organizadores_ids', u.id)}
                                    />
                                    <span>{u.full_name || u.username}</span>
                                  </label>
                                ))
                              )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setFuncionariosAssocExpanded((v) => !v)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 'none',
                              background: '#fff',
                              color: '#1f2937',
                              padding: '9px 11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Funcionários ({eventoForm.funcionarios_ids.length})
                          </button>
                          {funcionariosAssocExpanded && (
                            <div style={{ borderTop: '1px solid #e2e8f0', padding: 10, maxHeight: 180, overflowY: 'auto', display: 'grid', gap: 6 }}>
                              {recepcaoUsers.length === 0 ? (
                                <div style={{ color: '#64748b', fontSize: 13 }}>Nenhum usuário de recepção encontrado.</div>
                              ) : (
                                recepcaoUsers.map((u) => (
                                  <label key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#1f2937' }}>
                                    <input
                                      type="checkbox"
                                      checked={eventoForm.funcionarios_ids.includes(String(u.id))}
                                      onChange={() => toggleEventoUsuario('funcionarios_ids', u.id)}
                                    />
                                    <span>{u.full_name || u.username}</span>
                                  </label>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Imagem</label>
                    <input type="file" accept="image/*" onChange={(e) => setEventoForm((p) => ({ ...p, imagem: e.target.files?.[0] || null }))} />
                  </div>

                  {eventoError && <p style={{ color: '#dc2626', margin: 0 }}>{eventoError}</p>}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  background: '#fff',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 2,
                }}>
                  <button
                    type="button"
                    onClick={() => setEventoModalOpen(false)}
                    style={{
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#374151',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={eventoSaving}
                    style={{
                      border: 'none',
                      background: '#0f766e',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 700,
                      cursor: eventoSaving ? 'not-allowed' : 'pointer',
                      opacity: eventoSaving ? 0.7 : 1,
                    }}
                  >
                    {eventoSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {conviteModal.open && (
          <div className="modal-overlay" onClick={() => setConviteModal({ open: false, data: null })}>
            <div className="modal-container" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>QR Code de Convite</h2>
                <button className="modal-close" onClick={() => setConviteModal({ open: false, data: null })}><FaTimes /></button>
              </div>
              <div className="modal-content" style={{ textAlign: 'center' }}>
                <p style={{ color: '#475569', marginTop: 0 }}>
                  {conviteModal?.data?.tipo === 'organizador' ? 'Convite para Organizador do Evento' : 'Convite para Recepção'}
                </p>
                {conviteModal?.data?.evento_nome && (
                  <p style={{ color: '#0f172a', fontWeight: 700, marginTop: -6, marginBottom: 10 }}>
                    {conviteModal.data.evento_nome}
                  </p>
                )}
                {conviteModal?.data?.qr_code_data_url && (
                  <img src={conviteModal.data.qr_code_data_url} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 8 }} />
                )}
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <input value={conviteModal?.data?.signup_url || ''} readOnly style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8 }} />
                  <button type="button" className="add-button" onClick={saveInviteQrImage} style={{ padding: '8px 12px', background: '#0f766e' }}>
                    <FaDownload /> Salvar imagem
                  </button>
                  <button type="button" className="add-button" onClick={copyInviteLink} style={{ padding: '8px 12px' }}>
                    <FaCopy /> Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {funcionarioModalOpen && (
          <div className="modal-overlay" onClick={() => setFuncionarioModalOpen(false)}>
            <div className="modal-container" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{funcionarioEditing ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
                <button className="modal-close" onClick={() => setFuncionarioModalOpen(false)}><FaTimes /></button>
              </div>
              <form onSubmit={saveFuncionario}>
                <div className="modal-content">
                  <div className="form-group">
                    <label>Funcionário já cadastrado</label>
                    <select value={funcionarioForm.usuario} onChange={(e) => handleSelectFuncionarioCadastrado(e.target.value)}>
                      <option value="">Adicionar novo funcionário</option>
                      {funcionariosCadastrados.map((u) => (
                        <option key={u.id} value={u.id}>
                          {(u.full_name || u.username)}
                          {u.is_recepcao ? ' • recepção' : ''}
                          {u.is_active ? ' (ativo)' : ' (inativo)'}
                        </option>
                      ))}
                    </select>
                    {funcionariosCadastradosLoading && (
                      <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Carregando cadastrados...</div>
                    )}
                  </div>

                  <div className="cerimonialista-checkbox-row">
                    <label className="cerimonialista-checkbox-pill">
                      <input
                        type="checkbox"
                        checked={Boolean(funcionarioForm.is_recepcao)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFuncionarioForm((prev) => ({
                            ...prev,
                            is_recepcao: checked,
                            usuario_is_active: checked ? true : prev.usuario_is_active,
                          }));
                        }}
                      />
                      Funcionário da recepção
                    </label>

                    <label className="cerimonialista-checkbox-pill">
                      <input
                        type="checkbox"
                        checked={Boolean(funcionarioForm.usuario_is_active)}
                        onChange={(e) => setFuncionarioForm((p) => ({ ...p, usuario_is_active: e.target.checked }))}
                      />
                      Usuário ativo no sistema
                    </label>
                  </div>

                  {(!funcionarioEditing && Boolean(funcionarioForm.usuario)) ? null : (
                    <>
                      <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Nome</label>
                          <input value={funcionarioForm.nome} onChange={(e) => setFuncionarioForm((p) => ({ ...p, nome: e.target.value }))} required />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>CPF</label>
                          <input
                            value={funcionarioForm.documento}
                            onChange={(e) => setFuncionarioForm((p) => ({
                              ...p,
                              documento: formatCpfValue(e.target.value),
                            }))}
                            placeholder="000.000.000-00"
                            required
                          />
                          {cpfUsoStatus.message && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: cpfUsoStatus.checking
                                  ? '#475569'
                                    : (cpfUsoStatus.exists || cpfUsoStatus.invalid)
                                    ? '#b91c1c'
                                    : '#047857',
                                  fontWeight: (cpfUsoStatus.exists || cpfUsoStatus.invalid) ? 700 : 600,
                              }}
                            >
                              {cpfUsoStatus.message}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>E-mail {funcionarioForm.is_recepcao ? '(obrigatório)' : '(opcional)'}</label>
                          <input
                            type="email"
                            value={funcionarioForm.email}
                            onChange={(e) => setFuncionarioForm((p) => ({ ...p, email: e.target.value }))}
                            required={Boolean(funcionarioForm.is_recepcao)}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Telefone</label>
                          <input
                            value={funcionarioForm.phone}
                            onChange={(e) => setFuncionarioForm((p) => ({
                              ...p,
                              phone: formatPhoneValue(e.target.value),
                            }))}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-row">
                    {(!funcionarioForm.is_recepcao && (!funcionarioForm.usuario || Boolean(funcionarioEditing))) && (
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Função no evento</label>
                        {funcoesFestaLoading ? (
                          <div style={{ color: '#64748b', fontSize: 13, padding: '10px 0' }}>Carregando funções...</div>
                        ) : funcoesFesta.filter((f) => f.ativo).length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: 13, padding: '10px 0' }}>Nenhuma função ativa cadastrada.</div>
                        ) : (
                          <Select
                            classNamePrefix="funcao-evento-select"
                            options={funcoesFesta
                              .filter((f) => f.ativo)
                              .map((f) => ({ value: f.id, label: f.nome }))}
                            value={
                              funcoesFesta
                                .filter((f) => f.ativo)
                                .map((f) => ({ value: f.id, label: f.nome }))
                                .find((opt) => String(opt.value) === String(funcionarioForm.funcoes_ids[0] || '')) || null
                            }
                            onChange={(selectedOption) => {
                              const value = Number(selectedOption?.value);
                              setFuncionarioForm((prev) => ({
                                ...prev,
                                funcoes_ids: Number.isFinite(value) && value > 0 ? [value] : [],
                              }));
                            }}
                            placeholder="Selecione uma função"
                            isClearable
                            noOptionsMessage={() => 'Nenhuma função ativa cadastrada'}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                minHeight: 40,
                                height: 40,
                                borderColor: state.isFocused ? '#2abb98' : '#c7d3e3',
                                boxShadow: state.isFocused ? '0 0 0 3px rgba(42, 187, 152, 0.2)' : 'none',
                                backgroundColor: '#f8fafc',
                                borderRadius: 8,
                                '&:hover': {
                                  borderColor: '#2abb98',
                                },
                              }),
                              valueContainer: (base) => ({
                                ...base,
                                height: 40,
                                padding: '0 12px',
                              }),
                              input: (base) => ({
                                ...base,
                                margin: 0,
                                padding: 0,
                              }),
                              indicatorsContainer: (base) => ({
                                ...base,
                                height: 40,
                              }),
                              clearIndicator: (base) => ({
                                ...base,
                                padding: 8,
                              }),
                              dropdownIndicator: (base) => ({
                                ...base,
                                padding: 8,
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 1200,
                                borderRadius: 8,
                                overflow: 'hidden',
                              }),
                              option: (base, state) => ({
                                ...base,
                                backgroundColor: state.isSelected
                                  ? '#2abb98'
                                  : state.isFocused
                                    ? '#ecfdf5'
                                    : '#ffffff',
                                color: state.isSelected ? '#ffffff' : '#0f172a',
                                cursor: 'pointer',
                              }),
                            }}
                          />
                        )}
                      </div>
                    )}

                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Valor a pagar</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrency(funcionarioForm.valor_pagamento)}
                        onChange={(e) => setFuncionarioForm((p) => ({
                          ...p,
                          valor_pagamento: parseCurrencyInputToDecimalString(e.target.value),
                        }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 16px 16px 16px',
                  background: '#fff',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 2,
                }}>
                  <button
                    type="button"
                    onClick={() => setFuncionarioModalOpen(false)}
                    style={{
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#374151',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={funcionarioSaving}
                    style={{
                      border: 'none',
                      background: '#0f766e',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 700,
                      cursor: funcionarioSaving ? 'not-allowed' : 'pointer',
                      opacity: funcionarioSaving ? 0.7 : 1,
                    }}
                  >
                    {funcionarioSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {funcaoFestaModalOpen && (
          <div className="modal-overlay" onClick={() => setFuncaoFestaModalOpen(false)}>
            <div className="modal-container" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{funcaoFestaEditing ? 'Editar Função da Festa' : 'Nova Função da Festa'}</h2>
                <button className="modal-close" onClick={() => setFuncaoFestaModalOpen(false)}><FaTimes /></button>
              </div>

              <form onSubmit={saveFuncaoFesta}>
                <div className="modal-content">
                  {funcaoFestaEditing ? (
                    <>
                      <div className="form-group">
                        <label>Nome da Função</label>
                        <input
                          value={funcaoFestaForm.nome}
                          onChange={(e) => setFuncaoFestaForm((p) => ({ ...p, nome: e.target.value }))}
                          required
                        />
                      </div>

                      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(funcaoFestaForm.ativo)}
                          onChange={(e) => setFuncaoFestaForm((p) => ({ ...p, ativo: e.target.checked }))}
                        />
                        Função ativa
                      </label>
                    </>
                  ) : (
                    <>
                      <p style={funcaoFestaModalStyles.helperText}>
                        Dica: cole várias linhas do Excel no campo Nome.
                      </p>

                      <div style={funcaoFestaModalStyles.gridWrapper}>
                        <div style={funcaoFestaModalStyles.row}>
                          <span style={funcaoFestaModalStyles.colLabel}>Nome da função</span>
                          <span style={funcaoFestaModalStyles.colLabel}>Ativa</span>
                          <span />
                        </div>

                        {funcaoFestaRows.map((row) => (
                          <div key={row.rowId} style={funcaoFestaModalStyles.row}>
                            <input
                              value={row.nome}
                              onChange={(e) => updateFuncaoFestaRow(row.rowId, 'nome', e.target.value)}
                              onPaste={(e) => handleFuncaoFestaGridPaste(row.rowId, e)}
                              placeholder="Ex.: Garçom"
                              style={funcaoFestaModalStyles.input}
                            />
                            <label style={{ display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="checkbox"
                                checked={Boolean(row.ativo)}
                                onChange={(e) => updateFuncaoFestaRow(row.rowId, 'ativo', e.target.checked)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeFuncaoFestaRow(row.rowId)}
                              style={{
                                ...funcaoFestaModalStyles.removeBtn,
                                cursor: funcaoFestaRows.length <= 1 ? 'default' : 'pointer',
                                opacity: funcaoFestaRows.length <= 1 ? 0.35 : 1,
                              }}
                              disabled={funcaoFestaRows.length <= 1}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={funcaoFestaModalStyles.addRowSection}>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={qtdAdicionarFuncoes}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setQtdAdicionarFuncoes(Number.isFinite(v) && v > 0 ? v : 1);
                          }}
                          style={{ ...funcaoFestaModalStyles.input, width: 70, textAlign: 'center' }}
                        />
                        <button type="button" className="add-button" onClick={addFuncaoFestaRows} style={{ padding: '7px 10px' }}>
                          <FaPlus /> Adicionar {qtdAdicionarFuncoes > 1 ? `${qtdAdicionarFuncoes} linhas` : 'linha'}
                        </button>
                        <button type="button" className="add-button" onClick={addFuncaoFestaRow} style={{ padding: '7px 10px' }}>
                          <FaPlus /> Nova linha
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  background: '#fff',
                }}>
                  <button
                    type="button"
                    onClick={() => setFuncaoFestaModalOpen(false)}
                    style={{
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#374151',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={funcaoFestaSaving}
                    style={{
                      border: 'none',
                      background: '#0f766e',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 700,
                      cursor: funcaoFestaSaving ? 'not-allowed' : 'pointer',
                      opacity: funcaoFestaSaving ? 0.7 : 1,
                    }}
                  >
                    {funcaoFestaSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {convidadoModalOpen && (
          <div className="modal-overlay" onClick={() => setConvidadoModalOpen(false)}>
            <div className="modal-container" style={{ maxWidth: 700, width: '95vw' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!convidadoEditing && <FaUserFriends style={{ color: '#2abb98' }} />}
                  {convidadoEditing ? 'Editar Convidado' : 'Novo Convidado'}
                </h2>
                <button className="modal-close" onClick={() => setConvidadoModalOpen(false)}><FaTimes /></button>
              </div>
              <form onSubmit={saveConvidado}>
                <div className="modal-content" style={{ padding: '1.25rem' }}>
                  {convidadoEditing ? (
                    <>
                      <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>CPF (opcional)</label>
                          <input
                            value={formatCpfValue(convidadoForm.cpf)}
                            onChange={(e) => setConvidadoForm((p) => ({ ...p, cpf: formatCpfValue(e.target.value) }))}
                            onBlur={preencherNomeConvidadoFormPorCpf}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Nome</label>
                          <input
                            value={convidadoForm.nome}
                            onChange={(e) => setConvidadoForm((p) => ({ ...p, nome: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>E-mail (opcional)</label>
                        <input
                          type="email"
                          value={convidadoForm.email}
                          onChange={(e) => setConvidadoForm((p) => ({ ...p, email: e.target.value }))}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={convidadoForm.vip}
                            onChange={(e) => setConvidadoForm((p) => ({ ...p, vip: e.target.checked }))}
                          />
                          Convidado VIP
                        </label>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={convidadoForm.confirmado}
                            onChange={(e) => setConvidadoForm((p) => ({ ...p, confirmado: e.target.checked }))}
                          />
                          Confirmado
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' }}>
                          Convidados
                        </p>
                        <p style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 0, marginBottom: '0.6rem' }}>
                          Dica: cole várias linhas do Excel diretamente no campo CPF, Nome ou E-mail.
                        </p>

                        <div className="convidado-col-header">
                          <div className="col-cpf"><span style={convidadoModalStyles.label}>CPF (opcional)</span></div>
                          <div className="col-nome"><span style={convidadoModalStyles.label}>Nome</span></div>
                          <div className="col-email"><span style={convidadoModalStyles.label}>E-mail (opcional)</span></div>
                          <div className="col-vip"><span style={convidadoModalStyles.label}>VIP</span></div>
                          <div className="col-confirmado"><span style={convidadoModalStyles.label}>Confirmado</span></div>
                          <div className="col-acao" />
                        </div>

                        {convidadoRows.map((row, idx) => (
                          <div key={row.rowId} className="convidado-row">
                            <div className="col-cpf">
                              <input
                                value={row.cpf}
                                onChange={(e) => updateConvidadoRow(row.rowId, 'cpf', e.target.value)}
                                onBlur={() => preencherNomeConvidadoRowPorCpf(row.rowId)}
                                onPaste={(e) => handleConvidadoGridPaste(row.rowId, 'cpf', e)}
                                placeholder="000.000.000-00"
                                style={{
                                  ...convidadoModalStyles.input,
                                  borderColor: row.encontrado
                                    ? '#2abb98'
                                    : row.cpf.replace(/\D/g, '').length === 11 && !row.encontrado && !row.buscando
                                      ? '#f59e0b'
                                      : '#d1d5db',
                                }}
                              />
                            </div>

                            <div className="col-nome">
                              <input
                                value={row.nome}
                                onChange={(e) => updateConvidadoRow(row.rowId, 'nome', e.target.value)}
                                onPaste={(e) => handleConvidadoGridPaste(row.rowId, 'nome', e)}
                                placeholder={row.buscando ? 'Buscando nome...' : `Nome do convidado ${idx + 1}`}
                                disabled={row.buscando}
                                style={{
                                  ...convidadoModalStyles.input,
                                  paddingRight: row.encontrado ? 28 : undefined,
                                  color: row.encontrado ? '#059669' : '#111827',
                                  background: row.buscando ? '#f9fafb' : '#fff',
                                }}
                                required
                              />
                              {row.encontrado && (
                                <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: '#2abb98', fontSize: '0.8rem' }}>
                                  ✓
                                </span>
                              )}
                            </div>

                            <div className="col-email">
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) => updateConvidadoRow(row.rowId, 'email', e.target.value)}
                                onPaste={(e) => handleConvidadoGridPaste(row.rowId, 'email', e)}
                                placeholder="E-mail (opcional)"
                                style={convidadoModalStyles.input}
                              />
                            </div>

                            <div className="col-vip">
                              <input
                                type="checkbox"
                                checked={Boolean(row.vip)}
                                onChange={(e) => updateConvidadoRow(row.rowId, 'vip', e.target.checked)}
                              />
                            </div>

                            <div className="col-confirmado">
                              <input
                                type="checkbox"
                                checked={Boolean(row.confirmado)}
                                onChange={(e) => updateConvidadoRow(row.rowId, 'confirmado', e.target.checked)}
                              />
                            </div>

                            <div className="col-acao">
                              <button
                                type="button"
                                onClick={() => removeConvidadoRow(row.rowId)}
                                disabled={convidadoRows.length === 1}
                                title="Remover linha"
                                style={{
                                  ...convidadoModalStyles.iconBtn,
                                  opacity: convidadoRows.length === 1 ? 0.25 : 1,
                                  cursor: convidadoRows.length === 1 ? 'default' : 'pointer',
                                }}
                              >
                                <FaTrash size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginBottom: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportarConvidadoAnterior((v) => !v);
                            setBuscaConvidadoAnterior('');
                            setResultadosConvidadoAnterior([]);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: 0,
                          }}
                        >
                          📋 {showImportarConvidadoAnterior ? 'Fechar busca de listas anteriores' : 'Importar convidado de lista anterior'}
                        </button>

                        {showImportarConvidadoAnterior && (
                          <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                            <input
                              type="text"
                              placeholder="Buscar por nome ou CPF..."
                              value={buscaConvidadoAnterior}
                              onChange={(e) => handleBuscarConvidadoAnterior(e.target.value)}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none', marginBottom: 6 }}
                              autoFocus
                            />
                            {buscandoConvidadoAnterior && (
                              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Buscando...</p>
                            )}
                            {!buscandoConvidadoAnterior && buscaConvidadoAnterior && resultadosConvidadoAnterior.length === 0 && (
                              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Nenhum convidado encontrado.</p>
                            )}
                            {!buscaConvidadoAnterior && (
                              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Digite o nome ou CPF para buscar.</p>
                            )}

                            {resultadosConvidadoAnterior.map((c, idx) => (
                              <div key={`${c.cpf || 'sem-cpf'}-${c.nome}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 4 }}>
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.nome}
                                  </div>
                                  <div style={{ fontSize: '0.73rem', color: '#6b7280' }}>
                                    {c.cpf_formatado}{c.email ? ` • ${c.email}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleImportarConvidadoAnterior(c)}
                                  style={{ background: '#2abb98', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0, marginLeft: 8 }}
                                >
                                  + Adicionar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="add-row-section" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={qtdAdicionarConvidados}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setQtdAdicionarConvidados(Number.isFinite(v) && v > 0 ? v : 1);
                          }}
                          className="add-row-count"
                          style={{ ...convidadoModalStyles.input, width: 64, textAlign: 'center', paddingLeft: 8 }}
                        />
                        <button type="button" onClick={addConvidadoRows} style={convidadoModalStyles.btnSec}>
                          <FaPlus size={11} style={{ marginRight: 5 }} />
                          Adicionar {qtdAdicionarConvidados > 1 ? `${qtdAdicionarConvidados} linhas` : 'linha'}
                        </button>
                        <button type="button" onClick={addConvidadoRow} style={convidadoModalStyles.btnSec}>
                          <FaPlus size={11} style={{ marginRight: 5 }} />
                          Nova linha
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  borderTop: '1px solid #e2e8f0',
                  padding: '12px 16px',
                  background: '#fff',
                }}>
                  <button
                    type="button"
                    onClick={() => setConvidadoModalOpen(false)}
                    style={{
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#374151',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={convidadoSaving}
                    style={{
                      border: 'none',
                      background: '#1e40af',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '9px 14px',
                      fontWeight: 700,
                      cursor: convidadoSaving ? 'not-allowed' : 'pointer',
                      opacity: convidadoSaving ? 0.7 : 1,
                    }}
                  >
                    {convidadoSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CerimonialistaPage;
