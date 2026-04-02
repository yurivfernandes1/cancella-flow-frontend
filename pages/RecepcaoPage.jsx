import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, * as apiServices from '../services/api';
import QrCodeScanner from '../components/Eventos/QrCodeScanner';
import {
  FaCalendarCheck,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaQrcode,
  FaSignInAlt,
  FaSignOutAlt,
  FaUserCheck,
  FaUsers,
} from 'react-icons/fa';
import '../styles/UsersPage.css';
import '../styles/UnitsCards.css';

const eventoCerimonialAPI = apiServices.eventoCerimonialAPI || {
  recepcaoPainel: () => api.get('/cadastros/eventos-cerimonial/recepcao/painel/'),
  recepcaoCheckin: (eventoId) => api.post(`/cadastros/eventos-cerimonial/${eventoId}/recepcao/checkin/`),
  recepcaoCheckout: (eventoId) => api.post(`/cadastros/eventos-cerimonial/${eventoId}/recepcao/checkout/`),
  recepcaoConfirmarPorNome: (eventoId, nome_completo) =>
    api.post(`/cadastros/eventos-cerimonial/${eventoId}/recepcao/confirmar-por-nome/`, { nome_completo }),
};

const listaConvidadosCerimonialAPI = apiServices.listaConvidadosCerimonialAPI || {
  confirmarPorQrCode: (token) => api.post('/cadastros/listas-convidados-cerimonial/confirmar-por-qrcode/', { token }),
};

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEnderecoLinhas(enderecoCompleto) {
  const endereco = String(enderecoCompleto || '').trim();
  if (!endereco) return ['Local não informado'];

  const partes = endereco
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (partes.length <= 2) return [endereco];

  const linhaPrincipal = partes.slice(0, 2).join(', ');
  const linhaComplemento = partes.slice(2).join(', ');
  return linhaComplemento ? [linhaPrincipal, linhaComplemento] : [linhaPrincipal];
}

function extractApiError(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.detail || fallback;
}

function isEventoNoDiaLocal(evento) {
  if (!evento?.datetime_inicio && !evento?.datetime_fim) return false;

  const referencia = new Date();
  const inicio = evento?.datetime_inicio ? new Date(evento.datetime_inicio) : null;
  const fim = evento?.datetime_fim ? new Date(evento.datetime_fim) : inicio;

  if ((inicio && Number.isNaN(inicio.getTime())) || (fim && Number.isNaN(fim.getTime()))) {
    return false;
  }

  const inicioDate = inicio || fim;
  const fimDate = fim || inicio;
  if (!inicioDate || !fimDate) return false;

  const refDay = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  const iniDay = new Date(inicioDate.getFullYear(), inicioDate.getMonth(), inicioDate.getDate());
  const fimDay = new Date(fimDate.getFullYear(), fimDate.getMonth(), fimDate.getDate());

  return iniDay <= refDay && refDay <= fimDay;
}

function RecepcaoPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAccess = user?.groups?.some((g) => g.name === 'Recepção');

  const [loading, setLoading] = useState(true);
  const [eventos, setEventos] = useState([]);
  const [eventoAtivoId, setEventoAtivoId] = useState(null);
  const [eventoHojeId, setEventoHojeId] = useState(null);
  const [selectedEventoId, setSelectedEventoId] = useState(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [validandoNome, setValidandoNome] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [autoActionDone, setAutoActionDone] = useState(false);

  const eventoSelecionado = useMemo(
    () => eventos.find((evento) => String(evento.id) === String(selectedEventoId)) || null,
    [eventos, selectedEventoId]
  );

  const eventoDoDia = useMemo(
    () => {
      const porBackend = eventos.find((evento) => String(evento.id) === String(eventoHojeId));
      if (porBackend) return porBackend;

      const porFlag = eventos.find((evento) => Boolean(evento.is_hoje));
      if (porFlag) return porFlag;

      return eventos.find((evento) => isEventoNoDiaLocal(evento)) || null;
    },
    [eventos, eventoHojeId]
  );

  const eventoEmOperacao = useMemo(
    () => eventos.find((evento) => String(evento.id) === String(eventoAtivoId)) || null,
    [eventos, eventoAtivoId]
  );

  const podeCheckinNoEventoDoDia = useMemo(() => {
    if (!eventoDoDia) return false;
    if (eventoDoDia.can_checkin_today) return true;

    if (eventoDoDia.checkin_realizado || eventoDoDia.checkout_realizado) {
      return false;
    }

    const eventoHojeLocal = isEventoNoDiaLocal(eventoDoDia);
    const semConflitoOperacao = !eventoAtivoId || String(eventoAtivoId) === String(eventoDoDia.id);
    return eventoHojeLocal && semConflitoOperacao;
  }, [eventoDoDia, eventoAtivoId]);

  const loadPainel = async ({ preserveSelection = true } = {}) => {
    setLoading(true);
    try {
      const response = await eventoCerimonialAPI.recepcaoPainel();
      const data = response.data || {};
      const eventosData = Array.isArray(data.eventos) ? data.eventos : [];

      setEventos(eventosData);
      setEventoAtivoId(data.evento_ativo_id || null);
      setEventoHojeId(data.evento_hoje_id || null);

      const urlEvento = searchParams.get('evento');
      const hasCurrentSelection = preserveSelection && selectedEventoId && eventosData.some((ev) => String(ev.id) === String(selectedEventoId));
      if (hasCurrentSelection) {
        return;
      }

      const preferredId =
        (urlEvento && eventosData.some((ev) => String(ev.id) === String(urlEvento)) ? urlEvento : null)
        || data.evento_ativo_id
        || data.evento_hoje_id
        || (eventosData[0]?.id ?? null);

      setSelectedEventoId(preferredId);
    } catch (error) {
      setEventos([]);
      setFeedback({
        type: 'error',
        text: extractApiError(error, 'Não foi possível carregar os eventos da recepção.'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPainel({ preserveSelection: false });
  }, []);

  useEffect(() => {
    if (loading || autoActionDone || !eventos.length) return;

    const acao = searchParams.get('acao');
    if (!acao) return;

    const limparAcao = () => {
      const next = new URLSearchParams(searchParams);
      next.delete('acao');
      setSearchParams(next, { replace: true });
    };

    const executar = async () => {
      const eventoParam = searchParams.get('evento');
      const targetId = eventoParam || eventoAtivoId || eventoHojeId || eventos[0]?.id;
      if (!targetId) {
        setFeedback({ type: 'error', text: 'Nenhum evento disponível para a ação solicitada.' });
        limparAcao();
        setAutoActionDone(true);
        return;
      }

      setSelectedEventoId(targetId);

      try {
        if (acao === 'checkin') {
          await eventoCerimonialAPI.recepcaoCheckin(targetId);
          const eventoAlvo = eventos.find((ev) => String(ev.id) === String(targetId));
          setFeedback({
            type: 'success',
            text: `Check-in realizado com sucesso para ${eventoAlvo?.nome || 'o evento selecionado'}.`,
          });
          await loadPainel({ preserveSelection: false });
        } else if (acao === 'checkout') {
          await eventoCerimonialAPI.recepcaoCheckout(targetId);
          const eventoAlvo = eventos.find((ev) => String(ev.id) === String(targetId));
          setFeedback({
            type: 'success',
            text: `Checkout realizado com sucesso para ${eventoAlvo?.nome || 'o evento selecionado'}.`,
          });
          await loadPainel({ preserveSelection: false });
        } else if (acao === 'qr') {
          const eventoAlvo = eventos.find((ev) => String(ev.id) === String(targetId));
          if (!eventoAlvo?.can_read_qr) {
            setFeedback({
              type: 'error',
              text: 'A leitura de QR só fica disponível com check-in ativo e durante o horário do evento.',
            });
          } else {
            setShowQrScanner(true);
          }
        }
      } catch (error) {
        setFeedback({
          type: 'error',
          text: extractApiError(error, 'Não foi possível executar a ação solicitada.'),
        });
      } finally {
        limparAcao();
        setAutoActionDone(true);
      }
    };

    executar();
  }, [
    autoActionDone,
    eventoAtivoId,
    eventoHojeId,
    eventos,
    loading,
    searchParams,
  ]);

  const handleCheckin = async (eventoAlvo) => {
    const eventoId = eventoAlvo?.id || eventoAlvo;
    const nomeEvento = eventoAlvo?.nome;
    try {
      await eventoCerimonialAPI.recepcaoCheckin(eventoId);
      setFeedback({
        type: 'success',
        text: `Check-in realizado com sucesso para ${nomeEvento || 'o evento selecionado'}.`,
      });
      await loadPainel({ preserveSelection: false });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: extractApiError(error, 'Não foi possível realizar o check-in.'),
      });
    }
  };

  const handleCheckout = async (eventoAlvo) => {
    const eventoId = eventoAlvo?.id || eventoAlvo;
    const nomeEvento = eventoAlvo?.nome;
    try {
      await eventoCerimonialAPI.recepcaoCheckout(eventoId);
      setFeedback({
        type: 'success',
        text: `Checkout realizado com sucesso para ${nomeEvento || 'o evento em operação'}.`,
      });
      await loadPainel({ preserveSelection: false });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: extractApiError(error, 'Não foi possível realizar o checkout.'),
      });
    }
  };

  const handleConfirmarPorNome = async (nomeInformado) => {
    if (!eventoSelecionado?.id) return;
    const nomeNormalizado = (nomeInformado || '').trim();
    if (!nomeNormalizado) {
      setFeedback({ type: 'error', text: 'Digite o nome completo para validar a entrada.' });
      return;
    }

    setValidandoNome(true);
    try {
      const response = await eventoCerimonialAPI.recepcaoConfirmarPorNome(
        eventoSelecionado.id,
        nomeNormalizado
      );
      const data = response.data || {};
      if (data.aviso) {
        setFeedback({ type: 'warning', text: data.aviso });
      } else {
        setFeedback({ type: 'success', text: data.message || 'Entrada confirmada com sucesso.' });
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: extractApiError(error, 'Não foi possível confirmar a entrada pelo nome.'),
      });
    } finally {
      setValidandoNome(false);
    }
  };

  const handleCardValidarNome = () => {
    if (!eventoSelecionado?.can_read_qr) {
      setFeedback({
        type: 'error',
        text: 'A validação por nome só está disponível com check-in ativo e durante o evento.',
      });
      return;
    }

    const nome = window.prompt('Digite o nome completo do convidado para confirmar a entrada:');
    if (!nome) return;

    void handleConfirmarPorNome(nome);
  };

  const handleCardLerQr = () => {
    if (!eventoSelecionado?.can_read_qr) {
      setFeedback({
        type: 'error',
        text: 'A leitura de QR só está disponível com check-in ativo e durante o evento.',
      });
      return;
    }

    setShowQrScanner(true);
  };

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        <div className="unit-card" style={{ marginBottom: '1rem' }}>
          <div className="unit-card__header">
            <span className="unit-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaUsers /> Operação da Recepção
            </span>
          </div>
          <div className="unit-card__summary">
            <p style={{ margin: 0, color: '#334155' }}>
              Você pode atuar em um evento por vez. Faça check-in no dia do evento para iniciar as validações.
            </p>
            {feedback.text && (
              <p
                style={{
                  margin: '10px 0 0',
                  fontWeight: 600,
                  color:
                    feedback.type === 'success'
                      ? '#047857'
                      : feedback.type === 'warning'
                        ? '#b45309'
                        : '#b91c1c',
                }}
              >
                {feedback.text}
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 8px', color: '#334155', fontWeight: 700, fontSize: '0.92rem' }}>
            Acessos rápidos
          </p>
          <div className="recepcao-action-cards">
          <button
            type="button"
            className="recepcao-action-card"
            onClick={() => eventoDoDia?.id && handleCheckin(eventoDoDia)}
            disabled={!podeCheckinNoEventoDoDia}
          >
            <span className="recepcao-action-card__icon">
              <FaSignInAlt size={20} />
            </span>
            <span className="recepcao-action-card__body">
              <strong>Check-in</strong>
              <small>
                {!eventoDoDia
                  ? 'Sem evento do dia disponível para check-in'
                  : podeCheckinNoEventoDoDia
                    ? `Iniciar operação no evento do dia: ${eventoDoDia.nome}`
                    : `Check-in indisponível para o evento do dia: ${eventoDoDia.nome}`}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="recepcao-action-card"
            onClick={() => eventoEmOperacao?.id && handleCheckout(eventoEmOperacao)}
            disabled={!eventoEmOperacao?.can_checkout}
          >
            <span className="recepcao-action-card__icon">
              <FaSignOutAlt size={20} />
            </span>
            <span className="recepcao-action-card__body">
              <strong>Checkout</strong>
              <small>
                {!eventoEmOperacao
                  ? 'Sem evento com check-in ativo para checkout'
                  : eventoEmOperacao.can_checkout
                    ? `Encerrar operação em: ${eventoEmOperacao.nome}`
                    : `Checkout indisponível para: ${eventoEmOperacao.nome}`}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="recepcao-action-card"
            onClick={handleCardLerQr}
            disabled={!eventoSelecionado?.can_read_qr}
          >
            <span className="recepcao-action-card__icon">
              <FaQrcode size={20} />
            </span>
            <span className="recepcao-action-card__body">
              <strong>Ler QR Code</strong>
              <small>
                {eventoSelecionado
                  ? 'Confirmar entrada do convidado via QR'
                  : 'Selecione um evento para iniciar'}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="recepcao-action-card"
            onClick={handleCardValidarNome}
            disabled={!eventoSelecionado?.can_read_qr || validandoNome}
          >
            <span className="recepcao-action-card__icon">
              <FaUserCheck size={20} />
            </span>
            <span className="recepcao-action-card__body">
              <strong>Validar via Nome</strong>
              <small>
                {eventoSelecionado
                  ? validandoNome
                    ? 'Validando convidado...'
                    : 'Digite o nome completo em uma janela rápida'
                  : 'Selecione um evento para iniciar'}
              </small>
            </span>
          </button>
        </div>
        </div>

        <div className="units-cards-grid">
          {loading && (
            <article className="unit-card">
              <div className="unit-card__summary">
                <p style={{ margin: 0, color: '#64748b' }}>Carregando eventos...</p>
              </div>
            </article>
          )}

          {!loading && eventos.length === 0 && (
            <article className="unit-card">
              <div className="unit-card__summary">
                <p style={{ margin: 0, color: '#64748b' }}>
                  Nenhum evento vinculado para operação da recepção no momento.
                </p>
              </div>
            </article>
          )}

          {!loading && eventos.map((evento) => {
            const selected = String(evento.id) === String(eventoSelecionado?.id || '');
            const enderecoLinhas = formatEnderecoLinhas(evento.endereco_completo);
            return (
              <article
                key={evento.id}
                className={`unit-card ${selected ? 'unit-card--expanded' : ''}`}
                onClick={() => setSelectedEventoId(evento.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="unit-card__header">
                  <span className="unit-card__title">{evento.nome}</span>
                  {evento.is_hoje && (
                    <span className="unit-card__status-badge" style={{ background: '#f59e0b' }}>
                      Evento do dia
                    </span>
                  )}
                  {evento.id === eventoAtivoId && (
                    <span className="unit-card__status-badge unit-card__status-badge--active">
                      Em operação
                    </span>
                  )}
                </div>
                <div className="unit-card__summary">
                  <p style={{ margin: 0, color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaCalendarCheck style={{ color: '#2abb98' }} />
                    Início: {formatDateTime(evento.datetime_inicio)}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaClock style={{ color: '#2abb98' }} />
                    Fim: {formatDateTime(evento.datetime_fim)}
                  </p>

                  <p style={{ margin: '10px 0 0', color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaMapMarkerAlt style={{ color: '#2abb98' }} />
                    {enderecoLinhas[0]}
                  </p>
                  {enderecoLinhas[1] && (
                    <p style={{ margin: '2px 0 0 26px', color: '#475569' }}>
                      {enderecoLinhas[1]}
                    </p>
                  )}

                  <p style={{ margin: '8px 0 0', color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaPhone style={{ color: '#2abb98' }} />
                    {evento.contato_cerimonial?.telefone
                      ? `${evento.contato_cerimonial.nome}: ${evento.contato_cerimonial.telefone}`
                      : (evento.contato_cerimonial?.nome || 'Cerimonial sem telefone cadastrado')}
                  </p>
                  {evento.horario_entrada && (
                    <p style={{ margin: '8px 0 0', color: '#0f766e', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FaClock />
                      Check-in: {formatDateTime(evento.horario_entrada)}
                    </p>
                  )}
                  {evento.horario_saida && (
                    <p style={{ margin: '6px 0 0', color: '#0f766e', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FaClock />
                      Checkout: {formatDateTime(evento.horario_saida)}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {showQrScanner && eventoSelecionado && (
          <QrCodeScanner
            onClose={() => setShowQrScanner(false)}
            onConfirmado={async () => {
              await loadPainel({ preserveSelection: true });
            }}
            onScanToken={(token) => listaConvidadosCerimonialAPI.confirmarPorQrCode(token).then((res) => res.data)}
            titulo="Recepção · Ler QR Code"
            instrucao="Aponte a câmera para o QR Code do convidado para confirmar a entrada neste evento"
          />
        )}
      </div>
    </div>
  );
}

export default RecepcaoPage;
