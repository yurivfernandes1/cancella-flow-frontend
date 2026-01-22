import React, { useEffect, useState } from 'react';
import { FaSave, FaTimes, FaTrash, FaPlus } from 'react-icons/fa';
import { espacoAPI, espacoInventarioAPI } from '../../services/api';
import GenericTable from '../GenericTable';
import '../../styles/Modal.css';

export default function EditEspacoModal({ espaco, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    id: espaco?.id,
    nome: espaco?.nome || '',
    capacidade_pessoas: espaco?.capacidade_pessoas || 0,
    valor_aluguel: espaco?.valor_aluguel || 0,
    is_active: espaco?.is_active !== undefined ? espaco.is_active : true
  });
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
        valor_aluguel: parseFloat(form.valor_aluguel) || 0,
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

  // item deletion handled by inventario API; function removed as unused

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
  };

  const handleCancelEditItem = () => {
    setEditingItem(null);
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
  <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h2>Editar Espaço</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSaveEspaco}>
          <div className="modal-content" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div className="form-field" style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                    required
                    placeholder="Nome do espaço"
                  />
                  <label>Nome do Espaço*</label>
                </div>
                <div style={{ paddingLeft: 4 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    cursor: 'pointer'
                  }}>
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

              <div className="form-field" style={{ width: 80, marginBottom: 0 }}>
                <input
                  type="number"
                  min="0"
                  value={form.capacidade_pessoas}
                  onChange={(e) => setForm(prev => ({ ...prev, capacidade_pessoas: e.target.value }))}
                  placeholder="0"
                />
                <label style={{ fontSize: '0.85rem' }}>Pessoas</label>
              </div>

              <div className="form-field" style={{ width: 120, marginBottom: 0 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_aluguel}
                  onChange={(e) => setForm(prev => ({ ...prev, valor_aluguel: e.target.value }))}
                  placeholder="0.00"
                />
                <label style={{ fontSize: '0.85rem' }}>Valor (R$)</label>
              </div>
            </div>

            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

            <h3 style={{ marginBottom: 10, fontSize: '1rem', fontWeight: 600 }}>Itens do Inventário</h3>

            {/* Adicionar novo item */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={newItem.nome}
                onChange={(e) => setNewItem(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do item"
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
              <input
                type="text"
                value={newItem.codigo}
                onChange={(e) => setNewItem(prev => ({ ...prev, codigo: e.target.value }))}
                placeholder="Código"
                style={{ width: '150px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 4 }}
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="button-primary"
                style={{ padding: '8px 16px' }}
              >
                <FaPlus />
              </button>
            </div>

            {/* Lista de itens - área exclusiva de rolagem */}
            <div className="modal-table-area" style={{ marginTop: 8 }}>
              <GenericTable
                className="compact-table"
                columns={[
                  { 
                    key: 'nome', 
                    header: 'Nome',
                    width: '40%',
                    editable: true,
                    editComponent: (data, onChange) => (
                      <input
                        type="text"
                        value={data.nome || ''}
                        onChange={(e) => onChange('nome', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                      />
                    )
                  },
                  { 
                    key: 'codigo', 
                    header: 'Código',
                    width: '25%',
                    editable: true,
                    editComponent: (data, onChange) => (
                      <input
                        type="text"
                        value={data.codigo || ''}
                        onChange={(e) => onChange('codigo', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
                      />
                    )
                  },
                  { 
                    key: 'is_active', 
                    header: 'Status',
                    width: '15%',
                    editable: true,
                    render: (value) => (
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: value ? '#dcfce7' : '#fee2e2',
                        color: value ? '#15803d' : '#dc2626',
                        display: 'inline-block'
                      }}>
                        {value ? 'Ativo' : 'Inativo'}
                      </span>
                    ),
                    editComponent: (data, onChange) => (
                      <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'center' }}>
                        <input
                          type="checkbox"
                          checked={data.is_active}
                          onChange={(e) => onChange('is_active', e.target.checked)}
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#22c55e' }}
                        />
                      </label>
                    )
                  },
                  { 
                    key: 'actions', 
                    header: 'Ações',
                    width: '20%'
                  }
                ]}
                data={inventario}
                loading={loadingInventario}
                totalPages={invTotalPages}
                currentPage={invPage}
                onPageChange={(next) => {
                  const target = Math.min(Math.max(1, next), invTotalPages || 1);
                  if (target !== invPage) loadInventario(target);
                }}
                editingRowId={editingItem?.id}
                onSave={handleSaveItem}
                onEdit={handleEditItem}
                onCancel={handleCancelEditItem}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
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
