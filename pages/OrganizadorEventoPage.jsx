import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedImage from '../components/common/ProtectedImage';
import api, * as apiServices from '../services/api';
import '../styles/UsersPage.css';
import '../styles/UnitsCards.css';
import '../styles/Modal.css';
import {
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaPlus,
  FaSave,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUserFriends,
} from 'react-icons/fa';

const eventoCerimonialAPI = apiServices.eventoCerimonialAPI || {
  list: (params = {}) =>
    api.get('/cadastros/eventos-cerimonial/', { params }),
};

const listaConvidadosCerimonialAPI =
  apiServices.listaConvidadosCerimonialAPI || {
    getListas: (params = {}) =>
      api.get('/cadastros/listas-convidados-cerimonial/', { params }),
    criarLista: (data) =>
      api.post('/cadastros/listas-convidados-cerimonial/', data),
    finalizarLista: (listaId) =>
      api.post(`/cadastros/listas-convidados-cerimonial/${listaId}/finalizar/`),
    buscarCpfSimples: (cpf) =>
      api.get('/cadastros/listas-convidados-cerimonial/buscar-cpf/', {
        params: { cpf },
      }),
    buscarConvidadosAnteriores: (q = '') =>
      api.get(
        '/cadastros/listas-convidados-cerimonial/convidados-anteriores/',
        { params: { q } }
      ),
    adicionarConvidado: (listaId, data) =>
      api.post(
        `/cadastros/listas-convidados-cerimonial/${listaId}/adicionar-convidado/`,
        data
      ),
    atualizarConvidado: (listaId, convidadoId, data) =>
      api.patch(
        `/cadastros/listas-convidados-cerimonial/${listaId}/convidados/${convidadoId}/update/`,
        data
      ),
    removerConvidado: (listaId, convidadoId) =>
      api.delete(
        `/cadastros/listas-convidados-cerimonial/${listaId}/convidados/${convidadoId}/delete/`
      ),
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

const formatCpfValue = (value) => {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9
  )}-${digits.slice(9)}`;
};

const createConvidadoRow = () => ({
  rowId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  cpf: '',
  nome: '',
  email: '',
  vip: false,
  buscando: false,
  encontrado: false,
});

const getRespostaPresencaMeta = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'confirmado') {
    return {
      label: 'Presença confirmada',
      color: '#166534',
      icon: <FaCheckCircle size={11} />,
    };
  }
  if (normalized === 'recusado') {
    return {
      label: 'Presença recusada',
      color: '#b91c1c',
      icon: <FaTimes size={11} />,
    };
  }
  return {
    label: 'Aguardando resposta',
    color: '#6b7280',
    icon: <FaClock size={11} />,
  };
};

function OrganizadorEventoPage() {
  const { user } = useAuth();
  const hasAccess = user?.groups?.some((g) => g.name === 'Organizador do Evento');

  const [eventos, setEventos] = useState([]);
  const [eventosLoading, setEventosLoading] = useState(false);
  const [eventosSearch, setEventosSearch] = useState('');

  const [listasConvidados, setListasConvidados] = useState([]);
  const [listaConvidadosLoading, setListaConvidadosLoading] = useState(false);
  const [listasExpandidas, setListasExpandidas] = useState({});
  const [finalizandoPorLista, setFinalizandoPorLista] = useState({});

  const [convidadoModalOpen, setConvidadoModalOpen] = useState(false);
  const [convidadoSaving, setConvidadoSaving] = useState(false);
  const [convidadoEditing, setConvidadoEditing] = useState(null);
  const [convidadoListaId, setConvidadoListaId] = useState(null);
  const [convidadoForm, setConvidadoForm] = useState({
    cpf: '',
    nome: '',
    email: '',
    vip: false,
  });
  const [convidadoRows, setConvidadoRows] = useState([createConvidadoRow()]);
  const [qtdAdicionarConvidados, setQtdAdicionarConvidados] = useState(1);
  const [showImportarConvidadoAnterior, setShowImportarConvidadoAnterior] =
    useState(false);
  const [buscaConvidadoAnterior, setBuscaConvidadoAnterior] = useState('');
  const [resultadosConvidadoAnterior, setResultadosConvidadoAnterior] =
    useState([]);
  const [buscandoConvidadoAnterior, setBuscandoConvidadoAnterior] =
    useState(false);

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

  const eventosFiltrados = useMemo(() => {
    if (!eventosSearch.trim()) return eventos;
    const q = eventosSearch.toLowerCase();
    return eventos.filter(
      (ev) =>
        (ev.nome || '').toLowerCase().includes(q) ||
        (ev.endereco_completo || '').toLowerCase().includes(q)
    );
  }, [eventos, eventosSearch]);

  const loadEventos = async () => {
    setEventosLoading(true);
    try {
      const response = await eventoCerimonialAPI.list();
      const data = Array.isArray(response.data?.results)
        ? response.data.results
        : Array.isArray(response.data)
          ? response.data
          : [];
      setEventos(data);
    } catch (e) {
      console.error('Erro ao carregar eventos', e);
      setEventos([]);
    } finally {
      setEventosLoading(false);
    }
  };

  const loadListasConvidados = async () => {
    setListaConvidadosLoading(true);
    try {
      const response = await listaConvidadosCerimonialAPI.getListas();
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];
      setListasConvidados(data);
    } catch (e) {
      console.error('Erro ao carregar listas de convidados', e);
      setListasConvidados([]);
    } finally {
      setListaConvidadosLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    loadEventos();
    loadListasConvidados();
  }, [hasAccess]);

  useEffect(() => {
    if (!eventos.length) return;
    setListasExpandidas((prev) => {
      const next = { ...prev };
      for (const ev of eventos) {
        if (!(ev.id in next)) {
          next[ev.id] = true;
        }
      }
      return next;
    });
  }, [eventos]);

  const getListaByEventoId = (eventoId) => {
    return listasConvidados.find(
      (lista) => String(lista.evento) === String(eventoId)
    );
  };

  const toggleListaConvidadosEvento = (eventoId) => {
    setListasExpandidas((prev) => ({
      ...prev,
      [eventoId]: !prev[eventoId],
    }));
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
      console.error('Erro ao criar lista do evento', err);
      alert(
        err.response?.data?.error || 'Erro ao criar lista de convidados.'
      );
    }
  };

  const openAddConvidado = (listaId) => {
    setConvidadoEditing(null);
    setConvidadoListaId(listaId);
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

  const updateConvidadoRow = (rowId, field, value) => {
    setConvidadoRows((prev) =>
      prev.map((row) => {
        if (row.rowId !== rowId) return row;
        if (field === 'cpf') {
          return {
            ...row,
            cpf: formatCpfValue(value),
            encontrado: false,
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const preencherNomeConvidadoRowPorCpf = async (rowId) => {
    const row = convidadoRows.find((r) => r.rowId === rowId);
    if (!row) return;

    const cpfDigits = String(row.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11 || String(row.nome || '').trim()) return;

    setConvidadoRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId ? { ...r, buscando: true } : r
      )
    );

    const nome = await buscarNomePorCpf(cpfDigits);
    setConvidadoRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          buscando: false,
          nome: nome || r.nome,
          encontrado: Boolean(nome),
        };
      })
    );
  };

  const addConvidadoRow = () => {
    setConvidadoRows((prev) => [...prev, createConvidadoRow()]);
  };

  const addConvidadoRows = () => {
    const qtd = Number.isFinite(Number(qtdAdicionarConvidados))
      ? Math.max(1, Number(qtdAdicionarConvidados))
      : 1;
    setConvidadoRows((prev) => [
      ...prev,
      ...Array.from({ length: qtd }, () => createConvidadoRow()),
    ]);
  };

  const removeConvidadoRow = (rowId) => {
    setConvidadoRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.rowId !== rowId);
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
      const resp =
        await listaConvidadosCerimonialAPI.buscarConvidadosAnteriores(
          String(value || '').trim()
        );
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
      encontrado: true,
    };

    setConvidadoRows((prev) => {
      const emptyIndex = prev.findIndex(
        (r) => !r.cpf && !r.nome && !r.email
      );
      if (emptyIndex < 0) return [...prev, novo];
      const next = [...prev];
      next[emptyIndex] = novo;
      return next;
    });
  };

  const getLimiteInfoByLista = (listaId) => {
    const lista = listasConvidados.find((l) => String(l.id) === String(listaId));
    if (!lista) return { limite: 0, total: 0, disponiveis: 0 };

    const evento = eventos.find((e) => String(e.id) === String(lista.evento));
    const limite = Math.max(Number(evento?.numero_pessoas || 0), 0);
    const total = Array.isArray(lista.convidados)
      ? lista.convidados.length
      : Number(lista.total_convidados || 0);

    return {
      limite,
      total,
      disponiveis: limite > 0 ? Math.max(limite - total, 0) : 0,
    };
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
        await listaConvidadosCerimonialAPI.atualizarConvidado(
          convidadoListaId,
          convidadoEditing.id,
          payload
        );
      } else {
        const rowsValidos = convidadoRows
          .map((row) => ({
            ...row,
            cpfDigits: String(row.cpf || '').replace(/\D/g, ''),
            nomeTrim: String(row.nome || '').trim(),
            emailTrim: String(row.email || '').trim(),
          }))
          .filter(
            (row) =>
              row.cpfDigits.length === 11 && row.nomeTrim && row.emailTrim
          );

        if (!rowsValidos.length) {
          alert('Preencha CPF, nome e e-mail válidos para pelo menos um convidado.');
          return;
        }

        const limiteInfo = getLimiteInfoByLista(convidadoListaId);
        if (
          limiteInfo.limite > 0 &&
          rowsValidos.length > limiteInfo.disponiveis
        ) {
          alert(
            `Este evento permite no máximo ${limiteInfo.limite} convidados. Vagas disponíveis: ${limiteInfo.disponiveis}.`
          );
          return;
        }

        const erros = [];
        let sucessos = 0;
        for (const row of rowsValidos) {
          try {
            await listaConvidadosCerimonialAPI.adicionarConvidado(
              convidadoListaId,
              {
                cpf: row.cpfDigits,
                nome: row.nomeTrim,
                email: row.emailTrim,
                vip: Boolean(row.vip),
                enviar_email: false,
              }
            );
            sucessos += 1;
          } catch (rowErr) {
            const msg =
              rowErr?.response?.data?.error ||
              `Erro ao adicionar ${row.nomeTrim || row.cpfDigits}`;
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

  const finalizarLista = async (lista) => {
    if (!lista?.id) return;
    if (
      !window.confirm(
        'Finalizar a lista e enviar os e-mails dos convidados deste evento?'
      )
    ) {
      return;
    }

    setFinalizandoPorLista((prev) => ({ ...prev, [lista.id]: true }));
    try {
      const resp = await listaConvidadosCerimonialAPI.finalizarLista(lista.id);
      const data = resp?.data || {};
      const falhas = Array.isArray(data.falhas) ? data.falhas.length : 0;

      alert(
        [
          'Finalização concluída.',
          `Confirmações enviadas: ${data.enviados_confirmacao || 0}`,
          `QR Codes enviados: ${data.enviados_qr || 0}`,
          `Falhas: ${falhas}`,
        ].join('\n')
      );
      await loadListasConvidados();
    } catch (err) {
      console.error('Erro ao finalizar lista', err);
      alert(err.response?.data?.error || 'Erro ao finalizar lista.');
    } finally {
      setFinalizandoPorLista((prev) => ({ ...prev, [lista.id]: false }));
    }
  };

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        <div className="tecnicos-header" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Eventos do Organizador</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Visualize seus eventos e gerencie a lista de convidados dentro de cada card.
            </p>
          </div>

          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 320px', maxWidth: 460 }}>
            <FaSearch
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              value={eventosSearch}
              onChange={(e) => setEventosSearch(e.target.value)}
              placeholder="Buscar por nome ou local do evento"
              style={{
                width: '100%',
                padding: '10px 12px 10px 34px',
                border: '1px solid #dbe1ea',
                borderRadius: 10,
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {eventosLoading ? (
          <div className="table-container" style={{ padding: '1rem', color: '#64748b' }}>
            Carregando eventos...
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="table-container" style={{ padding: '1rem', color: '#64748b' }}>
            Nenhum evento encontrado para o seu usuário.
          </div>
        ) : (
          <div className="units-cards-grid">
            {eventosFiltrados.map((ev) => {
              const listaEvento = getListaByEventoId(ev.id);
              const listaAberta = Boolean(listasExpandidas[ev.id]);
              const totalConvidados = listaEvento?.total_convidados || 0;
              const limiteConvidados = Math.max(Number(ev.numero_pessoas || 0), 0);
              const limiteAtingido =
                limiteConvidados > 0 && totalConvidados >= limiteConvidados;

              return (
                <article
                  key={ev.id}
                  className={`unit-card ${listaAberta ? 'unit-card--expanded' : ''} ${
                    limiteAtingido ? 'unit-card--has-pending' : ''
                  }`}
                >
                  <div className="unit-card__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span className="unit-card__title">{ev.nome}</span>
                    <button
                      type="button"
                      className="unit-card__edit-btn"
                      onClick={() => toggleListaConvidadosEvento(ev.id)}
                      title={listaAberta ? 'Ocultar lista' : 'Mostrar lista'}
                    >
                      {listaAberta ? <FaEyeSlash /> : <FaEye />}
                    </button>
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
                        <span className="unit-card__info-label">Capacidade</span>
                        <span className="unit-card__info-value">
                          {limiteConvidados || '-'}
                        </span>
                      </div>
                      <div className="unit-card__info-item">
                        <span className="unit-card__info-label">Lista</span>
                        <span className="unit-card__info-value">
                          {totalConvidados}/{limiteConvidados || '-'}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#64748b', marginBottom: 3 }}>
                        Local
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                        {ev.endereco_completo || '-'}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="add-button"
                        onClick={() => toggleListaConvidadosEvento(ev.id)}
                        style={{
                          padding: '7px 12px',
                          background: listaAberta ? '#0f766e' : '#1e40af',
                          borderRadius: 8,
                          fontWeight: 600,
                        }}
                      >
                        {listaAberta ? <FaEyeSlash /> : <FaEye />} {listaAberta ? 'Ocultar gestão da lista' : 'Gerenciar lista de convidados'}
                      </button>
                    </div>
                  </div>

                  {listaAberta && (
                    <div style={{ margin: '0 12px 12px', border: '1px solid #dbeafe', background: '#f8fbff', borderRadius: 10, padding: 12 }}>
                      {listaConvidadosLoading ? (
                        <p style={{ margin: 0, color: '#64748b' }}>Carregando convidados...</p>
                      ) : !listaEvento ? (
                        <div style={{ display: 'grid', gap: 8 }}>
                          <p style={{ margin: 0, color: '#64748b' }}>
                            Nenhuma lista criada para este evento.
                          </p>
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
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                                {listaEvento.titulo || 'Lista de Convidados'}
                              </div>
                              <div style={{ color: '#334155', fontSize: 13 }}>
                                {totalConvidados} de {limiteConvidados || '-'} convidados
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="add-button"
                                onClick={() => openAddConvidado(listaEvento.id)}
                                style={{ padding: '6px 10px', background: '#1e40af' }}
                              >
                                <FaPlus /> Convidados
                              </button>
                              <button
                                type="button"
                                className="add-button"
                                onClick={() => finalizarLista(listaEvento)}
                                disabled={Boolean(finalizandoPorLista[listaEvento.id])}
                                style={{
                                  padding: '6px 10px',
                                  background: '#0f766e',
                                  opacity: finalizandoPorLista[listaEvento.id] ? 0.7 : 1,
                                }}
                              >
                                <FaSave />
                                {finalizandoPorLista[listaEvento.id]
                                  ? 'Finalizando...'
                                  : 'Finalizar lista'}
                              </button>
                            </div>
                          </div>

                          <p style={{ margin: '0 0 10px', color: '#475569', fontSize: 12 }}>
                            Ao finalizar a lista, os e-mails são enviados para todos os convidados do evento.
                          </p>

                          {(listaEvento.convidados || []).length === 0 ? (
                            <p style={{ margin: 0, color: '#64748b' }}>
                              Lista sem convidados no momento.
                            </p>
                          ) : (
                            <div style={{ display: 'grid', gap: 8 }}>
                              {(listaEvento.convidados || []).map((c) => {
                                const respostaMeta = getRespostaPresencaMeta(
                                  c.resposta_presenca
                                );
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
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {c.nome}
                                        {c.vip && (
                                          <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 999, fontSize: 11, padding: '2px 8px' }}>
                                            VIP
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ color: '#6b7280', fontSize: 13 }}>
                                        CPF: {c.cpf_mascarado || '-'}
                                      </div>
                                      {c.email && (
                                        <div style={{ color: '#6b7280', fontSize: 13 }}>
                                          {c.email}
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ display: 'grid', gap: 4 }}>
                                      <div style={{ color: respostaMeta.color, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {respostaMeta.icon}
                                        {respostaMeta.label}
                                      </div>
                                      <div style={{ color: c.entrada_confirmada ? '#059669' : '#9ca3af', fontWeight: 600, fontSize: 13 }}>
                                        {c.entrada_confirmada
                                          ? 'Entrada confirmada'
                                          : 'Aguardando entrada'}
                                      </div>
                                    </div>

                                    <div className="actions-column" style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        className="edit-button"
                                        onClick={() => openEditConvidado(listaEvento.id, c)}
                                        title="Editar convidado"
                                      >
                                        <FaEdit />
                                      </button>
                                      <button
                                        type="button"
                                        className="delete-button"
                                        onClick={() => deleteConvidado(listaEvento.id, c)}
                                        title="Excluir convidado"
                                      >
                                        <FaTrash />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {convidadoModalOpen && (
          <div className="modal-overlay" onClick={() => setConvidadoModalOpen(false)}>
            <div
              className="modal-container"
              style={{ maxWidth: 700, width: '95vw' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="modal-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {!convidadoEditing && <FaUserFriends style={{ color: '#2abb98' }} />}
                  {convidadoEditing ? 'Editar Convidado' : 'Adicionar Convidados'}
                </h2>
                <button
                  className="modal-close"
                  onClick={() => setConvidadoModalOpen(false)}
                >
                  <FaTimes />
                </button>
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
                            onChange={(e) =>
                              setConvidadoForm((p) => ({
                                ...p,
                                cpf: formatCpfValue(e.target.value),
                              }))
                            }
                            onBlur={preencherNomeConvidadoFormPorCpf}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Nome</label>
                          <input
                            value={convidadoForm.nome}
                            onChange={(e) =>
                              setConvidadoForm((p) => ({ ...p, nome: e.target.value }))
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>E-mail</label>
                        <input
                          type="email"
                          value={convidadoForm.email}
                          onChange={(e) =>
                            setConvidadoForm((p) => ({ ...p, email: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={convidadoForm.vip}
                          onChange={(e) =>
                            setConvidadoForm((p) => ({ ...p, vip: e.target.checked }))
                          }
                        />
                        Convidado VIP
                      </label>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: '#374151',
                            marginBottom: '0.35rem',
                          }}
                        >
                          Convidados
                        </p>

                        <div className="convidado-col-header">
                          <div className="col-cpf">
                            <span style={convidadoModalStyles.label}>CPF</span>
                          </div>
                          <div className="col-nome">
                            <span style={convidadoModalStyles.label}>Nome</span>
                          </div>
                          <div className="col-email">
                            <span style={convidadoModalStyles.label}>E-mail</span>
                          </div>
                          <div className="col-vip">
                            <span style={convidadoModalStyles.label}>VIP</span>
                          </div>
                          <div className="col-acao" />
                        </div>

                        {convidadoRows.map((row, idx) => (
                          <div key={row.rowId} className="convidado-row">
                            <div className="col-cpf">
                              <input
                                value={row.cpf}
                                onChange={(e) =>
                                  updateConvidadoRow(row.rowId, 'cpf', e.target.value)
                                }
                                onBlur={() => preencherNomeConvidadoRowPorCpf(row.rowId)}
                                placeholder="000.000.000-00"
                                style={{
                                  ...convidadoModalStyles.input,
                                  borderColor: row.encontrado ? '#2abb98' : '#d1d5db',
                                }}
                                required
                              />
                            </div>

                            <div className="col-nome" style={{ position: 'relative' }}>
                              <input
                                value={row.nome}
                                onChange={(e) =>
                                  updateConvidadoRow(row.rowId, 'nome', e.target.value)
                                }
                                placeholder={
                                  row.buscando
                                    ? 'Buscando nome...'
                                    : `Nome do convidado ${idx + 1}`
                                }
                                disabled={row.buscando}
                                style={{
                                  ...convidadoModalStyles.input,
                                  color: row.encontrado ? '#059669' : '#111827',
                                  background: row.buscando ? '#f9fafb' : '#fff',
                                }}
                                required
                              />
                            </div>

                            <div className="col-email">
                              <input
                                type="email"
                                value={row.email}
                                onChange={(e) =>
                                  updateConvidadoRow(row.rowId, 'email', e.target.value)
                                }
                                placeholder="email@dominio.com"
                                style={convidadoModalStyles.input}
                                required
                              />
                            </div>

                            <div className="col-vip">
                              <input
                                type="checkbox"
                                checked={Boolean(row.vip)}
                                onChange={(e) =>
                                  updateConvidadoRow(row.rowId, 'vip', e.target.checked)
                                }
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
                                  cursor:
                                    convidadoRows.length === 1
                                      ? 'default'
                                      : 'pointer',
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
                          Importar convidado de lista anterior
                        </button>

                        {showImportarConvidadoAnterior && (
                          <div
                            style={{
                              marginTop: 8,
                              background: '#f9fafb',
                              border: '1px solid #e5e7eb',
                              borderRadius: 8,
                              padding: 10,
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Buscar por nome ou CPF..."
                              value={buscaConvidadoAnterior}
                              onChange={(e) =>
                                handleBuscarConvidadoAnterior(e.target.value)
                              }
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: 5,
                                fontSize: '0.83rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                                marginBottom: 6,
                              }}
                              autoFocus
                            />

                            {buscandoConvidadoAnterior && (
                              <p
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#9ca3af',
                                  margin: 0,
                                  textAlign: 'center',
                                }}
                              >
                                Buscando...
                              </p>
                            )}

                            {!buscandoConvidadoAnterior &&
                              buscaConvidadoAnterior &&
                              resultadosConvidadoAnterior.length === 0 && (
                                <p
                                  style={{
                                    fontSize: '0.78rem',
                                    color: '#9ca3af',
                                    margin: 0,
                                    textAlign: 'center',
                                  }}
                                >
                                  Nenhum convidado encontrado.
                                </p>
                              )}

                            {!buscaConvidadoAnterior && (
                              <p
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#9ca3af',
                                  margin: 0,
                                  textAlign: 'center',
                                }}
                              >
                                Digite o nome ou CPF para buscar.
                              </p>
                            )}

                            {resultadosConvidadoAnterior.map((c) => (
                              <div
                                key={`${c.cpf}-${c.nome}`}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '6px 8px',
                                  background: '#fff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 6,
                                  marginBottom: 4,
                                }}
                              >
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      fontSize: '0.83rem',
                                      fontWeight: 500,
                                      color: '#111827',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {c.nome}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '0.73rem',
                                      color: '#6b7280',
                                    }}
                                  >
                                    {c.cpf_formatado}
                                    {c.email ? ` • ${c.email}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleImportarConvidadoAnterior(c)}
                                  style={{
                                    background: '#2abb98',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 5,
                                    padding: '3px 10px',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem',
                                    flexShrink: 0,
                                    marginLeft: 8,
                                  }}
                                >
                                  + Adicionar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        className="add-row-section"
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={qtdAdicionarConvidados}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setQtdAdicionarConvidados(
                              Number.isFinite(v) && v > 0 ? v : 1
                            );
                          }}
                          className="add-row-count"
                          style={{
                            ...convidadoModalStyles.input,
                            width: 64,
                            textAlign: 'center',
                            paddingLeft: 8,
                          }}
                        />
                        <button
                          type="button"
                          onClick={addConvidadoRows}
                          style={convidadoModalStyles.btnSec}
                        >
                          <FaPlus size={11} style={{ marginRight: 5 }} />
                          Adicionar{' '}
                          {qtdAdicionarConvidados > 1
                            ? `${qtdAdicionarConvidados} linhas`
                            : 'linha'}
                        </button>
                        <button
                          type="button"
                          onClick={addConvidadoRow}
                          style={convidadoModalStyles.btnSec}
                        >
                          <FaPlus size={11} style={{ marginRight: 5 }} />
                          Nova linha
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 10,
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    background: '#fff',
                  }}
                >
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

export default OrganizadorEventoPage;
