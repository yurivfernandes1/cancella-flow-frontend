import React, { useState, useRef } from 'react';
import {
  FaChevronDown, FaChevronRight,
  FaEdit, FaCheck, FaTimes,
  FaUserPlus, FaTrash, FaKey, FaUpload,
} from 'react-icons/fa';
import api, { condominioAPI } from '../../services/api';
import ProtectedImage from '../common/ProtectedImage';
import PasswordResetModal from '../Users/PasswordResetModal';
import { formatTelefone, formatCPFCNPJ } from '../../utils/formatters';
import { generateStrongPassword } from '../../utils/passwordGenerator';
import '../../styles/GenericMobileCard.css';
import '../../styles/UnitsCards.css';

/* ── helpers ──────────────────────────────────────────────────── */

const fmtCNPJ = (v = '') =>
  v.replace(/\D/g, '')
   .replace(/^(\d{2})(\d)/, '$1.$2')
   .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
   .replace(/\.(\d{3})(\d)/, '.$1/$2')
   .replace(/(\d{4})(\d)/, '$1-$2')
   .slice(0, 18);

const fmtCEP = (v = '') =>
  v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);

const fmtPhone = (v = '') => formatTelefone(String(v).replace(/\D/g, '').slice(0, 11));

/* ── Component ────────────────────────────────────────────────── */

