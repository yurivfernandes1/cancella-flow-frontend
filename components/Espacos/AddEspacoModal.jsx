import React, { useState } from 'react';
import { FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { espacoAPI, espacoInventarioAPI } from '../../services/api';
import '../../styles/Modal.css';

export default function AddEspacoModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    nome: '',
    capacidade_pessoas: 0,
    valor_aluguel: 0,
    is_active: true
  });
  const [inventario, setInventario] = useState([]);
  const [newItem, setNewItem] = useState({ nome: '', codigo: '' });
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    if (!newItem.nome.trim() || !newItem.codigo.trim()) {
      alert('Preencha nome e código do item');
      return;
    }
    setInventario(prev => [...prev, { ...newItem, is_active: true, tempId: Date.now() }]);
    setNewItem({ nome: '', codigo: '' });
  };

  const handleRemoveItem = (tempId) => {
    setInventario(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      alert('Informe o nome do espaço');
      return;
    }

    try {
      setLoading(true);
      const respEspaco = await espacoAPI.create({
        nome: form.nome.trim(),
        capacidade_pessoas: Number(form.capacidade_pessoas) || 0,
        valor_aluguel: parseFloat(form.valor_aluguel) || 0,
        is_active: form.is_active
      });

      const espacoId = respEspaco.data.id;

      for (const item of inventario) {
        await espacoInventarioAPI.create({
          espaco: espacoId,
          nome: item.nome.trim(),
          codigo: item.codigo.trim(),
          is_active: item.is_active
        });
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao criar espaço:', err);
      alert('Erro ao criar espaço: ' + (err.response?.data?.error || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860, width: '95%' }}>
        <div className="modal-header">
          <h2>Novo Espaço</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content" style={{ padding: '24px' }}>

            {/* Campos principais */}
            <div style={{ display: 'flex', gap: 16, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div className="form-field" style={{ flex: '1 1 260px', minWidth: 0 }}>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  required
                  placeholder="Nome do espaço"
                />
                <label>Nome*</label>
              </div>

              <div className="form-field" style={{ width: 110, flexShrink: 0 }}>
                <input
                  type="number"
                  min="0"
                  value={form.capacidade_pessoas}
                  onChange={(e) => setForm(prev => ({ ...prev, capacidade_pessoas: e.target.value }))}
                  placeholder="0"
                />
                <label>Pessoas</label>
              </div>

              <div className="form-field" style={{ width: 140, flexShrink: 0 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_aluguel}
                  onChange={(e) => setForm(prev => ({ ...prev, valor_aluguel: e.target.value }))}
                  placeholder="0.00"
                />
                <label>Valor (R$)</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 8, flexShrink: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {form.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </label>
              </div>
            </div>

            <hr style={{ margin: '0 0 1.25rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

            <h3 style={{ marginBottom: 12, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
              Itens do Inventário
            </h3>

            {/* Linha de adição de item */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newItem.nome}
                onChange={(e) => setNewItem(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do item"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                style={{ flex: '1 1 200px', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', outline: 'none' }}
              />
              <input
                type="text"
                value={newItem.codigo}
                onChange={(e) => setNewItem(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder="Código"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                style={{ width: 160, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', outline: 'none' }}
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="button-primary"
                style={{ padding: '9px 18px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FaPlus /> Adicionar
              </button>
            </div>

            {/* Tabela de itens */}
            {inventario.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#2abb98', color: 'white' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.map((item, index) => (
                      <tr
                        key={item.tempId}
                        style={{ borderTop: index > 0 ? '1px solid #f1f5f9' : 'none', background: index % 2 === 0 ? 'white' : '#fafafa' }}
                      >
                        <td style={{ padding: '10px 14px' }}>{item.nome}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.codigo}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: item.is_active ? '#dcfce7' : '#fee2e2',
                            color: item.is_active ? '#15803d' : '#dc2626',
                          }}>
                            {item.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.tempId)}
                            title="Remover item"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 6,
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {inventario.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
                Nenhum item adicionado ainda.
              </p>
            )}
          </div>

          <div className="modal-footer" style={{ marginTop: 0 }}>
            <button type="button" className="button-secondary" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className="button-primary" disabled={loading}>
              <FaSave /> {loading ? 'Salvando...' : 'Salvar Espaço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
