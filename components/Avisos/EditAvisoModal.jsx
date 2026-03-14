import React, { useEffect, useState } from 'react';
import { FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import Select from 'react-select';
import { avisoAPI } from '../../services/api';
import '../../styles/Modal.css';

export default function EditAvisoModal({ aviso, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    id: aviso?.id,
    titulo: aviso?.titulo || '',
    descricao: aviso?.descricao || '',
    grupos: Array.isArray(aviso?.grupos) && aviso.grupos.length
      ? aviso.grupos
      : (aviso?.grupo ? [aviso.grupo] : []),
    prioridade: aviso?.prioridade || 'media',
    status: aviso?.status || 'ativo',
    data_inicio: aviso?.data_inicio || '',
    data_fim: aviso?.data_fim || '',
  });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const prioridadeOptions = [
    { value: 'baixa', label: 'Baixa' },
    { value: 'media', label: 'Média' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' },
  ];
  const statusOptions = [
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const resp = await avisoAPI.groupsOptions();
        const opts = (resp.data || []).map(g => ({ value: g.id, label: g.name }));
        setGroups([{ value: '__all__', label: 'Enviar para todos os perfis' }, ...opts]);
      } catch (e) {
        setGroups([]);
      }
    })();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.grupos.length) {
      alert('Selecione ao menos um grupo destinatário.');
      return;
    }
    try {
      setLoading(true);
      const realGroupOptions = groups.filter((opt) => opt.value !== '__all__');
      const enviarParaTodos =
        realGroupOptions.length > 0 &&
        realGroupOptions.every((opt) => form.grupos.includes(opt.value));

      const payload = {
        titulo: form.titulo?.trim() || '',
        descricao: form.descricao?.trim() || '',
        grupo: form.grupos[0],
        grupos: form.grupos,
        enviar_para_todos: enviarParaTodos,
        prioridade: form.prioridade,
        status: form.status,
        data_inicio: form.data_inicio ? new Date(form.data_inicio).toISOString() : null,
        data_fim: form.data_fim ? new Date(form.data_fim).toISOString() : null,
      };
      await avisoAPI.patch(form.id, payload);
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao salvar aviso:', err);
      alert('Erro ao salvar aviso.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
    try {
      setLoading(true);
      await avisoAPI.delete(form.id);
      onDeleted?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao excluir aviso:', err);
      alert('Erro ao excluir aviso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Aviso</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-content">
            <div className="form-field">
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                required
                placeholder="Título do aviso"
              />
              <label>Título*</label>
            </div>

            <div className="form-field">
              <textarea
                rows={4}
                value={form.descricao}
                onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição"
                style={{ resize: 'vertical' }}
              />
              <label>Descrição</label>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label>Grupos*</label>
                <Select
                  options={groups}
                  value={groups.filter((opt) => {
                    if (opt.value === '__all__') {
                      const ids = groups
                        .filter((item) => item.value !== '__all__')
                        .map((item) => item.value);
                      return ids.length > 0 && ids.every((id) => form.grupos.includes(id));
                    }
                    return form.grupos.includes(opt.value);
                  })}
                  onChange={(opts) => {
                    const selected = Array.isArray(opts) ? opts : [];
                    const hasAll = selected.some((opt) => opt.value === '__all__');

                    if (hasAll) {
                      const allIds = groups
                        .filter((item) => item.value !== '__all__')
                        .map((item) => item.value);
                      setForm((prev) => ({ ...prev, grupos: allIds }));
                      return;
                    }

                    setForm((prev) => ({
                      ...prev,
                      grupos: selected.map((item) => item.value),
                    }));
                  }}
                  placeholder="Selecione um ou mais grupos"
                  isMulti
                  closeMenuOnSelect={false}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: 36,
                      borderColor: state.isFocused ? '#2abb98' : '#cbd5e1',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(42,187,152,.15)' : 'none',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>
              <div className="form-field">
                <label>Prioridade*</label>
                <Select
                  options={prioridadeOptions}
                  value={prioridadeOptions.find(o => o.value === form.prioridade) || null}
                  onChange={(opt) => setForm(prev => ({ ...prev, prioridade: opt ? opt.value : 'media' }))}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: 36,
                      borderColor: state.isFocused ? '#2abb98' : '#cbd5e1',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(42,187,152,.15)' : 'none',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label>Status*</label>
                <Select
                  options={statusOptions}
                  value={statusOptions.find(o => o.value === form.status) || null}
                  onChange={(opt) => setForm(prev => ({ ...prev, status: opt ? opt.value : 'ativo' }))}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      minHeight: 36,
                      borderColor: state.isFocused ? '#2abb98' : '#cbd5e1',
                      boxShadow: state.isFocused ? '0 0 0 2px rgba(42,187,152,.15)' : 'none',
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>
              <div />
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <input
                  type="datetime-local"
                  value={form.data_inicio ? new Date(form.data_inicio).toISOString().slice(0,16) : ''}
                  onChange={(e) => setForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                  required
                />
                <label>Início*</label>
              </div>
              <div className="form-field">
                <input
                  type="datetime-local"
                  value={form.data_fim ? new Date(form.data_fim).toISOString().slice(0,16) : ''}
                  onChange={(e) => setForm(prev => ({ ...prev, data_fim: e.target.value }))}
                />
                <label>Fim</label>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="button-secondary" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="button-secondary" onClick={handleDelete} disabled={loading}>
                <FaTrash /> Excluir
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