function ExpandableCondominiosTable({
  condominios = [],
  loading = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRefresh,
  onAddSindico,
}) {
  const [expandedRows, setExpandedRows]     = useState({});
  const [editingCondId, setEditingCondId]   = useState(null);
  const [editCondData, setEditCondData]     = useState({});
  const [logoFile, setLogoFile]             = useState(null);
  const [logoPreview, setLogoPreview]       = useState(null);
  const [savingCond, setSavingCond]         = useState(false);
  const [editingSindId, setEditingSindId]   = useState(null);
  const [editSindData, setEditSindData]     = useState({});
  const [savingSind, setSavingSind]         = useState(false);
  const [createdSindico, setCreatedSindico] = useState(null);
  const logoInputRef = useRef(null);

  /* ── condomínio edit ── */
  const startEditCond = (cond, e) => {
    e?.stopPropagation();
    setEditingCondId(cond.id);
    setEditCondData({
      nome: cond.nome || '',
      cep: cond.cep || '',
      numero: cond.numero || '',
      complemento: cond.complemento || '',
      cnpj: cond.cnpj || '',
      telefone: cond.telefone || '',
      is_ativo: cond.is_ativo !== false,
    });
    setLogoFile(null);
    setLogoPreview(null);
    setExpandedRows(prev => ({ ...prev, [cond.id]: true }));
  };

  const cancelEditCond = (e) => {
    e?.stopPropagation();
    setEditingCondId(null);
    setEditCondData({});
    setLogoFile(null);
    if (logoPreview) { URL.revokeObjectURL(logoPreview); setLogoPreview(null); }
  };

  const saveCond = async (e) => {
    e?.stopPropagation();
    if (!editCondData.nome?.trim()) { alert('Nome é obrigatório.'); return; }
    try {
      setSavingCond(true);
      const payload = {
        nome: editCondData.nome.trim(),
        cep: editCondData.cep.replace(/\D/g, ''),
        numero: editCondData.numero.trim(),
        complemento: editCondData.complemento.trim(),
        cnpj: editCondData.cnpj.replace(/\D/g, ''),
        telefone: editCondData.telefone.replace(/\D/g, ''),
        is_ativo: editCondData.is_ativo,
      };
      await condominioAPI.patch(editingCondId, payload);
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        await condominioAPI.uploadLogoDb(editingCondId, fd);
      }
      setEditingCondId(null);
      setEditCondData({});
      setLogoFile(null);
      if (logoPreview) { URL.revokeObjectURL(logoPreview); setLogoPreview(null); }
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Erro ao salvar condomínio.');
      console.error(err);
    } finally {
      setSavingCond(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const valid = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!valid.includes(file.type)) { alert('Use PNG, JPG ou SVG.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Máximo 2 MB.'); return; }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setLogoFile(file);
  };

  /* ── síndico edit ── */
  const startEditSind = (s) => {
    setEditingSindId(s.id);
    setEditSindData({
      full_name: s.full_name || '',
      username: s.username || '',
      email: s.email || '',
      phone: s.phone || '',
      is_active: s.is_active !== false,
    });
  };

  const cancelEditSind = () => { setEditingSindId(null); setEditSindData({}); };

  const saveSind = async () => {
    if (!editSindData.full_name?.trim()) { alert('Nome é obrigatório.'); return; }
    try {
      setSavingSind(true);
      await api.patch(`/access/profile/${editingSindId}/`, {
        full_name: editSindData.full_name.trim(),
        username: editSindData.username.trim(),
        email: editSindData.email.trim(),
        phone: editSindData.phone.replace(/\D/g, ''),
        is_active: editSindData.is_active,
      });
      setEditingSindId(null);
      setEditSindData({});
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Erro ao salvar síndico.');
      console.error(err);
    } finally {
      setSavingSind(false);
    }
  };

  const removeSind = async (sindId, nome) => {
    if (!window.confirm(`Remover "${nome}" do condomínio?`)) return;
    try {
      await api.patch(`/access/profile/${sindId}/`, { condominio_id: null });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Erro ao remover síndico.');
      console.error(err);
    }
  };

  const resetSindPass = async (sindId, username) => {
    if (!window.confirm('Gerar nova senha para este síndico?')) return;
    const nova = generateStrongPassword();
    try {
      await api.patch(`/access/profile/${sindId}/`, { password: nova });
      setCreatedSindico({ username, password: nova });
    } catch (err) {
      alert('Erro ao redefinir senha.');
      console.error(err);
    }
  };

  const toggleRow = (id) => {
    if (editingCondId === id) return;
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Carregando...</div>;
  if (!condominios.length) return <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum condomínio encontrado.</div>;

  return (
    <>
      <div className="users-cards-wrapper">
        <div className="units-cards-grid">
          {condominios.map(cond => {
            const isExp = expandedRows[cond.id];
            const isEditCond = editingCondId === cond.id;
            const sindicos = cond.sindicos || [];
            const isAtivo = cond.is_ativo !== false;

            return (
              <div
                key={cond.id}
                className={`unit-card ${isExp ? 'unit-card--expanded' : ''} ${!isAtivo ? 'unit-card--inactive' : ''}`}
              >
                {/* Header */}
                <div
                  className="unit-card__header"
                  style={{ cursor: isEditCond ? 'default' : 'pointer' }}
                  onClick={() => !isEditCond && toggleRow(cond.id)}
                >
                  <div className="unit-card__header-left">
                    {cond.logo_url && (
                      <ProtectedImage
                        src={cond.logo_url}
                        alt="Logo"
                        style={{
                          width: 28, height: 28, objectFit: 'contain',
                          borderRadius: 4, flexShrink: 0,
                          background: 'rgba(255,255,255,0.15)',
                        }}
                      />
                    )}
                    <span className="unit-card__title">{cond.nome}</span>
                  </div>
                  <div className="unit-card__header-right">
                    <span className={`unit-card__status-badge ${isAtivo ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="unit-card__chevron">
                      {isExp ? <FaChevronDown /> : <FaChevronRight />}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div
                  className="unit-card__summary"
                  style={{ cursor: isEditCond ? 'default' : 'pointer' }}
                  onClick={() => !isEditCond && toggleRow(cond.id)}
                >
                  <div className="unit-card__info">
                    {cond.cnpj && (
                      <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <span className="unit-card__info-label">CNPJ</span>
                        <span className="unit-card__info-value" style={{ fontSize: '0.85rem' }}>{formatCPFCNPJ(cond.cnpj)}</span>
                      </div>
                    )}
                    {cond.telefone && (
                      <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <span className="unit-card__info-label">Telefone</span>
                        <span className="unit-card__info-value" style={{ fontSize: '0.85rem', fontWeight: 400 }}>{formatTelefone(cond.telefone)}</span>
                      </div>
                    )}
                    <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span className="unit-card__info-label">Síndicos</span>
                      <span style={{
                        display: 'inline-block',
                        background: sindicos.length ? '#dbeafe' : '#f1f5f9',
                        color: sindicos.length ? '#1d4ed8' : '#94a3b8',
                        borderRadius: 12, padding: '1px 8px',
                        fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        {sindicos.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded section */}
                {isExp && (
                  <div className="unit-card__residents" onClick={e => e.stopPropagation()}>
                    {isEditCond ? (
                      /* ── Edit form ── */
                      <div className="unit-card__edit-form">
                        <div className="unit-card__edit-row">
                          <div className="unit-card__edit-field" style={{ flex: 2 }}>
                            <label className="unit-card__edit-label">Nome</label>
                            <input
                              className="mobile-edit-input"
                              value={editCondData.nome}
                              onChange={e => setEditCondData(p => ({ ...p, nome: e.target.value }))}
                              placeholder="Nome do condomínio"
                            />
                          </div>
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">Telefone</label>
                            <input
                              className="mobile-edit-input"
                              value={fmtPhone(editCondData.telefone)}
                              maxLength={15}
                              placeholder="(00) 00000-0000"
                              onChange={e => setEditCondData(p => ({ ...p, telefone: e.target.value.replace(/\D/g, '') }))}
                            />
                          </div>
                        </div>

                        <div className="unit-card__edit-row">
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">CNPJ</label>
                            <input
                              className="mobile-edit-input"
                              value={fmtCNPJ(editCondData.cnpj)}
                              maxLength={18}
                              placeholder="XX.XXX.XXX/XXXX-XX"
                              onChange={e => setEditCondData(p => ({ ...p, cnpj: e.target.value.replace(/\D/g, '') }))}
                            />
                          </div>
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">CEP</label>
                            <input
                              className="mobile-edit-input"
                              value={fmtCEP(editCondData.cep)}
                              maxLength={9}
                              placeholder="XXXXX-XXX"
                              onChange={e => setEditCondData(p => ({ ...p, cep: e.target.value.replace(/\D/g, '') }))}
                            />
                          </div>
                        </div>

                        <div className="unit-card__edit-row">
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">Número</label>
                            <input
                              className="mobile-edit-input"
                              value={editCondData.numero}
                              maxLength={10}
                              onChange={e => setEditCondData(p => ({ ...p, numero: e.target.value }))}
                            />
                          </div>
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">Complemento</label>
                            <input
                              className="mobile-edit-input"
                              value={editCondData.complemento}
                              maxLength={100}
                              onChange={e => setEditCondData(p => ({ ...p, complemento: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="unit-card__edit-row">
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Preview"
                                  style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #e2e8f0' }}
                                />
                              ) : cond.logo_url ? (
                                <ProtectedImage
                                  src={cond.logo_url}
                                  alt="Logo"
                                  style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #e2e8f0' }}
                                />
                              ) : null}
                              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                              <button
                                type="button"
                                className="unit-card__action-btn unit-card__action-btn--outline"
                                onClick={() => logoInputRef.current?.click()}
                              >
                                <FaUpload style={{ marginRight: 4 }} /> Alterar
                              </button>
                            </div>
                          </div>
                          <div className="unit-card__edit-field" style={{ justifyContent: 'flex-end' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#334155', cursor: 'pointer', marginTop: 'auto', paddingBottom: 4 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(editCondData.is_ativo)}
                                onChange={e => setEditCondData(p => ({ ...p, is_ativo: e.target.checked }))}
                                style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                              />
                              Ativo
                            </label>
                          </div>
                        </div>

                        <div className="unit-card__edit-actions">
                          <button className="save-button" disabled={savingCond} onClick={saveCond}>
                            <FaCheck style={{ marginRight: 4 }} /> Salvar
                          </button>
                          <button className="cancel-button" onClick={cancelEditCond}>
                            <FaTimes style={{ marginRight: 4 }} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── View + síndicos ── */
                      <>
                        <div className="unit-card__residents-header">
                          <span className="unit-card__residents-title">Síndicos</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="unit-card__action-btn unit-card__action-btn--outline"
                              onClick={(e) => startEditCond(cond, e)}
                            >
                              <FaEdit style={{ marginRight: 4 }} /> Editar
                            </button>
                            {onAddSindico && (
                              <button
                                className="unit-card__action-btn"
                                style={{ background: '#2abb98', color: 'white' }}
                                onClick={() => onAddSindico(cond.id)}
                              >
                                <FaUserPlus style={{ marginRight: 4 }} /> Adicionar
                              </button>
                            )}
                          </div>
                        </div>

                        {sindicos.length === 0 ? (
                          <p className="unit-card__no-residents">Nenhum síndico vinculado.</p>
                        ) : (
                          <div className="unit-card__residents-list">
                            {sindicos.map(s => {
                              const isEditThis = editingSindId === s.id;
                              return (
                                <div key={s.id} className="unit-card__resident-item">
                                  {isEditThis ? (
                                    <div className="unit-card__resident-edit">
                                      <div className="unit-card__edit-row">
                                        <div className="unit-card__edit-field">
                                          <label className="unit-card__edit-label">Nome</label>
                                          <input
                                            className="mobile-edit-input"
                                            value={editSindData.full_name}
                                            onChange={e => setEditSindData(p => ({ ...p, full_name: e.target.value }))}
                                          />
                                        </div>
                                        <div className="unit-card__edit-field">
                                          <label className="unit-card__edit-label">Usuário</label>
                                          <input
                                            className="mobile-edit-input"
                                            value={editSindData.username}
                                            onChange={e => setEditSindData(p => ({ ...p, username: e.target.value }))}
                                          />
                                        </div>
                                      </div>
                                      <div className="unit-card__edit-row">
                                        <div className="unit-card__edit-field">
                                          <label className="unit-card__edit-label">E-mail</label>
                                          <input
                                            className="mobile-edit-input"
                                            type="email"
                                            value={editSindData.email}
                                            onChange={e => setEditSindData(p => ({ ...p, email: e.target.value }))}
                                          />
                                        </div>
                                        <div className="unit-card__edit-field">
                                          <label className="unit-card__edit-label">Telefone</label>
                                          <input
                                            className="mobile-edit-input"
                                            value={fmtPhone(editSindData.phone)}
                                            maxLength={15}
                                            placeholder="(00) 00000-0000"
                                            onChange={e => setEditSindData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                          />
                                        </div>
                                      </div>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#334155', cursor: 'pointer', marginBottom: 8 }}>
                                        <input
                                          type="checkbox"
                                          checked={editSindData.is_active}
                                          onChange={e => setEditSindData(p => ({ ...p, is_active: e.target.checked }))}
                                          style={{ width: 16, height: 16, accentColor: '#2abb98' }}
                                        />
                                        Ativo
                                      </label>
                                      <div className="unit-card__edit-actions">
                                        <button className="save-button" disabled={savingSind} onClick={saveSind}>
                                          <FaCheck style={{ marginRight: 4 }} /> Salvar
                                        </button>
                                        <button className="cancel-button" onClick={cancelEditSind}>
                                          <FaTimes style={{ marginRight: 4 }} /> Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="unit-card__resident-view">
                                      <div className="unit-card__resident-info">
                                        <span className="unit-card__resident-name">{s.full_name || '-'}</span>
                                        <span className="unit-card__resident-cpf">@{s.username}</span>
                                        {s.email && <span className="unit-card__resident-phone">{s.email}</span>}
                                        <span className={`unit-card__status-badge ${s.is_active ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`} style={{ fontSize: '0.7rem' }}>
                                          {s.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                      </div>
                                      <div className="unit-card__resident-actions">
                                        <button className="edit-button" title="Editar" onClick={() => startEditSind(s)}>
                                          <FaEdit />
                                        </button>
                                        <button className="reset-button" title="Redefinir senha" onClick={() => resetSindPass(s.id, s.username)}>
                                          <FaKey />
                                        </button>
                                        <button className="delete-button" title="Remover do condomínio" onClick={() => removeSind(s.id, s.full_name)}>
                                          <FaTrash />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pagination">
          <div className="pagination-info">
            {condominios.length > 0 ? `Página ${currentPage} de ${totalPages}` : 'Sem registros'}
          </div>
          <div className="pagination-controls">
            <button
              type="button"
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || condominios.length === 0}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || condominios.length === 0}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {createdSindico && (
        <PasswordResetModal
          title={createdSindico.username ? 'Síndico Criado' : 'Senha Redefinida'}
          subtitle={createdSindico.username ? `Usuário: ${createdSindico.username}` : undefined}
          password={createdSindico.password}
          onClose={() => setCreatedSindico(null)}
        />
      )}
    </>
  );
}

export default ExpandableCondominiosTable;
