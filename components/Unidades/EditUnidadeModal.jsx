import React, { useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import '../../styles/Modal.css';

export default function EditUnidadeModal({ unidade, onClose, onSaved }) {
  const [form, setForm] = useState({
    numero: unidade?.numero || '',
    bloco: unidade?.bloco || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.numero?.trim()) {
      alert('O número da unidade é obrigatório.');
      return;
    }
    try {
      setLoading(true);
      await api.patch(`/cadastros/unidades/${unidade.id}/update/`, {
        numero: form.numero.trim(),
        bloco: form.bloco.trim(),
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao salvar unidade:', err);
      alert('Erro ao salvar unidade: ' + (err.response?.data?.error || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>Editar Unidade</h2>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-content">
            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>Número*</label>
              <input
                type="text"
                className="form-input"
                value={form.numero}
                onChange={(e) => setForm(prev => ({ ...prev, numero: e.target.value }))}
                placeholder="Ex: 101"
                required
              />
            </div>
            <div className="form-field">
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#374151' }}>Bloco</label>
              <input
                type="text"
                className="form-input"
                value={form.bloco}
                onChange={(e) => setForm(prev => ({ ...prev, bloco: e.target.value }))}
                placeholder="Ex: A (opcional)"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="button-secondary" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className="button-primary" disabled={loading}>
              <FaSave /> {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
