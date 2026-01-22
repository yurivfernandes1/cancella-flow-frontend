import React, { useState } from 'react';
import { FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import api from '../../services/api';
import '../../styles/Modal.css';

function AddUnidadeModal({ onClose, onSuccess }) {
  const [unidades, setUnidades] = useState([
    { numero: '', bloco: '' }
  ]);
  // Modelo antigo removido: a seleção de morador agora acontece no usuário
  const [loading, setLoading] = useState(false);

  // Sem carregamento de moradores neste modal (associação mudou para o usuário)

  // handleAddRow não é usado; usamos botão inline para adicionar linhas

  const handleRemoveRow = (index) => {
    if (unidades.length === 1) {
      alert('Deve haver pelo menos uma unidade.');
      return;
    }
    const newUnidades = unidades.filter((_, i) => i !== index);
    setUnidades(newUnidades);
  };

  const handleChange = (index, field, value) => {
    const newUnidades = [...unidades];
    newUnidades[index][field] = value;
    setUnidades(newUnidades);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todas as unidades têm número
    const invalidas = unidades.filter(u => !u.numero?.trim());
    if (invalidas.length > 0) {
      alert('Todas as unidades devem ter um número informado.');
      return;
    }

    setLoading(true);

    try {
      // Preparar dados para envio
      const unidadesData = unidades.map(u => ({
        numero: u.numero.trim(),
        bloco: u.bloco?.trim() || ''
      }));

      // Se for apenas uma unidade, usar o endpoint simples
      if (unidadesData.length === 1) {
        await api.post('/cadastros/unidades/create/', unidadesData[0]);
        alert('Unidade cadastrada com sucesso!');
      } else {
        // Múltiplas unidades, usar endpoint bulk
        await api.post('/cadastros/unidades/create-bulk/', {
          unidades: unidadesData
        });
        alert(`${unidadesData.length} unidades cadastradas com sucesso!`);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao cadastrar unidades:', error);
      alert('Erro ao cadastrar unidades: ' + (error.response?.data?.error || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // Nenhum select neste modal — a associação de morador ocorre no cadastro/edição de usuário

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cadastrar Unidades</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="unidades-table-container">
              <table className="unidades-form-table">
                <thead>
                  <tr>
                    <th style={{ width: '45%' }}>Número*</th>
                    <th style={{ width: '45%' }}>Bloco</th>
                    <th style={{ width: '10%' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {unidades.map((unidade, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={unidade.numero}
                          onChange={(e) => handleChange(index, 'numero', e.target.value)}
                          placeholder="Ex: 101"
                          required
                          className="form-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={unidade.bloco}
                          onChange={(e) => handleChange(index, 'bloco', e.target.value)}
                          placeholder="Ex: A (opcional)"
                          className="form-input"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="action-button delete-button"
                          title="Remover linha"
                          disabled={unidades.length === 1}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="add-row-section" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={1}
                  placeholder="Qtd. de linhas"
                  id="bulk-add-count"
                  style={{ width: 110, padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '1rem' }}
                />
                <button
                  type="button"
                  className="add-row-button"
                  onClick={() => {
                    const input = document.getElementById('bulk-add-count');
                    const qtd = Math.max(1, Math.min(200, parseInt(input?.value || '1', 10)));
                    if (!qtd || Number.isNaN(qtd)) return;
                    const last = unidades[unidades.length - 1] || { bloco: '' };
                    const novas = Array.from({ length: qtd }, () => ({ numero: '', bloco: last.bloco || '' }));
                    setUnidades([...unidades, ...novas]);
                    input.value = '1';
                  }}
                >
                  <FaPlus /> Adicionar Linhas
                </button>
              </div>
              <span className="helper-text">
                As novas linhas copiarão o bloco da última linha
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="button-secondary" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className="button-primary" disabled={loading}>
              <FaSave /> {loading ? 'Salvando...' : `Cadastrar ${unidades.length} Unidade${unidades.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUnidadeModal;
