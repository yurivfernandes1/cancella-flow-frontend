import React, { useEffect, useState } from 'react';
import { FaSave, FaTimes, FaTrash, FaPlus, FaEdit, FaCheck } from 'react-icons/fa';
import { espacoAPI, espacoInventarioAPI } from '../../services/api';
import '../../styles/Modal.css';

export default function EditEspacoModal({ espaco, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    id: espaco?.id,
    nome: espaco?.nome || '',
    capacidade_pessoas: espaco?.capacidade_pessoas ?? '',
    valor_aluguel: espaco?.valor_aluguel != null ? `R$ ${Number(espaco.valor_aluguel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
    is_active: espaco?.is_active !== undefined ? espaco.is_active : true
  });

  useEffect(() => {
    setForm({
      id: espaco?.id,
      nome: espaco?.nome || '',
      capacidade_pessoas: espaco?.capacidade_pessoas ?? '',
      valor_aluguel: espaco?.valor_aluguel != null ? `R$ ${Number(espaco.valor_aluguel).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
      is_active: espaco?.is_active !== undefined ? espaco.is_active : true
    });
  }, [espaco]);
  const [inventario, setInventario] = useState([]);
  const [newItem, setNewItem] = useState({ nome: '', codigo: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingInventario, setLoadingInventario] = useState(true);
  const [invPage, setInvPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);

  useEffect(() => {
    if (espaco?.id) {
      loadInventario(1);
    }
  }, [espaco?.id]);

  const handleSaveEspaco = async (e) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      const payload = {
        nome: form.nome?.trim() || '',
        capacidade_pessoas: Number(form.capacidade_pessoas) || 0,
        valor_aluguel: (function(v){
          if (!v) return 0;
          const num = parseFloat(String(v).replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.'));
          return isNaN(num) ? 0 : num;
        })(form.valor_aluguel),
        is_active: form.is_active
      };
      await espacoAPI.patch(form.id, payload);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao salvar espaço:', err);
      alert('Erro ao salvar espaço.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEspaco = async () => {
    if (!confirm('Tem certeza que deseja excluir este espaço? Todos os itens do inventário também serão excluídos.')) return;
    try {
      setLoading(true);
      await espacoAPI.delete(form.id);
      onDeleted?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao excluir espaço:', err);
      alert('Erro ao excluir espaço.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.nome.trim() || !newItem.codigo.trim()) {
      alert('Preencha nome e código do item');
      return;
    }

    try {
      const payload = {
        espaco: espaco.id,
        nome: newItem.nome.trim(),
        codigo: newItem.codigo.trim(),
        is_active: true
      };
      const resp = await espacoInventarioAPI.create(payload);
      setInventario(prev => [...prev, resp.data]);
      setNewItem({ nome: '', codigo: '' });
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
      alert('Erro ao adicionar item: ' + (err.response?.data?.error || ''));
    }
  };

  const handleSaveItem = async (itemId, updatedData) => {
    try {
      const payload = {
        nome: updatedData.nome?.trim() || '',
        codigo: updatedData.codigo?.trim() || '',
        is_active: updatedData.is_active
      };
      await espacoInventarioAPI.patch(itemId, payload);
      setEditingItem(null);
      // Recarregar inventário
  await loadInventario(invPage);
    } catch (err) {
      console.error('Erro ao salvar item:', err);
      alert('Erro ao salvar item.');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
  };

  const handleCancelEditItem = () => {
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Tem certeza que deseja excluir este item do inventário?')) return;
    try {
      await espacoInventarioAPI.delete(itemId);
      await loadInventario(invPage);
    } catch (err) {
      console.error('Erro ao excluir item:', err);
      alert('Erro ao excluir item: ' + (err.response?.data?.error || 'Tente novamente.'));
    }
  };

  const loadInventario = async (page = 1) => {
    try {
      setLoadingInventario(true);
      const resp = await espacoInventarioAPI.list({ espaco_id: espaco.id, page, page_size: 5 });
      const items = resp.data.results || resp.data || [];
      setInventario(items);
      setInvPage(resp.data.current_page || page || 1);
      setInvTotalPages(resp.data.num_pages || 1);
    } catch (err) {
      console.error('Erro ao carregar inventário:', err);
      setInventario([]);
      setInvPage(1);
      setInvTotalPages(1);
    } finally {
      setLoadingInventario(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-space" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 860, width: '95%' }}>
        <div className="modal-header">
          <h2>Editar Espaço</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSaveEspaco}>
          <div className="modal-content" style={{ padding: '24px' }}>

            {/* Campos principais */}
            <div style={{ display: 'flex', gap: 16, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 260px', minWidth: 0, position: 'relative' }}>
                <label>Nome do Espaço*</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  required
                  placeholder=" "
                />
              </div>

              <div className="form-group small-field" style={{ width: 110, flexShrink: 0, position: 'relative' }}>
                <label>Pessoas</label>
                <input
                  type="number"
                  min="0"
                  value={form.capacidade_pessoas}
                  onChange={(e) => setForm(prev => ({ ...prev, capacidade_pessoas: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder=" "
                  style={{ width: '100%', marginTop: 0 }}
                />
              </div>

              <div className="form-group small-field" style={{ width: 140, flexShrink: 0, position: 'relative' }}>
                <label>Valor (R$)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.valor_aluguel}
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, '');
                    if (!onlyDigits) {
                      setForm(prev => ({ ...prev, valor_aluguel: '' }));
                      return;
                    }
                    const number = parseInt(onlyDigits, 10);
                    const formatted = (number / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    setForm(prev => ({ ...prev, valor_aluguel: `R$ ${formatted}` }));
                  }}
                  placeholder=" "
                  style={{ width: '100%', marginTop: 0 }}
                />
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
            <div className="inventory-add-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                className="item-name"
                value={newItem.nome}
                onChange={(e) => setNewItem(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do item"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                style={{ height: 44, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', minWidth: 0, flex: '1 1 220px' }}
              />
              <input
                type="text"
                className="item-code"
                value={newItem.codigo}
                onChange={(e) => setNewItem(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder="Código"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                style={{ height: 44, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', minWidth: 0, flex: '0 0 140px' }}
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="button-primary add-button"
                style={{ height: 44, minWidth: 120, padding: '0 18px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: 'auto', alignSelf: 'center', flex: '0 0 auto' }}
              >
                <FaPlus /> Adicionar
              </button>
            </div>

            {/* Tabela de itens */}
            {loadingInventario ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>Carregando...</p>
            ) : inventario.length > 0 ? (
              <>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: '#2abb98', color: 'white' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Nome</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Código</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, width: 110 }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventario.map((item, index) => {
                        const isEditing = editingItem?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            style={{ borderTop: index > 0 ? '1px solid #f1f5f9' : 'none', background: index % 2 === 0 ? 'white' : '#fafafa' }}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingItem.nome}
                                  onChange={(e) => setEditingItem(prev => ({ ...prev, nome: e.target.value }))}
                                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem' }}
                                />
                              ) : item.nome}
                            </td>
                            <td style={{ padding: '10px 14px', color: isEditing ? 'inherit' : '#64748b' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingItem.codigo}
                                  onChange={(e) => setEditingItem(prev => ({ ...prev, codigo: e.target.value }))}
                                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.875rem' }}
                                />
                              ) : item.codigo}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              {isEditing ? (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingItem.is_active}
                                    onChange={(e) => setEditingItem(prev => ({ ...prev, is_active: e.target.checked }))}
                                    style={{ width: 16, height: 16, accentColor: '#22c55e' }}
                                  />
                                  <span style={{ fontSize: '0.8rem' }}>{editingItem.is_active ? 'Ativo' : 'Inativo'}</span>
                                </label>
                              ) : (
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
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: 4 }}>
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveItem(item.id, editingItem)}
                                      title="Salvar"
                                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: '1rem' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                      <FaCheck />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditItem}
                                      title="Cancelar"
                                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: '1rem' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                      <FaTimes />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditItem(item)}
                                      title="Editar item"
                                      style={{ background: 'none', border: 'none', color: '#2abb98', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: '1rem' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(item.id)}
                                      title="Excluir item"
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6, borderRadius: 4, display: 'inline-flex', alignItems: 'center', fontSize: '1rem' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                      <FaTrash />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Paginação */}
                {invTotalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12, fontSize: '0.875rem', color: '#64748b' }}>
                    <button
                      type="button"
                      onClick={() => loadInventario(invPage - 1)}
                      disabled={invPage <= 1}
                      style={{ padding: '5px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: invPage <= 1 ? 'not-allowed' : 'pointer', color: invPage <= 1 ? '#cbd5e1' : '#64748b' }}
                    >
                      Anterior
                    </button>
                    <span>Página {invPage} de {invTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => loadInventario(invPage + 1)}
                      disabled={invPage >= invTotalPages}
                      style={{ padding: '5px 14px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', cursor: invPage >= invTotalPages ? 'not-allowed' : 'pointer', color: invPage >= invTotalPages ? '#cbd5e1' : '#64748b' }}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '16px 0' }}>
                Nenhum item no inventário. Adicione itens acima.
              </p>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 0 }}>
            <button type="button" className="button-secondary" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="button-secondary" onClick={handleDeleteEspaco} disabled={loading}>
                <FaTrash /> Excluir Espaço
              </button>
              <button type="submit" className="button-primary" disabled={loading}>
                <FaSave /> {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
