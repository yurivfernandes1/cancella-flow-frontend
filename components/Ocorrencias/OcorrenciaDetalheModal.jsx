import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { ocorrenciaAPI } from '../../services/api';
import '../../styles/Modal.css';

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  resolvida: 'Resolvida',
  fechada: 'Fechada',
};

const STATUS_COLORS = {
  aberta: { bg: '#fee2e2', color: '#dc2626' },
  em_andamento: { bg: '#fef9c3', color: '#ca8a04' },
  resolvida: { bg: '#dcfce7', color: '#15803d' },
  fechada: { bg: '#f3f4f6', color: '#6b7280' },
};

const TIPO_LABELS = {
  problema: 'Problema',
  sugestao: 'Sugestão',
};

function OcorrenciaDetalheModal({ ocorrencia, onClose, onUpdate }) {
  const { user } = useAuth();
  const isSindicoOrStaff =
    user?.is_staff ||
    user?.groups?.some((g) => g.name === 'Síndicos');

  const [resposta, setResposta] = useState(ocorrencia.resposta || '');
  const [statusEdit, setStatusEdit] = useState(ocorrencia.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await ocorrenciaAPI.update(ocorrencia.id, { resposta, status: statusEdit });
      setSuccess('Resposta salva com sucesso!');
      onUpdate && onUpdate();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar resposta.');
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = STATUS_COLORS[ocorrencia.status] || STATUS_COLORS.fechada;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>Ocorrência #{ocorrencia.id}</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          {/* Badges de tipo e status */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
              background: ocorrencia.tipo === 'problema' ? '#fee2e2' : '#dbeafe',
              color: ocorrencia.tipo === 'problema' ? '#dc2626' : '#1d4ed8',
            }}>
              {TIPO_LABELS[ocorrencia.tipo] || ocorrencia.tipo}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
              background: statusStyle.bg, color: statusStyle.color,
            }}>
              {STATUS_LABELS[ocorrencia.status] || ocorrencia.status}
            </span>
          </div>

          {/* Título e meta */}
          <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#19294a' }}>{ocorrencia.titulo}</h3>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 16 }}>
            Aberta por <strong>{ocorrencia.criado_por_nome || '—'}</strong> em {formatDate(ocorrencia.created_at)}
          </p>

          {/* Descrição */}
          <div className="form-group">
            <label>Descrição</label>
            <div className="modal-info" style={{ marginBottom: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {ocorrencia.descricao}
            </div>
          </div>

          {/* Resposta existente (leitura para não-síndico) */}
          {!isSindicoOrStaff && ocorrencia.resposta && (
            <div className="form-group">
              <label>Resposta do Síndico</label>
              <div className="modal-info" style={{ marginBottom: 0, background: '#f0fdf4', color: '#166534', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {ocorrencia.resposta}
              </div>
              {ocorrencia.respondido_por_nome && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                  Respondido por <strong>{ocorrencia.respondido_por_nome}</strong>{' '}
                  em {formatDate(ocorrencia.respondido_em)}
                </p>
              )}
            </div>
          )}

          {/* Formulário de resposta (síndico/staff) */}
          {isSindicoOrStaff && (
            <>
              <div className="form-group">
                <label>Status</label>
                <select value={statusEdit} onChange={(e) => setStatusEdit(e.target.value)}>
                  <option value="aberta">Aberta</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="resolvida">Resolvida</option>
                  <option value="fechada">Fechada</option>
                </select>
              </div>

              <div className="form-group">
                <label>Resposta</label>
                <textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Escreva sua resposta aqui..."
                  rows={4}
                />
              </div>

              {error && <span className="error-message">{error}</span>}
              {success && <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: 8 }}>{success}</p>}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Fechar
          </button>
          {isSindicoOrStaff && (
            <button type="button" className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Resposta'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OcorrenciaDetalheModal;
