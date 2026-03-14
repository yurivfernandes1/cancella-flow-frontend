import React, { useEffect, useState } from 'react';
import { FaBullhorn, FaSave, FaTimes } from 'react-icons/fa';
import Select from 'react-select';
import GenericDropdown from '../common/GenericDropdown';
import { avisoAPI } from '../../services/api';

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

export default function AddAvisoDropdown({ onClose, onSuccess, triggerRef }) {
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    grupos: [],
    prioridade: 'media',
    status: 'ativo',
    data_inicio: new Date().toISOString().slice(0, 16),
    data_fim: '',
  });
  const [groupOptions, setGroupOptions] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoadingGroups(true);
        const resp = await avisoAPI.groupsOptions();
        const opts = (resp.data || []).map(g => ({ value: g.id, label: g.name }));
        setGroupOptions([{ value: '__all__', label: 'Enviar para todos os perfis' }, ...opts]);
      } catch (e) {
        setGroupOptions([]);
      } finally {
        setLoadingGroups(false);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return alert('Informe o título');
    if (!form.grupos.length) return alert('Selecione ao menos um grupo destinatário');
    if (!form.data_inicio) return alert('Informe a data de início');

    try {
      const allGroupIds = groupOptions
        .filter((opt) => opt.value !== '__all__')
        .map((opt) => opt.value);
      const enviarParaTodos =
        allGroupIds.length > 0 && allGroupIds.every((id) => form.grupos.includes(id));

      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || '',
        grupo: form.grupos[0],
        grupos: form.grupos,
        enviar_para_todos: enviarParaTodos,
        prioridade: form.prioridade,
        status: form.status,
        data_inicio: new Date(form.data_inicio).toISOString(),
        data_fim: form.data_fim ? new Date(form.data_fim).toISOString() : null,
      };
      await avisoAPI.create(payload);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Erro ao criar aviso:', err);
      alert('Erro ao criar aviso: ' + (err.response?.data?.error || 'Tente novamente.'));
    }
  };

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 36,
      borderColor: state.isFocused ? '#2abb98' : '#cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(42, 187, 152, 0.15)' : 'none',
    }),
    // Deve ser maior que o zIndex usado pelo GenericDropdown (200101)
    menuPortal: (base) => ({ ...base, zIndex: 200200 }),
  };

  return (
    <GenericDropdown
      title="Novo Aviso"
      onClose={onClose}
      icon={<FaBullhorn size={18} />}
      className="add-aviso-dropdown"
      position="relative"
      triggerRef={triggerRef}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <input
            required
            type="text"
            value={form.titulo}
            onChange={e => setForm(prev => ({ ...prev, titulo: e.target.value }))}
            placeholder="Título do aviso"
            maxLength={255}
          />
          <label>Título*</label>
        </div>
        <div className="form-field">
          <textarea
            value={form.descricao}
            onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
            placeholder="Descrição do aviso"
            rows={4}
            style={{ resize: 'vertical' }}
          />
          <label>Descrição</label>
        </div>
        <div className="form-field">
          <label>Grupos*</label>
          {loadingGroups ? (
            <div style={{ padding: 8 }}>Carregando grupos...</div>
          ) : (
            <Select
              options={groupOptions}
              classNamePrefix="react-select"
              value={groupOptions.filter((opt) => {
                if (opt.value === '__all__') {
                  const ids = groupOptions
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
                  const allIds = groupOptions
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
              styles={selectStyles}
            />
          )}
        </div>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-field">
            <label>Prioridade*</label>
            <Select
              options={prioridadeOptions}
              classNamePrefix="react-select"
              value={prioridadeOptions.find(o => o.value === form.prioridade)}
              onChange={(opt) => setForm(prev => ({ ...prev, prioridade: opt?.value || 'media' }))}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={selectStyles}
            />
          </div>
          <div className="form-field">
            <label>Status*</label>
            <Select
              options={statusOptions}
              classNamePrefix="react-select"
              value={statusOptions.find(o => o.value === form.status)}
              onChange={(opt) => setForm(prev => ({ ...prev, status: opt?.value || 'ativo' }))}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              styles={selectStyles}
            />
          </div>
        </div>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-field">
            <input
              type="datetime-local"
              value={form.data_inicio}
              onChange={e => setForm(prev => ({ ...prev, data_inicio: e.target.value }))}
              required
            />
            <label>Início*</label>
          </div>
          <div className="form-field">
            <input
              type="datetime-local"
              value={form.data_fim}
              onChange={e => setForm(prev => ({ ...prev, data_fim: e.target.value }))}
            />
            <label>Fim</label>
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            <FaTimes /> Cancelar
          </button>
          <button type="submit" className="button-primary">
            <FaSave /> Publicar Aviso
          </button>
        </div>
      </form>
    </GenericDropdown>
  );
}
