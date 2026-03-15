import React, { useState } from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import '../../styles/Modal.css';

/**
 * Modal de confirmação dupla para exclusões irreversíveis.
 *
 * Props:
 *   title    — título do modal (ex: "Excluir Morador")
 *   message  — descrição do que será excluído (ex: "João Silva — Apto 101")
 *   onClose  — chamado ao cancelar / fechar
 *   onConfirm — chamado após as duas confirmações; deve retornar uma Promise
 */
function DeleteConfirm({ title = 'Confirmar Exclusão', message, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaExclamationTriangle style={{ color: '#dc2626' }} />
            {title}
          </h2>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          {step === 1 && (
            <>
              <p style={{ marginBottom: 12 }}>
                Você está prestes a excluir permanentemente:
              </p>
              {message && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontWeight: 600,
                  color: '#991b1b',
                }}>
                  {message}
                </div>
              )}
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Esta ação não pode ser desfeita. Deseja continuar?
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <p style={{ marginBottom: 16, color: '#374151' }}>
                Para confirmar, marque a caixa abaixo:
              </p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  style={{ marginTop: 3, accentColor: '#dc2626' }}
                />
                <span style={{ fontSize: '0.9rem', color: '#374151' }}>
                  Entendo que esta exclusão é <strong>irreversível</strong> e confirmo que desejo prosseguir.
                </span>
              </label>
              {error && (
                <p style={{ marginTop: 12, color: '#dc2626', fontSize: '0.85rem' }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={step === 1 ? onClose : () => { setStep(1); setChecked(false); setError(''); }}
            disabled={loading}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>

          {step === 1 && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => setStep(2)}
            >
              Continuar
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              className="btn-danger"
              onClick={handleConfirm}
              disabled={!checked || loading}
            >
              {loading ? 'Excluindo...' : 'Excluir definitivamente'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirm;
