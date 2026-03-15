import React, { useState, useEffect, useRef } from 'react';
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
  const [expandedRows, setExpandedRows]           = useState({});
  const [editingCondId, setEditingCondId]         = useState(null);
  const [editCondData, setEditCondData]           = useState({});
  const [logoFile, setLogoFile]                   = useState(null);
  const [logoPreview, setLogoPreview]             = useState(null);
  const [savingCond, setSavingCond]               = useState(false);
  const [editingSindId, setEditingSindId]         = useState(null);
  const [editSindData, setEditSindData]           = useState({});
  const [savingSind, setSavingSind]               = useState(false);
  const [createdSindico, setCreatedSindico]       = useState(null); // { username, password }
  const [isMobile, setIsMobile]                   = useState(window.innerWidth <= 768);
  const logoInputRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ── condomínio edit ── */
  const startEditCond = (cond, e) => {
    e.stopPropagation();
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

  /* ── toggle row ── */
  const toggleRow = (id) => {
    if (editingCondId === id) return;
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── loading / empty ── */
  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Carregando...</div>;
  if (!condominios.length) return <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum condomínio encontrado.</div>;

  /* ══════════════════ MOBILE ══════════════════ */
  if (isMobile) {
    return (
      <>
        <div className="mobile-cards-container">
          {condominios.map(cond => {
            const isExp = expandedRows[cond.id];
            const isEditCond = editingCondId === cond.id;
            const sindicos = cond.sindicos || [];

            return (
              <div key={cond.id} className="mobile-card">
                <div
                  className="mobile-card-header"
                  style={{ cursor: isEditCond ? 'default' : 'pointer' }}
                  onClick={() => !isEditCond && toggleRow(cond.id)}
                >
                  <span className="card-title">
                    {isExp
                      ? <FaChevronDown style={{ marginRight: 6, fontSize: '0.85rem', flexShrink: 0 }} />
                      : <FaChevronRight style={{ marginRight: 6, fontSize: '0.85rem', flexShrink: 0 }} />}
                    {cond.nome}
                  </span>
                  {!isEditCond && (
                    <button
                      style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', padding: '4px 8px', minHeight: 44, display: 'flex', alignItems: 'center' }}
                      onClick={(e) => { e.stopPropagation(); startEditCond(cond, e); }}
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>

                <div className="mobile-card-content">
                  <div className="mobile-card-field">
                    <span className="field-label">Nome</span>
                    <span className="field-value">
                      {isEditCond
                        ? <input className="mobile-edit-input" value={editCondData.nome} onChange={e => setEditCondData(p => ({ ...p, nome: e.target.value }))} />
                        : cond.nome}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">CEP</span>
                    <span className="field-value">
                      {isEditCond
                        ? <input className="mobile-edit-input" value={fmtCEP(editCondData.cep)} maxLength={9} placeholder="XXXXX-XXX" onChange={e => setEditCondData(p => ({ ...p, cep: e.target.value.replace(/\D/g, '') }))} />
                        : (cond.cep ? fmtCEP(cond.cep) : '-')}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">Número</span>
                    <span className="field-value">
                      {isEditCond
                        ? <input className="mobile-edit-input" value={editCondData.numero} maxLength={10} onChange={e => setEditCondData(p => ({ ...p, numero: e.target.value }))} />
                        : (cond.numero || '-')}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">Complemento</span>
                    <span className="field-value">
                      {isEditCond
                        ? <input className="mobile-edit-input" value={editCondData.complemento} maxLength={100} onChange={e => setEditCondData(p => ({ ...p, complemento: e.target.value }))} />
                        : (cond.complemento || '-')}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">CNPJ</span>
                    <span className="field-value">
                      {isEditCond
                        ? <input className="mobile-edit-input" value={fmtCNPJ(editCondData.cnpj)} maxLength={18} placeholder="XX.XXX.XXX/XXXX-XX" onChange={e => setEditCondData(p => ({ ...p, cnpj: e.target.value.replace(/\D/g, '') }))} />
                        : (cond.cnpj ? formatCPFCNPJ(cond.cnpj) : '-')}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">Telefone</span>
                    <span className="field-value">
                      {isEditCond
                        ? <input className="mobile-edit-input" value={fmtPhone(editCondData.telefone)} maxLength={15} placeholder="(00) 00000-0000" onChange={e => setEditCondData(p => ({ ...p, telefone: e.target.value.replace(/\D/g, '') }))} />
                        : (cond.telefone ? formatTelefone(cond.telefone) : '-')}
                    </span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">Status</span>
                    <span className="field-value">
                      {isEditCond
                        ? <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={editCondData.is_ativo} onChange={e => setEditCondData(p => ({ ...p, is_ativo: e.target.checked }))} /> Ativo</label>
                        : <span className={cond.is_ativo ? 'status-active' : 'status-inactive'}>{cond.is_ativo ? 'Ativo' : 'Inativo'}</span>}
                    </span>
                  </div>

                  {isEditCond && (
                    <>
                      <div className="mobile-card-field">
                        <span className="field-label">Logo</span>
                        <span className="field-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {logoPreview
                            ? <img src={logoPreview} alt="Preview" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6 }} />
                            : cond.logo_url
                              ? <ProtectedImage src={cond.logo_url} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6 }} />
                              : null}
                          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                          <button type="button" className="edit-button" style={{ fontSize: '0.8rem', minHeight: 36 }} onClick={() => logoInputRef.current?.click()}>
                            <FaUpload /> Alterar
                          </button>
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="save-button" disabled={savingCond} onClick={saveCond} style={{ flex: 1, minHeight: 44 }}><FaCheck style={{ marginRight: 4 }} /> Salvar</button>
                        <button className="cancel-button" onClick={cancelEditCond} style={{ flex: 1, minHeight: 44 }}><FaTimes style={{ marginRight: 4 }} /> Cancelar</button>
                      </div>
                    </>
                  )}

                  <div className="mobile-card-field">
                    <span className="field-label">Síndicos</span>
                    <span className="field-value">
                      <span style={{ display: 'inline-block', background: sindicos.length ? '#dbeafe' : '#f1f5f9', color: sindicos.length ? '#1d4ed8' : '#94a3b8', borderRadius: 12, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600 }}>
                        {sindicos.length} síndico{sindicos.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                  </div>

                  {isExp && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end' }}>
                        {onAddSindico && (
                          <button
                            className="add-user-button"
                            style={{ fontSize: '0.82rem', padding: '8px 14px', width: '100%', minHeight: 44 }}
                            onClick={() => onAddSindico(cond.id)}
                          >
                            <FaUserPlus style={{ marginRight: 6 }} /> Adicionar Síndico
                          </button>
                        )}
                      </div>
                      {sindicos.length === 0 && (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Nenhum síndico vinculado.</p>
                      )}
                      {sindicos.map(s => {
                        const isEditThis = editingSindId === s.id;
                        return (
                          <div key={s.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem', marginBottom: 8, border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', flex: 1 }}>
                                {isEditThis
                                  ? <input className="mobile-edit-input" value={editSindData.full_name} onChange={e => setEditSindData(p => ({ ...p, full_name: e.target.value }))} style={{ width: '100%' }} />
                                  : (s.full_name || '-')}
                              </span>
                              {!isEditThis && (
                                <button className="edit-button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', minHeight: 44, display: 'flex', alignItems: 'center' }} onClick={() => startEditSind(s)}>
                                  <FaEdit />
                                </button>
                              )}
                            </div>
                            {isEditThis ? (
                              <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Usuário</span>
                                  <input className="mobile-edit-input" value={editSindData.username} onChange={e => setEditSindData(p => ({ ...p, username: e.target.value }))} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>E-mail</span>
                                  <input className="mobile-edit-input" type="email" value={editSindData.email} onChange={e => setEditSindData(p => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Telefone</span>
                                  <input className="mobile-edit-input" type="text" value={fmtPhone(editSindData.phone)} maxLength={15} onChange={e => setEditSindData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} placeholder="(00) 00000-0000" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={editSindData.is_active} onChange={e => setEditSindData(p => ({ ...p, is_active: e.target.checked }))} /> Ativo</label>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="save-button" onClick={saveSind} disabled={savingSind} style={{ flex: 1, minHeight: 44 }}><FaCheck style={{ marginRight: 4 }} /> Salvar</button>
                                  <button className="cancel-button" onClick={cancelEditSind} style={{ flex: 1, minHeight: 44 }}><FaTimes style={{ marginRight: 4 }} /> Cancelar</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 2 }}>{s.username}</div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 2 }}>{s.email || '-'}</div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 6 }}>{s.phone ? formatTelefone(s.phone) : '-'}</div>
                                <span className={s.is_active ? 'status-active' : 'status-inactive'} style={{ marginBottom: 8, display: 'inline-block' }}>{s.is_active ? 'Ativo' : 'Inativo'}</span>
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                  <button className="edit-button" onClick={() => startEditSind(s)} style={{ flex: 1, minHeight: 44 }}><FaEdit style={{ marginRight: 4 }} /> Editar</button>
                                  <button className="reset-button" onClick={() => resetSindPass(s.id, s.username)} style={{ flex: 1, minHeight: 44 }}><FaKey style={{ marginRight: 4 }} /> Senha</button>
                                  <button className="delete-button" onClick={() => removeSind(s.id, s.full_name)} style={{ flex: 1, minHeight: 44 }}><FaTrash style={{ marginRight: 4 }} /> Remover</button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
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

  /* ══════════════════ DESKTOP ══════════════════ */
  return (
    <>
      <div className="table-container expandable-units-table">
        <div className="table-scroll">
          <table className="generic-table">
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 84 }} />
              <col style={{ minWidth: 140 }} />
              <col style={{ minWidth: 200 }} />
              <col style={{ minWidth: 140 }} />
              <col style={{ minWidth: 120 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th><span className="header-content" style={{ whiteSpace: 'nowrap' }}>Logo</span></th>
                <th><span className="header-content">Nome</span></th>
                <th><span className="header-content">Endereço / CEP</span></th>
                <th><span className="header-content">CNPJ</span></th>
                <th><span className="header-content">Telefone</span></th>
                <th><span className="header-content">Status</span></th>
                <th><span className="header-content">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {condominios.map(cond => {
                const isExp = expandedRows[cond.id];
                const isEditCond = editingCondId === cond.id;
                const sindicos = cond.sindicos || [];

                return (
                  <React.Fragment key={cond.id}>
                    {/* ── Linha do condomínio ── */}
                    <tr
                      className={`unit-row ${isExp ? 'expanded' : ''} ${isEditCond ? 'editing' : ''}`}
                      style={{ cursor: isEditCond ? 'default' : 'pointer', background: isExp ? '#f0fdf4' : undefined }}
                      onClick={() => !isEditCond && toggleRow(cond.id)}
                    >
                      {/* chevron */}
                      <td style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                        {isExp ? <FaChevronDown /> : <FaChevronRight />}
                      </td>

                      {/* logo */}
                      <td onClick={e => isEditCond && e.stopPropagation()}>
                        {isEditCond ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            {logoPreview
                              ? <img src={logoPreview} alt="Preview" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 4 }} />
                              : cond.logo_url
                                ? <ProtectedImage src={cond.logo_url} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 4 }} />
                                : null}
                            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                            <button type="button" title="Alterar logo" className="edit-button" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => logoInputRef.current?.click()}>
                              <FaUpload />
                            </button>
                          </div>
                        ) : (
                          cond.logo_url
                            ? <ProtectedImage src={cond.logo_url} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 4 }} />
                            : <div style={{ width: 60, height: 60, background: '#f1f5f9', borderRadius: 4 }} />
                        )}
                      </td>

                      {/* nome */}
                      <td onClick={e => isEditCond && e.stopPropagation()}>
                        {isEditCond
                          ? <input className="edit-input" value={editCondData.nome} onChange={e => setEditCondData(p => ({ ...p, nome: e.target.value }))} style={{ width: '100%' }} />
                          : <span className="cell-content">{cond.nome}</span>}
                      </td>

                      {/* endereço / cep */}
                      <td onClick={e => isEditCond && e.stopPropagation()}>
                        {isEditCond ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <input className="edit-input compact-edit-input" value={fmtCEP(editCondData.cep)} maxLength={9} placeholder="CEP" onChange={e => setEditCondData(p => ({ ...p, cep: e.target.value.replace(/\D/g, '') }))} />
                            <input className="edit-input compact-edit-input" value={editCondData.numero} maxLength={10} placeholder="Número" onChange={e => setEditCondData(p => ({ ...p, numero: e.target.value }))} />
                            <input className="edit-input compact-edit-input" value={editCondData.complemento} maxLength={100} placeholder="Complemento" onChange={e => setEditCondData(p => ({ ...p, complemento: e.target.value }))} />
                          </div>
                        ) : (
                          <span className="cell-content" style={{ fontSize: '0.82rem', color: '#64748b' }}>{cond.endereco_completo || '-'}</span>
                        )}
                      </td>

                      {/* cnpj */}
                      <td onClick={e => isEditCond && e.stopPropagation()}>
                        {isEditCond
                          ? <input className="edit-input" value={fmtCNPJ(editCondData.cnpj)} maxLength={18} onChange={e => setEditCondData(p => ({ ...p, cnpj: e.target.value.replace(/\D/g, '') }))} placeholder="XX.XXX.XXX/XXXX-XX" />
                          : <span className="cell-content">{cond.cnpj ? formatCPFCNPJ(cond.cnpj) : '-'}</span>}
                      </td>

                      {/* telefone */}
                      <td onClick={e => isEditCond && e.stopPropagation()}>
                        {isEditCond
                          ? <input className="edit-input" value={fmtPhone(editCondData.telefone)} maxLength={15} onChange={e => setEditCondData(p => ({ ...p, telefone: e.target.value.replace(/\D/g, '') }))} placeholder="(00) 00000-0000" />
                          : <span className="cell-content">{cond.telefone ? formatTelefone(cond.telefone) : '-'}</span>}
                      </td>

                      {/* status */}
                      <td onClick={e => isEditCond && e.stopPropagation()}>
                        {isEditCond
                          ? <input type="checkbox" className="status-checkbox" checked={editCondData.is_ativo} onChange={e => setEditCondData(p => ({ ...p, is_ativo: e.target.checked }))} />
                          : <span className={cond.is_ativo ? 'status-active' : 'status-inactive'}>{cond.is_ativo ? 'Ativo' : 'Inativo'}</span>}
                      </td>

                      {/* ações */}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions-column">
                          {isEditCond ? (
                            <>
                              <button className="save-button" title="Salvar" disabled={savingCond} onClick={saveCond}><FaCheck /></button>
                              <button className="cancel-button" title="Cancelar" onClick={cancelEditCond}><FaTimes /></button>
                            </>
                          ) : (
                            <button className="edit-button" title="Editar" onClick={(e) => startEditCond(cond, e)}><FaEdit /></button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Seção expandida: síndicos ── */}
                    {isExp && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, background: '#f8fafc' }}>
                          <div style={{ padding: '12px 24px 16px 56px' }}>
                            {/* botão adicionar síndico */}
                            {onAddSindico && (
                              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                  className="add-user-button"
                                  style={{ fontSize: '0.82rem', padding: '5px 14px' }}
                                  onClick={() => onAddSindico(cond.id)}
                                >
                                  <FaUserPlus style={{ marginRight: 6 }} /> Adicionar Síndico
                                </button>
                              </div>
                            )}

                            {/* tabela de síndicos */}
                            {sindicos.length === 0 ? (
                              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Nenhum síndico vinculado.</p>
                            ) : (
                              <div className="table-container" style={{ marginTop: 4 }}>
                                <div className="table-scroll">
                                  <table className="generic-table">
                                    <colgroup>
                                      <col />
                                      <col />
                                      <col />
                                      <col />
                                      <col style={{ width: 70 }} />
                                      <col style={{ width: 110 }} />
                                    </colgroup>
                                    <thead>
                                      <tr>
                                        <th><span className="header-content">Nome</span></th>
                                        <th><span className="header-content">Usuário</span></th>
                                        <th><span className="header-content">E-mail</span></th>
                                        <th><span className="header-content">Telefone</span></th>
                                        <th><span className="header-content">Status</span></th>
                                        <th><span className="header-content">Ações</span></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sindicos.map(s => {
                                        const isEditThis = editingSindId === s.id;
                                        return (
                                          <tr key={s.id}>
                                            <td>
                                              {isEditThis
                                                ? <input className="edit-input" value={editSindData.full_name} onChange={e => setEditSindData(p => ({ ...p, full_name: e.target.value }))} />
                                                : <span className="cell-content">{s.full_name || '-'}</span>}
                                            </td>
                                            <td>
                                              {isEditThis
                                                ? <input className="edit-input" value={editSindData.username} onChange={e => setEditSindData(p => ({ ...p, username: e.target.value }))} />
                                                : <span className="cell-content">{s.username}</span>}
                                            </td>
                                            <td>
                                              {isEditThis
                                                ? <input className="edit-input" type="email" value={editSindData.email} onChange={e => setEditSindData(p => ({ ...p, email: e.target.value }))} />
                                                : <span className="cell-content">{s.email || '-'}</span>}
                                            </td>
                                            <td>
                                              {isEditThis
                                                ? <input className="edit-input" value={fmtPhone(editSindData.phone)} maxLength={15} onChange={e => setEditSindData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} placeholder="(00) 00000-0000" />
                                                : <span className="cell-content">{s.phone ? formatTelefone(s.phone) : '-'}</span>}
                                            </td>
                                            <td>
                                              {isEditThis
                                                ? <input type="checkbox" className="status-checkbox" checked={editSindData.is_active} onChange={e => setEditSindData(p => ({ ...p, is_active: e.target.checked }))} />
                                                : <span className={s.is_active ? 'status-active' : 'status-inactive'}>{s.is_active ? 'Ativo' : 'Inativo'}</span>}
                                            </td>
                                            <td>
                                              <div className="actions-column">
                                                {isEditThis ? (
                                                  <>
                                                    <button className="save-button" title="Salvar" disabled={savingSind} onClick={saveSind}><FaCheck /></button>
                                                    <button className="cancel-button" title="Cancelar" onClick={cancelEditSind}><FaTimes /></button>
                                                  </>
                                                ) : (
                                                  <>
                                                    <button className="edit-button" title="Editar síndico" onClick={() => startEditSind(s)}><FaEdit /></button>
                                                    <button className="reset-button" title="Redefinir senha" onClick={() => resetSindPass(s.id, s.username)}><FaKey /></button>
                                                    <button className="delete-button" title="Remover do condomínio" onClick={() => removeSind(s.id, s.full_name)}><FaTrash /></button>
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
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
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

/* ── Paginação ── */
function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
      <button className="page-button" disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)}>Anterior</button>
      <span style={{ padding: '6px 12px', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>Página {currentPage} de {totalPages}</span>
      <button className="page-button" disabled={currentPage >= totalPages} onClick={() => onPageChange?.(currentPage + 1)}>Próxima</button>
    </div>
  );
}

export default ExpandableCondominiosTable;
