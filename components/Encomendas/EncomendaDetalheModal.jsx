import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { encomendaAPI } from '../../services/api';
import '../../styles/Modal.css';

function EncomendaDetalheModal({ encomenda, onClose, onUpdate }) {
  const { user } = useAuth();
  const isMorador = user?.groups?.some((g) => g.name === 'Moradores');
  const isPortaria = user?.groups?.some((g) => g.name === 'Portaria');
  const isSindico = user?.groups?.some((g) => g.name === 'Síndicos') || user?.is_staff;

  const [observacao, setObservacao] = useState('');
  const [descricaoEdit, setDescricaoEdit] = useState(encomenda.descricao || '');
  const [codigoEdit, setCodigoEdit] = useState(encomenda.codigo_rastreio || '');
  const [retiradoPorEdit, setRetiradoPorEdit] = useState(encomenda.retirado_por || '');
  const [respostaContestacao, setRespostaContestacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getInitialStatus = () => {
    if (!encomenda.retirado_em) return 'pendente';
    if (encomenda.contestado_em && !encomenda.contestacao_resolvida) return 'contestada';
    return 'retirada';
  };
  const [statusEdit, setStatusEdit] = useState(getInitialStatus());

  const canContestar = isMorador && Boolean(encomenda.retirado_em);

  const formatDateTime = (v) => {
    if (!v) return '-';
    try {
      return new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return v;
    }
  };

  const handleContestar = async () => {
    setError('');
    setSuccess('');
    if (!observacao.trim()) {
      setError('Informe a observação da contestação.');
      return;
    }

    setLoading(true);
    try {
      await encomendaAPI.patch(encomenda.id, {
        contestar_recebimento: true,
        contestacao_observacao: observacao.trim(),
      });
      setSuccess('Contestação enviada com sucesso.');
      onUpdate?.();
      setTimeout(() => onClose(), 850);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao contestar recebimento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicaoPortaria = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        descricao: descricaoEdit,
        codigo_rastreio: codigoEdit,
        retirado_por: retiradoPorEdit || null,
      };

      if (statusEdit === 'retirada') {
        if (!encomenda.retirado_em) payload.retirado_em = new Date().toISOString();
      } else if (statusEdit === 'pendente') {
        payload.retirado_em = null;
        payload.retirado_por = null;
      }

      await encomendaAPI.patch(encomenda.id, payload);
      setSuccess('Encomenda atualizada com sucesso.');
      onUpdate?.();
      setTimeout(() => onClose(), 850);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar encomenda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2>Encomenda #{encomenda.id}</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Código de Rastreio</label>
            <div className="modal-info">{encomenda.codigo_rastreio || '-'}</div>
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <div className="modal-info">{encomenda.descricao || '-'}</div>
          </div>
          <div className="form-group">
            <label>Destinatário</label>
            <div className="modal-info">{encomenda.destinatario_nome || '-'}</div>
          </div>
          <div className="form-group">
            <label>Unidade</label>
            <div className="modal-info">{encomenda.unidade_identificacao || '-'}</div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <div className="modal-info">
              {isPortaria ? (
                <select value={statusEdit} onChange={(e) => setStatusEdit(e.target.value)} disabled={loading}>
                  <option value="pendente">Pendente</option>
                  <option value="retirada">Retirada</option>
                  <option value="contestada" disabled>Contestada</option>
                </select>
              ) : (
                (!encomenda.retirado_em ? 'Pendente' : (encomenda.contestado_em && !encomenda.contestacao_resolvida ? 'Contestada' : 'Retirada'))
              )}
            </div>
          </div>

          {encomenda.contestado_em && (
            <div className="form-group">
              <label>Contestação</label>
              <div className="modal-info" style={{ background: '#fff7ed', color: '#9a3412' }}>
                <p style={{ margin: '0 0 6px' }}>
                  Contestada em <strong>{formatDateTime(encomenda.contestado_em)}</strong>
                </p>
                <p style={{ margin: 0 }}>Observação: {encomenda.contestacao_observacao || '-'}</p>
              </div>
            </div>
          )}

          {encomenda.contestacao_respondido_em && (
            <div className="form-group">
              <label>Resposta do Síndico</label>
              <div className="modal-info" style={{ background: '#eff6ff', color: '#1e3a8a' }}>
                <p style={{ margin: '0 0 6px' }}>
                  Respondida em <strong>{formatDateTime(encomenda.contestacao_respondido_em)}</strong>
                </p>
                <p style={{ margin: 0 }}>{encomenda.contestacao_resposta || '-'}</p>
              </div>
            </div>
          )}

          {isMorador && (
            <div className="form-group">
              <label>Contestar recebimento</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                disabled={!canContestar || loading}
                placeholder={canContestar ? 'Explique o problema com o recebimento...' : 'Disponível apenas após marcar como retirada'}
              />
            </div>
          )}

          {isPortaria && (
            <>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  value={descricaoEdit}
                  onChange={(e) => setDescricaoEdit(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Código de Rastreio</label>
                <input
                  type="text"
                  value={codigoEdit}
                  onChange={(e) => setCodigoEdit(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Retirado por</label>
                <input
                  type="text"
                  value={retiradoPorEdit}
                  onChange={(e) => setRetiradoPorEdit(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {isSindico && encomenda.contestado_em && !encomenda.contestacao_resolvida && (
            <div className="form-group">
              <label>Resposta ao morador (obrigatória para resolver)</label>
              <textarea
                value={respostaContestacao}
                onChange={(e) => setRespostaContestacao(e.target.value)}
                rows={3}
                disabled={loading}
                placeholder="Escreva a resposta para o morador..."
              />
            </div>
          )}

          {error && <span className="error-message">{error}</span>}
          {success && <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: 8 }}>{success}</p>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Fechar</button>
          {isMorador && (
            <button type="button" className="btn-primary" onClick={handleContestar} disabled={!canContestar || loading}>
              {loading ? 'Enviando...' : 'Contestar Recebimento'}
            </button>
          )}
          {isPortaria && (
            <button type="button" className="btn-primary" onClick={handleSalvarEdicaoPortaria} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Edição'}
            </button>
          )}
          {isSindico && encomenda.contestado_em && !encomenda.contestacao_resolvida && (
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                if (!respostaContestacao.trim()) {
                  setError('Informe a resposta para resolver a contestação.');
                  return;
                }
                setLoading(true);
                setError('');
                try {
                  await encomendaAPI.patch(encomenda.id, {
                    resolver_contestacao: true,
                    contestacao_resposta: respostaContestacao.trim(),
                  });
                  setSuccess('Contestação marcada como resolvida.');
                  onUpdate?.();
                  setTimeout(() => onClose(), 850);
                } catch (err) {
                  setError(err.response?.data?.error || 'Erro ao resolver contestação.');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Marcar Contestação Resolvida'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EncomendaDetalheModal;
