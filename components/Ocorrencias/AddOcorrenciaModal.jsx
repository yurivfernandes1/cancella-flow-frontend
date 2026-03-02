import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { ocorrenciaAPI } from '../../services/api';
import '../../styles/Modal.css';

function AddOcorrenciaModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ tipo: 'problema', titulo: '', descricao: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.descricao.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ocorrenciaAPI.create(form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar ocorrência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nova Ocorrência</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label htmlFor="tipo">Tipo</label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="problema">Problema</option>
                <option value="sugestao">Sugestão</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="titulo">
                Título <span className="required">*</span>
              </label>
              <input
                id="titulo"
                type="text"
                placeholder="Resumo da ocorrência"
                value={form.titulo}
                onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                maxLength={255}
              />
            </div>

            <div className="form-group">
              <label htmlFor="descricao">
                Descrição <span className="required">*</span>
              </label>
              <textarea
                id="descricao"
                placeholder="Descreva a ocorrência em detalhes..."
                value={form.descricao}
                onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
                rows={5}
              />
            </div>

            {error && <span className="error-message">{error}</span>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Ocorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddOcorrenciaModal;
