import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaEdit, FaCheck, FaTimes, FaKey, FaUserPlus, FaTrash, FaHome, FaUsers } from 'react-icons/fa';
import api from '../../services/api';
import { formatCPF, formatTelefone } from '../../utils/formatters';
import { validateCPF, validatePhone } from '../../utils/validators';
import '../../styles/GenericMobileCard.css';
import '../../styles/UnitsCards.css';

/**
 * Grid de cards de unidades com moradores vinculados.
 *
 * Props:
 *  - unidades: array de objetos { id, numero, bloco, identificacao_completa, is_active, moradores: [...] }
 *  - loading: boolean
 *  - mode: 'portaria' | 'sindico'
 *  - currentPage, totalPages, onPageChange
 *
 * Props (modo síndico apenas):
 *  - unidadesList: lista completa de unidades (para select no edit de morador)
 *  - onSaveUnidade(): callback chamado após salvar unidade (para refresh)
 *  - onAddMorador(unidadeId): callback para adicionar morador numa unidade
 *  - onSaveMorador(moradorId, data): salva edição de morador
 *  - onResetPassword(moradorId): reseta senha do morador
 *  - onDeleteMorador(moradorId): exclui morador
 */
function ExpandableUnitsTable({
  unidades = [],
  loading = false,
  mode = 'portaria',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  // sindico-only props
  unidadesList = [],
  onSaveUnidade,
  onAddMorador,
  onSaveMorador,
  onResetPassword,
  onDeleteMorador,
  onVincularSindico,
  currentUserId = null,
}) {
  const [expandedRows, setExpandedRows] = useState({});
  const [editingMoradorId, setEditingMoradorId] = useState(null);
  const [editMoradorData, setEditMoradorData] = useState({});
  const [moradorValidation, setMoradorValidation] = useState({ cpf: null, phone: null });
  const [editingUnidadeId, setEditingUnidadeId] = useState(null);
  const [editUnidadeData, setEditUnidadeData] = useState({});
  const [savingUnidade, setSavingUnidade] = useState(false);

  const isSindico = mode === 'sindico';

  const toggleRow = (unidadeId) => {
    if (editingUnidadeId === unidadeId) return;
    setExpandedRows(prev => ({ ...prev, [unidadeId]: !prev[unidadeId] }));
  };

  const startEditUnidade = (unidade, e) => {
    e.stopPropagation();
    setEditingUnidadeId(unidade.id);
    setEditUnidadeData({ numero: unidade.numero || '', bloco: unidade.bloco || '', is_active: unidade.is_active !== false });
    setExpandedRows(prev => ({ ...prev, [unidade.id]: true }));
  };

  const cancelEditUnidade = (e) => {
    e.stopPropagation();
    setEditingUnidadeId(null);
    setEditUnidadeData({});
  };

  const saveUnidade = async (e) => {
    e.stopPropagation();
    if (!String(editUnidadeData.numero || '').trim()) { alert('Número é obrigatório.'); return; }
    try {
      setSavingUnidade(true);
      await api.patch(`/cadastros/unidades/${editingUnidadeId}/update/`, {
        numero: editUnidadeData.numero,
        bloco: editUnidadeData.bloco,
        is_active: editUnidadeData.is_active,
      });
      if (onSaveUnidade) onSaveUnidade();
      setEditingUnidadeId(null);
      setEditUnidadeData({});
    } catch (err) {
      alert('Erro ao salvar unidade.');
      console.error(err);
    } finally {
      setSavingUnidade(false);
    }
  };

  const startEditMorador = (morador) => {
    setEditingMoradorId(morador.id);
    setEditMoradorData({ ...morador, unidade_id: morador.unidade_id || null });
    setMoradorValidation({ cpf: null, phone: null });
  };

  const cancelEditMorador = () => {
    setEditingMoradorId(null);
    setEditMoradorData({});
    setMoradorValidation({ cpf: null, phone: null });
  };

  const saveMorador = () => {
    const cpfDigits = (editMoradorData.cpf || '').replace(/\D/g, '');
    const phoneDigits = (editMoradorData.phone || '').replace(/\D/g, '');

    if (!cpfDigits) { alert('CPF é obrigatório.'); return; }
    if (!validateCPF(cpfDigits)) { alert('CPF inválido.'); return; }
    if (phoneDigits && !validatePhone(phoneDigits)) { alert('Telefone inválido.'); return; }

    if (onSaveMorador) {
      onSaveMorador(editingMoradorId, { ...editMoradorData, cpf: cpfDigits, phone: phoneDigits || '' });
    }
    setEditingMoradorId(null);
    setEditMoradorData({});
  };

  const handleMoradorFieldChange = (field, value) => {
    setEditMoradorData(prev => ({ ...prev, [field]: value }));
  };

  const formatCpfDisplay = (value) => {
    if (!value) return '-';
    const cpf = String(value).replace(/\D/g, '');
    return cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value;
  };

  const isMoradorPending = (morador) => {
    const status = morador?.is_active;
    if (typeof status === 'boolean') return !status;
    if (typeof status === 'number') return status === 0;
    if (typeof status === 'string') {
      const normalized = status.trim().toLowerCase();
      return ['false', '0', 'inativo', 'pendente'].includes(normalized);
    }
    return !status;
  };

  if (loading) {
    return <div className="loading-state" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Carregando unidades...</div>;
  }

  if (!unidades.length) {
    return <div className="empty-state" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma unidade encontrada.</div>;
  }

  return (
    <div>
      <div className="units-cards-grid">
        {[...unidades].sort((a, b) => {
          const blocoA = (a.bloco || '').toLowerCase();
          const blocoB = (b.bloco || '').toLowerCase();
          if (blocoA !== blocoB) return blocoA.localeCompare(blocoB, 'pt-BR');
          return String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR', { numeric: true });
        }).map(unidade => {
          const isExpanded = expandedRows[unidade.id];
          const moradores = unidade.moradores || [];
          const pendingMoradoresCount = moradores.filter(isMoradorPending).length;
          const isEditingUnidade = editingUnidadeId === unidade.id;
          const unitTitle = unidade.identificacao_completa || `${unidade.bloco ? unidade.bloco + ' - ' : ''}${unidade.numero}`;

          return (
            <div
              key={unidade.id}
              className={`unit-card ${isExpanded ? 'unit-card--expanded' : ''} ${!unidade.is_active ? 'unit-card--inactive' : ''} ${pendingMoradoresCount > 0 ? 'unit-card--has-pending' : ''}`}
            >
              {/* Cabeçalho do card */}
              <div
                className="unit-card__header"
                style={{ cursor: isEditingUnidade ? 'default' : 'pointer' }}
                onClick={() => !isEditingUnidade && toggleRow(unidade.id)}
              >
                <div className="unit-card__header-left">
                  <FaHome className="unit-card__icon" />
                  <span className="unit-card__title">{unitTitle}</span>
                  {pendingMoradoresCount > 0 && (
                    <span className="unit-card__header-pending">{pendingMoradoresCount} pendente{pendingMoradoresCount > 1 ? 's' : ''}</span>
                  )}
                </div>
                <div className="unit-card__header-right">
                  {isSindico && !isEditingUnidade && (
                    <button
                      className="unit-card__edit-btn"
                      title="Editar unidade"
                      onClick={(e) => startEditUnidade(unidade, e)}
                    >
                      <FaEdit />
                    </button>
                  )}
                  <span className="unit-card__chevron">
                    {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                </div>
              </div>

              {/* Resumo do card */}
              <div
                className="unit-card__summary"
                style={{ cursor: isEditingUnidade ? 'default' : 'pointer' }}
                onClick={() => !isEditingUnidade && toggleRow(unidade.id)}
              >
                {isEditingUnidade ? (
                  <div className="unit-card__edit-form" onClick={e => e.stopPropagation()}>
                    <div className="unit-card__edit-row">
                      <div className="unit-card__edit-field">
                        <label className="unit-card__edit-label">Bloco</label>
                        <input
                          className="mobile-edit-input"
                          type="text"
                          value={editUnidadeData.bloco}
                          onChange={e => setEditUnidadeData(prev => ({ ...prev, bloco: e.target.value }))}
                          placeholder="Bloco"
                        />
                      </div>
                      <div className="unit-card__edit-field">
                        <label className="unit-card__edit-label">Número</label>
                        <input
                          className="mobile-edit-input"
                          type="text"
                          value={editUnidadeData.numero}
                          onChange={e => setEditUnidadeData(prev => ({ ...prev, numero: e.target.value }))}
                          placeholder="Número"
                        />
                      </div>
                    </div>
                    <div className="unit-card__edit-field">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(editUnidadeData.is_active)}
                          onChange={e => setEditUnidadeData(prev => ({ ...prev, is_active: e.target.checked }))}
                          style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                        />
                        Unidade ativa
                      </label>
                    </div>
                    <div className="unit-card__edit-actions">
                      <button className="save-button" disabled={savingUnidade} onClick={saveUnidade}>
                        <FaCheck style={{ marginRight: 4 }} /> Salvar
                      </button>
                      <button className="cancel-button" onClick={cancelEditUnidade}>
                        <FaTimes style={{ marginRight: 4 }} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="unit-card__info">
                    {unidade.bloco && (
                      <div className="unit-card__info-item">
                        <span className="unit-card__info-label">Bloco</span>
                        <span className="unit-card__info-value">{unidade.bloco}</span>
                      </div>
                    )}
                    <div className="unit-card__info-item">
                      <span className="unit-card__info-label">Número</span>
                      <span className="unit-card__info-value">{unidade.numero}</span>
                    </div>
                    <div className="unit-card__info-item">
                      <span className={`unit-card__status-badge ${unidade.is_active ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                        {unidade.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="unit-card__info-item unit-card__residents-count">
                      <FaUsers style={{ fontSize: '0.8rem', color: moradores.length ? '#1d4ed8' : '#94a3b8' }} />
                      <span style={{
                        background: moradores.length ? '#dbeafe' : '#f1f5f9',
                        color: moradores.length ? '#1d4ed8' : '#94a3b8',
                        borderRadius: 12,
                        padding: '2px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}>
                        {moradores.length} morador{moradores.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {pendingMoradoresCount > 0 && (
                      <div className="unit-card__info-item">
                        <span className="unit-card__status-badge unit-card__status-badge--pending">
                          {pendingMoradoresCount} pendente{pendingMoradoresCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seção expandida — moradores */}
              {isExpanded && !isEditingUnidade && (
                <div className="unit-card__residents">
                  <div className="unit-card__residents-header">
                    <span className="unit-card__residents-title">Moradores</span>
                    {isSindico && (onAddMorador || onVincularSindico) && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {onVincularSindico && (() => {
                          const jaVinculado = currentUserId && moradores.some(m => String(m.id) === String(currentUserId));
                          const currentMorador = jaVinculado ? moradores.find(m => String(m.id) === String(currentUserId)) : null;
                          return jaVinculado ? (
                            <button
                              className="unit-card__action-btn"
                              style={{ background: '#ef4444', color: 'white' }}
                              onClick={() => onDeleteMorador(currentUserId, currentMorador?.full_name || '', unitTitle, unidade.id)}
                              title="Desvincular-me desta unidade"
                            >
                              <FaTimes style={{ marginRight: 4 }} /> Desvincular
                            </button>
                          ) : (
                            <button
                              className="unit-card__action-btn unit-card__action-btn--outline"
                              onClick={() => onVincularSindico(unidade.id)}
                              title="Vincular-me a esta unidade"
                            >
                              <FaUserPlus /> Vincular-me
                            </button>
                          );
                        })()}
                        {onAddMorador && (
                          <button
                            className="add-user-button unit-card__action-btn"
                            onClick={() => onAddMorador(unidade.id)}
                          >
                            <FaUserPlus style={{ marginRight: 6 }} /> Adicionar Morador
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {moradores.length === 0 ? (
                    <p className="unit-card__no-residents">Nenhum morador vinculado.</p>
                  ) : (
                    <div className="unit-card__residents-list">
                      {moradores.map(morador => {
                        const isEditingThis = isSindico && editingMoradorId === morador.id;
                        const isPendingApproval = isMoradorPending(morador);
                        const displayName = morador.full_name || morador.username || 'Morador sem nome';
                        return (
                          <div key={morador.id} className={`unit-card__resident-item ${isPendingApproval ? 'unit-card__resident-item--pending' : ''}`}>
                            {isEditingThis ? (
                              <div className="unit-card__resident-edit">
                                <div className="unit-card__edit-row">
                                  <div className="unit-card__edit-field">
                                    <label className="unit-card__edit-label">Nome</label>
                                    <input className="mobile-edit-input" type="text" value={editMoradorData.full_name || ''} onChange={e => handleMoradorFieldChange('full_name', e.target.value)} />
                                  </div>
                                  <div className="unit-card__edit-field">
                                    <label className="unit-card__edit-label">Usuário</label>
                                    <input className="mobile-edit-input" type="text" value={editMoradorData.username || ''} onChange={e => handleMoradorFieldChange('username', e.target.value)} />
                                  </div>
                                </div>
                                <div className="unit-card__edit-row">
                                  <div className="unit-card__edit-field">
                                    <label className="unit-card__edit-label">E-mail</label>
                                    <input className="mobile-edit-input" type="email" value={editMoradorData.email || ''} onChange={e => handleMoradorFieldChange('email', e.target.value)} />
                                  </div>
                                  <div className="unit-card__edit-field">
                                    <label className="unit-card__edit-label">CPF</label>
                                    <input
                                      className={`mobile-edit-input ${moradorValidation.cpf === false ? 'input-error' : moradorValidation.cpf === true ? 'input-valid' : ''}`}
                                      type="text"
                                      value={formatCPF(String(editMoradorData.cpf || '').replace(/\D/g, '').slice(0, 11))}
                                      onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                        setMoradorValidation(prev => ({ ...prev, cpf: digits ? validateCPF(digits) : null }));
                                        handleMoradorFieldChange('cpf', digits);
                                      }}
                                      placeholder="000.000.000-00"
                                    />
                                  </div>
                                </div>
                                <div className="unit-card__edit-row">
                                  <div className="unit-card__edit-field">
                                    <label className="unit-card__edit-label">Telefone</label>
                                    <input
                                      className={`mobile-edit-input ${moradorValidation.phone === false ? 'input-error' : moradorValidation.phone === true ? 'input-valid' : ''}`}
                                      type="text"
                                      value={formatTelefone(String(editMoradorData.phone || '').replace(/\D/g, '').slice(0, 11))}
                                      onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                        setMoradorValidation(prev => ({ ...prev, phone: digits ? validatePhone(digits) : null }));
                                        handleMoradorFieldChange('phone', digits);
                                      }}
                                      placeholder="(00) 00000-0000"
                                    />
                                  </div>
                                  <div className="unit-card__edit-field">
                                    <label className="unit-card__edit-label">Status</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.9rem', cursor: 'pointer' }}>
                                      <input type="checkbox" checked={Boolean(editMoradorData.is_active)} onChange={e => handleMoradorFieldChange('is_active', e.target.checked)} style={{ width: 18, height: 18, accentColor: '#2abb98' }} />
                                      Ativo
                                    </label>
                                  </div>
                                </div>
                                <div className="unit-card__edit-actions">
                                  <button className="save-button" onClick={saveMorador}><FaCheck style={{ marginRight: 4 }} /> Salvar</button>
                                  <button className="cancel-button" onClick={cancelEditMorador}><FaTimes style={{ marginRight: 4 }} /> Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <div className="unit-card__resident-view">
                                <div className="unit-card__resident-info">
                                  <span className="unit-card__resident-name">
                                    {displayName}
                                      {/* Pendente moved to unit header */}
                                  </span>
                                  <span className="unit-card__resident-cpf">{formatCpfDisplay(morador.cpf)}</span>
                                  {morador.phone && (
                                    <span className="unit-card__resident-phone">{formatTelefone(morador.phone)}</span>
                                  )}
                                  {isPendingApproval && morador.username && (
                                    <span className="unit-card__resident-phone">@{morador.username}</span>
                                  )}
                                  {isPendingApproval && morador.email && (
                                    <span className="unit-card__resident-phone">{morador.email}</span>
                                  )}
                                </div>
                                {isSindico && isPendingApproval && (
                                  <div className="unit-card__resident-pending-actions">
                                    {onSaveMorador && (
                                      <button
                                        className="approve-button approve-button--icon"
                                        onClick={() => onSaveMorador(morador.id, { ...morador, is_active: true })}
                                        title="Aprovar cadastro"
                                        aria-label="Aprovar"
                                      >
                                        <FaCheck />
                                      </button>
                                    )}
                                    {onDeleteMorador && String(morador.id) !== String(currentUserId) && (
                                      <button
                                        className="reject-button reject-button--icon"
                                        onClick={() => onDeleteMorador(morador.id, morador.full_name, unitTitle, unidade.id)}
                                        title="Rejeitar cadastro"
                                        aria-label="Rejeitar"
                                      >
                                        <FaTimes />
                                      </button>
                                    )}
                                  </div>
                                )}
                                {isSindico && !isPendingApproval && (
                                  <div className="unit-card__resident-actions">
                                    <button className="edit-button" onClick={() => startEditMorador(morador)} title="Editar morador"><FaEdit /></button>
                                    {onResetPassword && (
                                      <button className="reset-button" onClick={() => onResetPassword(morador.id)} title="Resetar senha"><FaKey /></button>
                                    )}
                                    {onDeleteMorador && String(morador.id) !== String(currentUserId) && (
                                      <button className="delete-button" onClick={() => onDeleteMorador(morador.id, morador.full_name, unitTitle, unidade.id)} title="Remover morador"><FaTrash /></button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pagination">
        <div className="pagination-info">
          Página {currentPage} de {totalPages}
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpandableUnitsTable;
