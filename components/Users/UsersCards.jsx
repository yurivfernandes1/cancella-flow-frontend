import React, { useState } from 'react';
import ProtectedImage from '../common/ProtectedImage';
import Select from 'react-select';
import { FaEdit, FaKey, FaCheck, FaTimes, FaChevronDown, FaChevronRight, FaTrash } from 'react-icons/fa';
import { formatCPF, formatTelefone } from '../../utils/formatters';
import { validateCPF, validatePhone } from '../../utils/validators';
import '../../styles/GenericMobileCard.css';
import '../../styles/UnitsCards.css';

/**
 * Grid de cards de usuários (síndicos ou portaria).
 *
 * Props:
 *  - users: array de objetos de usuário
 *  - loading: boolean
 *  - userType: 'sindico' | 'portaria' | 'cerimonialista'
 *  - condominios: lista de condomínios (para síndicos)
 *  - onSave(id, data): callback para salvar edição
 *  - onResetPassword(id): callback para resetar senha
 *  - currentPage, totalPages, onPageChange: paginação
 */
function UsersCards({
  users = [],
  loading = false,
  userType = 'portaria',
  condominios = [],
  onSave,
  onResetPassword,
  onDelete,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}) {
  const [expandedCards, setExpandedCards] = useState({});
  const [editingCard, setEditingCard] = useState(null);
  const [editData, setEditData] = useState({});
  const [cpfValid, setCpfValid] = useState(null);
  const [phoneValid, setPhoneValid] = useState(null);

  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (u) => {
    const isMorador = u.groups?.some(g => g.name === 'Moradores') || false;
    setEditData({ ...u, is_morador: isMorador });
    setCpfValid(null);
    setPhoneValid(null);
    setEditingCard(u.id);
    setExpandedCards(prev => ({ ...prev, [u.id]: true }));
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setEditData({});
  };

  const handleSaveCard = async (id) => {
    if (onSave) {
      await onSave(id, editData);
      setEditingCard(null);
      setEditData({});
    }
  };

  const change = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>;
  }

  if (!users.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum usuário encontrado.</div>;
  }

  return (
    <div className="users-cards-wrapper">
      <div className="units-cards-grid">
        {users.map(u => {
          const isExp = expandedCards[u.id];
          const isEd = editingCard === u.id;
          const isActive = u.is_active !== false;
          const isMorador = u.groups?.some(g => g.name === 'Moradores') || false;
          const showCondominioField = userType === 'sindico';

          return (
            <div
              key={u.id}
              className={`unit-card ${isExp ? 'unit-card--expanded' : ''} ${!isActive ? 'unit-card--inactive' : ''}`}
            >
              {/* Header */}
              <div
                className="unit-card__header"
                style={{ cursor: isEd ? 'default' : 'pointer' }}
                onClick={() => !isEd && toggleCard(u.id)}
              >
                <div className="unit-card__header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, flex: '0 0 40px', borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => {
                      const photoSrc = u.foto_url || u.foto || u.avatar || u.profile_picture || null;
                      if (photoSrc) {
                        return <ProtectedImage src={photoSrc} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                      }
                      return <div style={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.95rem' }}>{(u.full_name || u.username || '?')[0].toUpperCase()}</div>;
                    })()}
                  </div>
                  <span className="unit-card__title">{u.full_name || u.username}</span>
                </div>
                <div className="unit-card__header-right">
                  {userType === 'sindico' && isMorador && (
                    <span className="unit-card__morador-badge">Morador</span>
                  )}
                  <span className={`unit-card__status-badge ${isActive ? 'unit-card__status-badge--active' : 'unit-card__status-badge--inactive'}`}>
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="unit-card__chevron">
                    {isExp ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div
                className="unit-card__summary"
                style={{ cursor: isEd ? 'default' : 'pointer' }}
                onClick={() => !isEd && toggleCard(u.id)}
              >
                <div className="unit-card__info">
                  <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span className="unit-card__info-label">Usuário</span>
                    <span className="unit-card__info-value" style={{ fontSize: '0.85rem' }}>@{u.username}</span>
                  </div>
                  {u.email && (
                    <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span className="unit-card__info-label">E-mail</span>
                      <span className="unit-card__info-value" style={{ fontSize: '0.85rem', fontWeight: 400 }}>{u.email}</span>
                    </div>
                  )}
                  {u.phone && (
                    <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span className="unit-card__info-label">Telefone</span>
                      <span className="unit-card__info-value" style={{ fontSize: '0.85rem', fontWeight: 400 }}>{formatTelefone(u.phone)}</span>
                    </div>
                  )}
                  {showCondominioField && u.condominio_nome && (
                    <div className="unit-card__info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span className="unit-card__info-label">Condomínio</span>
                      <span className="unit-card__info-value" style={{ fontSize: '0.85rem', fontWeight: 500 }}>{u.condominio_nome}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded section */}
              {isExp && (
                <div className="unit-card__residents">
                  {isEd ? (
                    <div className="unit-card__edit-form" onClick={e => e.stopPropagation()}>
                      <div className="unit-card__edit-row">
                        <div className="unit-card__edit-field">
                          <label className="unit-card__edit-label">Nome</label>
                          <input
                            type="text"
                            className="mobile-edit-input"
                            value={editData.full_name || ''}
                            onChange={e => change('full_name', e.target.value)}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div className="unit-card__edit-field">
                          <label className="unit-card__edit-label">E-mail</label>
                          <input
                            type="email"
                            className="mobile-edit-input"
                            value={editData.email || ''}
                            onChange={e => change('email', e.target.value)}
                            placeholder="E-mail"
                          />
                        </div>
                      </div>

                      <div className="unit-card__edit-row">
                        <div className="unit-card__edit-field">
                          <label className="unit-card__edit-label">CPF</label>
                          <input
                            type="text"
                            className={`mobile-edit-input ${cpfValid === false ? 'input-error' : cpfValid === true ? 'input-valid' : ''}`}
                            value={formatCPF((editData.cpf || '').replace(/\D/g, ''))}
                            onChange={e => {
                              const d = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
                              setCpfValid(!d ? null : validateCPF(d));
                              change('cpf', d);
                            }}
                            placeholder="Somente números"
                          />
                        </div>
                        <div className="unit-card__edit-field">
                          <label className="unit-card__edit-label">Telefone</label>
                          <input
                            type="text"
                            className={`mobile-edit-input ${phoneValid === false ? 'input-error' : phoneValid === true ? 'input-valid' : ''}`}
                            value={formatTelefone((editData.phone || '').replace(/\D/g, ''))}
                            onChange={e => {
                              const d = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
                              setPhoneValid(!d ? null : validatePhone(d));
                              change('phone', d);
                            }}
                            placeholder="Somente números"
                          />
                        </div>
                      </div>

                      {(userType === 'portaria' || userType === 'cerimonialista') && (
                        <div className="unit-card__edit-row">
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">Usuário</label>
                            <input
                              type="text"
                              className="mobile-edit-input"
                              value={editData.username || ''}
                              onChange={e => change('username', e.target.value)}
                              placeholder="Username"
                            />
                          </div>
                          <div className="unit-card__edit-field" style={{ justifyContent: 'flex-end' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#334155', cursor: 'pointer', marginTop: 'auto', paddingBottom: 4 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(editData.is_active)}
                                onChange={e => change('is_active', e.target.checked)}
                                style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                              />
                              Ativo
                            </label>
                          </div>
                        </div>
                      )}

                      {userType === 'sindico' && (
                        <>
                          <div className="unit-card__edit-field">
                            <label className="unit-card__edit-label">Condomínio</label>
                            <Select
                              options={condominios.map(c => ({ value: c.id, label: c.nome }))}
                              value={condominios.map(c => ({ value: c.id, label: c.nome })).find(o => o.value === editData.condominio_id) || null}
                              onChange={opt => change('condominio_id', opt ? opt.value : null)}
                              placeholder="Selecione"
                              isClearable
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              menuPosition="fixed"
                              styles={{
                                menuPortal: b => ({ ...b, zIndex: 99999 }),
                                control: b => ({ ...b, minHeight: 34, fontSize: '0.85rem' }),
                              }}
                            />
                          </div>
                          <div className="unit-card__edit-row">
                            <div className="unit-card__edit-field">
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(editData.is_morador)}
                                  onChange={e => change('is_morador', e.target.checked)}
                                  style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                                />
                                É Morador
                              </label>
                            </div>
                            <div className="unit-card__edit-field">
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(editData.is_active)}
                                  onChange={e => change('is_active', e.target.checked)}
                                  style={{ width: 18, height: 18, accentColor: '#2abb98' }}
                                />
                                Ativo
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="unit-card__edit-actions">
                        <button
                          className="save-button"
                          onClick={() => handleSaveCard(u.id)}
                        >
                          <FaCheck style={{ marginRight: 4 }} /> Salvar
                        </button>
                        <button
                          className="cancel-button"
                          onClick={cancelEdit}
                        >
                          <FaTimes style={{ marginRight: 4 }} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="unit-card__resident-view">
                      <div className="unit-card__resident-info">
                        {u.cpf ? (
                          <span className="unit-card__resident-cpf">{formatCPF(String(u.cpf).replace(/\D/g, ''))}</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>CPF não informado</span>
                        )}
                      </div>
                      <div className="unit-card__resident-actions">
                        <button
                          className="edit-button"
                          title="Editar"
                          onClick={e => { e.stopPropagation(); startEdit(u); }}
                        >
                          <FaEdit />
                        </button>
                        {onResetPassword && (
                          <button
                            className="reset-button"
                            title="Resetar senha"
                            onClick={e => { e.stopPropagation(); onResetPassword(u.id); }}
                          >
                            <FaKey />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="delete-button"
                            title="Desativar usuário"
                            onClick={e => { e.stopPropagation(); onDelete(u); }}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
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
          {users.length > 0 ? `Página ${currentPage} de ${totalPages}` : 'Sem registros'}
        </div>
        <div className="pagination-controls">
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || users.length === 0}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || users.length === 0}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export default UsersCards;
