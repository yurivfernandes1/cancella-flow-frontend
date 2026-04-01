import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedImage from '../components/common/ProtectedImage';
import AddUserDropdown from '../components/Users/AddUserDropdown';
import UsersCards from '../components/Users/UsersCards';
import PasswordResetModal from '../components/Users/PasswordResetModal';
import api, {
  eventoCerimonialAPI,
  listaConvidadosCerimonialAPI,
} from '../services/api';
import { generateStrongPassword } from '../utils/passwordGenerator';
import '../styles/UsersPage.css';
import '../styles/UnitsCards.css';
import '../styles/Modal.css';
import {
  FaCopy,
  FaDownload,
  FaEye,
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

function CerimonialistaPage() {
  const { user } = useAuth();
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

  const [organizadoresPorEvento, setOrganizadoresPorEvento] = useState({});
  const [organizadoresLoadingPorEvento, setOrganizadoresLoadingPorEvento] = useState({});
  const [organizadoresExpandidos, setOrganizadoresExpandidos] = useState({});
  const [organizadoresBuscaPorEvento, setOrganizadoresBuscaPorEvento] = useState({});
  const [organizadoresSelecionadosPorEvento, setOrganizadoresSelecionadosPorEvento] = useState({});
  const [organizadoresSavingPorEvento, setOrganizadoresSavingPorEvento] = useState({});

  const [funcionariosPorEvento, setFuncionariosPorEvento] = useState({});
  const [funcionariosLoadingPorEvento, setFuncionariosLoadingPorEvento] = useState({});
  const [funcionariosExpandidos, setFuncionariosExpandidos] = useState({});
  const [funcionarioEventoSelecionadoId, setFuncionarioEventoSelecionadoId] = useState('');
  const [funcionarioModalOpen, setFuncionarioModalOpen] = useState(false);
  const [funcionarioEditing, setFuncionarioEditing] = useState(null);
  const [funcionarioSaving, setFuncionarioSaving] = useState(false);
  const [recepcaoUsers, setRecepcaoUsers] = useState([]);
  const [funcionarioForm, setFuncionarioForm] = useState({
    usuario: '',
    nome: '',
    documento: '',
    funcao: '',
    horario_entrada: '',
    horario_saida: '',
    pagamento_realizado: false,
    valor_pagamento: '0.00',
  });

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
      setRecepcaoUsers(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Erro ao carregar usuários de recepção', e);
      setRecepcaoUsers([]);
    }
  };

  const loadOrganizadoresUsers = async () => {
    try {
      const response = await api.get('/access/users/simple/', { params: { type: 'organizadores_evento' } });
      setOrganizadoresUsers(Array.isArray(response.data) ? response.data : []);
    } catch (e) {
      console.error('Erro ao carregar usuários organizadores', e);
      setOrganizadoresUsers([]);
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
      if (convidadoEditing?.id) {
        const payload = {
          cpf: String(convidadoForm.cpf || '').replace(/\D/g, ''),
          nome: String(convidadoForm.nome || '').trim(),
          email: String(convidadoForm.email || '').trim(),
          vip: Boolean(convidadoForm.vip),
        };
        await listaConvidadosCerimonialAPI.atualizarConvidado(convidadoListaId, convidadoEditing.id, payload);

        const confirmadoAtual = Boolean(convidadoEditing.entrada_confirmada);
        const confirmadoNovo = Boolean(convidadoForm.confirmado);
        if (confirmadoAtual !== confirmadoNovo) {
          await listaConvidadosCerimonialAPI.confirmarEntrada(convidadoListaId, convidadoEditing.id);
        }
      } else {
        const rowsValidos = convidadoRows
          .map((row) => ({
            ...row,
            cpfDigits: String(row.cpf || '').replace(/\D/g, ''),
            nomeTrim: String(row.nome || '').trim(),
            emailTrim: String(row.email || '').trim(),
          }))
          .filter((row) => row.cpfDigits.length === 11 && row.nomeTrim);

        if (!rowsValidos.length) {
          alert('Preencha CPF e nome válidos para pelo menos um convidado.');
          return;
        }

        const erros = [];
        let sucessos = 0;
        for (const row of rowsValidos) {
          try {
            const createResp = await listaConvidadosCerimonialAPI.adicionarConvidado(convidadoListaId, {
              cpf: row.cpfDigits,
              nome: row.nomeTrim,
              email: row.emailTrim,
              vip: Boolean(row.vip),
            });
            sucessos += 1;
            if (row.confirmado && createResp?.data?.id) {
              await listaConvidadosCerimonialAPI.confirmarEntrada(convidadoListaId, createResp.data.id);
            }
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
      await listaConvidadosCerimonialAPI.removerConvidado(listaId, convidado.id);
      await loadListasConvidados();
    } catch (err) {
      console.error('Erro ao remover convidado', err);
      alert(err.response?.data?.error || 'Erro ao remover convidado.');
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

  const toggleOrganizadorSelecionado = (eventoId, userId) => {
    const id = String(userId);
    setOrganizadoresSelecionadosPorEvento((prev) => {
      const atual = Array.isArray(prev[eventoId]) ? prev[eventoId] : [];
      const existe = atual.includes(id);
      return {
        ...prev,
        [eventoId]: existe ? atual.filter((x) => x !== id) : [...atual, id],
      };
    });
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
      usuario: '',
      nome: '',
      documento: '',
      funcao: '',
      horario_entrada: '',
      horario_saida: '',
      pagamento_realizado: false,
      valor_pagamento: '0.00',
    });
    setFuncionarioModalOpen(true);
  };

  const openEditFuncionario = (eventoId, item) => {
    setFuncionarioEventoSelecionadoId(String(eventoId));
    setFuncionarioEditing(item);
    setFuncionarioForm({
      usuario: item.usuario ? String(item.usuario) : '',
      nome: item.nome || '',
      documento: item.documento || '',
      funcao: item.funcao || '',
      horario_entrada: formatDateInput(item.horario_entrada),
      horario_saida: formatDateInput(item.horario_saida),
      pagamento_realizado: Boolean(item.pagamento_realizado),
      valor_pagamento: String(item.valor_pagamento ?? '0.00'),
    });
    setFuncionarioModalOpen(true);
  };

  const saveFuncionario = async (e) => {
    e.preventDefault();
    if (!funcionarioEventoSelecionadoId) return;
    setFuncionarioSaving(true);
    try {
      const payload = {
        usuario: funcionarioForm.usuario || null,
        nome: funcionarioForm.nome,
        documento: funcionarioForm.documento,
        funcao: funcionarioForm.funcao,
        horario_entrada: funcionarioForm.horario_entrada || null,
        horario_saida: funcionarioForm.horario_saida || null,
        pagamento_realizado: Boolean(funcionarioForm.pagamento_realizado),
        valor_pagamento: funcionarioForm.valor_pagamento || '0.00',
      };
      if (funcionarioEditing?.id) {
        await eventoCerimonialAPI.patchFuncionario(funcionarioEventoSelecionadoId, funcionarioEditing.id, payload);
      } else {
        await eventoCerimonialAPI.addFuncionario(funcionarioEventoSelecionadoId, payload);
      }
      setFuncionarioModalOpen(false);
      await loadFuncionariosEvento(funcionarioEventoSelecionadoId);
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
            const listaAberta = Boolean(listasExpandidas[ev.id]);
            const organizadoresAberto = Boolean(organizadoresExpandidos[ev.id]);
            const organizadoresEvento = organizadoresPorEvento[ev.id] || [];
            const organizadoresLoading = Boolean(organizadoresLoadingPorEvento[ev.id]);
            const organizadoresSaving = Boolean(organizadoresSavingPorEvento[ev.id]);
            const organizadoresBusca = organizadoresBuscaPorEvento[ev.id] || '';
            const organizadoresSelecionados = organizadoresSelecionadosPorEvento[ev.id] || [];
            const organizadoresSistemaFiltrados = (organizadoresUsers || []).filter((u) => {
              const q = organizadoresBusca.trim().toLowerCase();
              if (!q) return true;
              return (
                (u.full_name || '').toLowerCase().includes(q) ||
                (u.username || '').toLowerCase().includes(q)
              );
            });
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
                  title={listaAberta ? 'Ocultar convidados' : 'Mostrar convidados'}
                  aria-label={listaAberta ? 'Ocultar convidados' : 'Mostrar convidados'}
                  style={eventoToggleButtonStyle(listaAberta, {
                    bgActive: '#0f766e',
                    color: '#0f766e',
                    border: '#99f6e4',
                  })}
                >
                  {listaAberta ? <FaEyeSlash /> : <FaEye />}
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
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          value={organizadoresBusca}
                          onChange={(e) => setOrganizadoresBuscaPorEvento((prev) => ({ ...prev, [ev.id]: e.target.value }))}
                          placeholder="Buscar organizador existente..."
                          style={{
                            flex: 1,
                            minWidth: 200,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '8px 10px',
                          }}
                        />
                        <button
                          type="button"
                          className="add-button"
                          onClick={() => salvarOrganizadoresEvento(ev.id)}
                          disabled={organizadoresSaving}
                          style={{ padding: '8px 12px', background: '#2563eb', opacity: organizadoresSaving ? 0.7 : 1 }}
                        >
                          {organizadoresSaving ? 'Salvando...' : 'Salvar seleção'}
                        </button>
                      </div>

                      <div style={{ maxHeight: 170, overflowY: 'auto', display: 'grid', gap: 6 }}>
                        {organizadoresSistemaFiltrados.length === 0 ? (
                          <div style={{ color: '#64748b', fontSize: 13 }}>Nenhum organizador encontrado.</div>
                        ) : (
                          organizadoresSistemaFiltrados.map((orgSistema) => (
                            <label
                              key={orgSistema.id}
                              style={{
                                border: '1px solid #dbeafe',
                                borderRadius: 8,
                                padding: '7px 9px',
                                background: '#fff',
                                color: '#1e293b',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={organizadoresSelecionados.includes(String(orgSistema.id))}
                                onChange={() => toggleOrganizadorSelecionado(ev.id, orgSistema.id)}
                              />
                              <span style={{ fontWeight: 600 }}>{orgSistema.full_name || orgSistema.username}</span>
                            </label>
                          ))
                        )}
                      </div>

                      <div style={{ color: '#334155', fontSize: 13 }}>
                        Selecionados: <strong>{organizadoresSelecionados.length}</strong>
                      </div>

                      {organizadoresEvento.length > 0 && (
                        <div style={{ display: 'grid', gap: 6 }}>
                          <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>Atualmente associados</div>
                          {organizadoresEvento.map((org) => (
                            <div
                              key={org.id}
                              style={{
                                border: '1px solid #dbeafe',
                                borderRadius: 8,
                                padding: '8px 10px',
                                background: '#fff',
                                color: '#1e293b',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 8,
                                flexWrap: 'wrap',
                              }}
                            >
                              <strong>{org.full_name || org.username}</strong>
                              <span style={{ color: '#64748b', fontSize: 13 }}>{org.phone || '-'}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
                  ) : (listaEvento.convidados || []).length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b' }}>Lista sem convidados no momento.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {(listaEvento.convidados || []).map((c) => (
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
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {c.nome}
                              {c.vip && <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 999, fontSize: 11, padding: '2px 8px' }}>VIP</span>}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: 13 }}>CPF: {c.cpf_mascarado || '-'}</div>
                          </div>
                          <div style={{ color: c.entrada_confirmada ? '#059669' : '#9ca3af', fontWeight: 600, fontSize: 13 }}>
                            {c.entrada_confirmada ? 'Entrada confirmada' : 'Aguardando entrada'}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="add-button"
                              onClick={() => openEditConvidado(listaEvento.id, c)}
                              style={{ width: 32, height: 32, padding: 0 }}
                              title="Editar convidado"
                              aria-label="Editar convidado"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className="add-button"
                              onClick={() => deleteConvidado(listaEvento.id, c)}
                              style={{ width: 32, height: 32, padding: 0, background: '#b91c1c' }}
                              title="Excluir convidado"
                              aria-label="Excluir convidado"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
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
                      {funcionariosEvento.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: '10px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                            background: '#fff',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'grid', gap: 4 }}>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{item.nome}</div>
                            <div style={{ color: '#6b7280', fontSize: 13 }}>
                              Documento: {item.documento_mascarado || item.documento || '-'} • Função: {item.funcao || '-'}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: 13 }}>
                              Entrada: {formatDateTime(item.horario_entrada)} • Saída: {formatDateTime(item.horario_saida)}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: 13 }}>
                              Valor: {formatCurrency(item.valor_pagamento)} • {item.pagamento_realizado ? 'Pago' : 'Pendente'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button type="button" className="add-button" onClick={() => openEditFuncionario(ev.id, item)} style={{ padding: '6px 10px' }}>
                              <FaEdit /> Editar
                            </button>
                            <button type="button" className="add-button" onClick={() => deleteFuncionario(ev.id, item)} style={{ padding: '6px 10px', background: '#b91c1c' }}>
                              <FaTrash /> Excluir
                            </button>
                          </div>
                        </div>
                      ))}
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

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        {activeTab === 'eventos' && renderEventos()}
        {activeTab === 'organizadores_evento' && renderOrganizadoresCadastro()}
        {activeTab === 'funcionarios' && renderFuncionariosCadastro()}

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
                    <label>Usuário Recepção (opcional)</label>
                    <select value={funcionarioForm.usuario} onChange={(e) => setFuncionarioForm((p) => ({ ...p, usuario: e.target.value }))}>
                      <option value="">Não vincular</option>
                      {recepcaoUsers.map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Nome</label>
                      <input value={funcionarioForm.nome} onChange={(e) => setFuncionarioForm((p) => ({ ...p, nome: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Documento</label>
                      <input value={funcionarioForm.documento} onChange={(e) => setFuncionarioForm((p) => ({ ...p, documento: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Função</label>
                      <input value={funcionarioForm.funcao} onChange={(e) => setFuncionarioForm((p) => ({ ...p, funcao: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Valor a pagar</label>
                      <input type="number" step="0.01" min="0" value={funcionarioForm.valor_pagamento} onChange={(e) => setFuncionarioForm((p) => ({ ...p, valor_pagamento: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Horário de entrada</label>
                      <input type="datetime-local" value={funcionarioForm.horario_entrada} onChange={(e) => setFuncionarioForm((p) => ({ ...p, horario_entrada: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Horário de saída</label>
                      <input type="datetime-local" value={funcionarioForm.horario_saida} onChange={(e) => setFuncionarioForm((p) => ({ ...p, horario_saida: e.target.value }))} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={funcionarioForm.pagamento_realizado} onChange={(e) => setFuncionarioForm((p) => ({ ...p, pagamento_realizado: e.target.checked }))} />
                    Pagamento realizado
                  </label>
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
                          <label>CPF</label>
                          <input
                            value={formatCpfValue(convidadoForm.cpf)}
                            onChange={(e) => setConvidadoForm((p) => ({ ...p, cpf: formatCpfValue(e.target.value) }))}
                            onBlur={preencherNomeConvidadoFormPorCpf}
                            required
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
                          <div className="col-cpf"><span style={convidadoModalStyles.label}>CPF</span></div>
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
                                required
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

                            {resultadosConvidadoAnterior.map((c) => (
                              <div key={`${c.cpf}-${c.nome}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 4 }}>
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
