import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaEdit, FaCheck, FaTimes, FaKey, FaUserPlus } from 'react-icons/fa';
import api from '../../services/api';
import { formatCPF, formatTelefone } from '../../utils/formatters';
import { validateCPF, validatePhone } from '../../utils/validators';

/**
 * Tabela expansível de unidades com moradores vinculados.
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
    setEditMoradorData({
      ...morador,
      unidade_id: morador.unidade_id || null,
    });
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

    const dataToSave = {
      ...editMoradorData,
      cpf: cpfDigits,
      phone: phoneDigits || '',
    };

    if (onSaveMorador) {
      onSaveMorador(editingMoradorId, dataToSave);
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

  if (loading) {
    return <div className="loading-state" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Carregando unidades...</div>;
  }

  if (!unidades.length) {
    return <div className="empty-state" style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhuma unidade encontrada.</div>;
  }

  return (
    <div className="table-container expandable-units-table">
      <div className="table-scroll">
        <table className="generic-table">
          <colgroup>
            <col style={{ width: 40 }} />
            <col />
            <col />
            <col />
            <col />
            <col />
            {isSindico && <col style={{ width: 130 }} />}
          </colgroup>
          <thead>
            <tr>
              <th><span className="header-content"></span></th>
              <th><span className="header-content">Bloco</span></th>
              <th><span className="header-content">Número</span></th>
              <th><span className="header-content">Identificação</span></th>
              <th><span className="header-content">Moradores</span></th>
              <th><span className="header-content">Status</span></th>
              {isSindico && <th><span className="header-content">Ações</span></th>}
            </tr>
          </thead>
          <tbody>
            {unidades.map(unidade => {
              const isExpanded = expandedRows[unidade.id];
              const moradores = unidade.moradores || [];
              const isEditingUnidade = editingUnidadeId === unidade.id;

              return (
                <React.Fragment key={unidade.id}>
                  {/* Linha da unidade */}
                  <tr
                    className={`unit-row ${isExpanded ? 'expanded' : ''} ${isEditingUnidade ? 'editing' : ''}`}
                    style={{ cursor: isEditingUnidade ? 'default' : 'pointer', background: isExpanded ? '#f0fdf4' : undefined }}
                    onClick={() => !isEditingUnidade && toggleRow(unidade.id)}
                  >
                    <td style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                      {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                    </td>
                    <td>
                      {isEditingUnidade ? (
                        <input
                          className="edit-input"
                          type="text"
                          value={editUnidadeData.bloco}
                          onChange={e => setEditUnidadeData(prev => ({ ...prev, bloco: e.target.value }))}
                          placeholder="Bloco"
                          style={{ width: '100%', minWidth: 60 }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        unidade.bloco || '-'
                      )}
                    </td>
                    <td>
                      {isEditingUnidade ? (
                        <input
                          className="edit-input"
                          type="text"
                          value={editUnidadeData.numero}
                          onChange={e => setEditUnidadeData(prev => ({ ...prev, numero: e.target.value }))}
                          placeholder="Número"
                          style={{ width: '100%', minWidth: 60 }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        unidade.numero
                      )}
                    </td>
                    <td>{unidade.identificacao_completa || `${unidade.bloco ? unidade.bloco + ' - ' : ''}${unidade.numero}`}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        background: moradores.length ? '#dbeafe' : '#f1f5f9',
                        color: moradores.length ? '#1d4ed8' : '#94a3b8',
                        borderRadius: 12,
                        padding: '2px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}>
                        {moradores.length} morador{moradores.length !== 1 ? 'es' : ''}
                      </span>
                    </td>
                    <td>
                      {isEditingUnidade ? (
                        <input
                          type="checkbox"
                          checked={Boolean(editUnidadeData.is_active)}
                          onChange={e => setEditUnidadeData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="status-checkbox"
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <span className={unidade.is_active ? 'status-active' : 'status-inactive'}>
                          {unidade.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </td>
                    {isSindico && (
                      <td onClick={e => e.stopPropagation()}>
                        <div className="actions-column">
                          {isEditingUnidade ? (
                            <>
                              <button
                                className="save-button"
                                title="Salvar"
                                disabled={savingUnidade}
                                onClick={saveUnidade}
                              >
                                <FaCheck />
                              </button>
                              <button
                                className="cancel-button"
                                title="Cancelar"
                                onClick={cancelEditUnidade}
                              >
                                <FaTimes />
                              </button>
                            </>
                          ) : (
                            <button
                              className="edit-button"
                              title="Editar unidade"
                              onClick={(e) => startEditUnidade(unidade, e)}
                            >
                              <FaEdit />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {/* Linha expandida com moradores */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={isSindico ? 7 : 6} style={{ padding: 0, background: '#f8fafc' }}>
                        <div style={{ padding: '12px 24px 16px 48px' }}>
                          {isSindico && onAddMorador && (
                            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                className="add-user-button"
                                style={{ fontSize: '0.82rem', padding: '5px 14px' }}
                                onClick={() => onAddMorador(unidade.id)}
                              >
                                <FaUserPlus style={{ marginRight: 6 }} />
                                Adicionar Morador
                              </button>
                            </div>
                          )}

                          {moradores.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Nenhum morador vinculado.</p>
                          ) : isSindico ? (
                            /* Tabela de moradores - modo síndico (editável) */
                            <div className={`table-container ${editingMoradorId ? 'editing-active' : ''}`} style={{ marginTop: 4 }}>
                              <div className="table-scroll">
                              <table className="generic-table">
                                <colgroup>
                                  <col />
                                  <col />
                                  <col />
                                  <col style={{ minWidth: 155 }} />
                                  <col style={{ minWidth: 155 }} />
                                  <col />
                                  <col />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th><span className="header-content">Nome</span></th>
                                    <th><span className="header-content">Usuário</span></th>
                                    <th><span className="header-content">E-mail</span></th>
                                    <th><span className="header-content">CPF</span></th>
                                    <th><span className="header-content">Telefone</span></th>
                                    <th><span className="header-content">Status</span></th>
                                    <th><span className="header-content">Ações</span></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {moradores.map(morador => {
                                    const isEditingThis = editingMoradorId === morador.id;
                                    return (
                                      <tr key={morador.id}>
                                        <td>
                                          {isEditingThis ? (
                                            <input
                                              className="edit-input"
                                              type="text"
                                              value={editMoradorData.full_name || ''}
                                              onChange={e => handleMoradorFieldChange('full_name', e.target.value)}
                                            />
                                          ) : (
                                            <span className="cell-content">{morador.full_name || '-'}</span>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingThis ? (
                                            <input
                                              className="edit-input"
                                              type="text"
                                              value={editMoradorData.username || ''}
                                              onChange={e => handleMoradorFieldChange('username', e.target.value)}
                                            />
                                          ) : (
                                            <span className="cell-content">{morador.username || '-'}</span>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingThis ? (
                                            <input
                                              className="edit-input"
                                              type="email"
                                              value={editMoradorData.email || ''}
                                              onChange={e => handleMoradorFieldChange('email', e.target.value)}
                                            />
                                          ) : (
                                            <span className="cell-content">{morador.email || '-'}</span>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingThis ? (
                                            <input
                                              className={`edit-input ${moradorValidation.cpf === false ? 'input-error' : moradorValidation.cpf === true ? 'input-valid' : ''}`}
                                              type="text"
                                              value={formatCPF(String(editMoradorData.cpf || '').replace(/\D/g, '').slice(0, 11))}
                                              onChange={e => {
                                                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                setMoradorValidation(prev => ({ ...prev, cpf: digits ? validateCPF(digits) : null }));
                                                handleMoradorFieldChange('cpf', digits);
                                              }}
                                              placeholder="000.000.000-00"
                                            />
                                          ) : (
                                            <span className="cell-content" style={{ whiteSpace: 'nowrap' }}>{formatCpfDisplay(morador.cpf)}</span>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingThis ? (
                                            <input
                                              className={`edit-input ${moradorValidation.phone === false ? 'input-error' : moradorValidation.phone === true ? 'input-valid' : ''}`}
                                              type="text"
                                              value={formatTelefone(String(editMoradorData.phone || '').replace(/\D/g, '').slice(0, 11))}
                                              onChange={e => {
                                                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                setMoradorValidation(prev => ({ ...prev, phone: digits ? validatePhone(digits) : null }));
                                                handleMoradorFieldChange('phone', digits);
                                              }}
                                              placeholder="(00) 00000-0000"
                                            />
                                          ) : (
                                            <span className="cell-content" style={{ whiteSpace: 'nowrap' }}>{morador.phone ? formatTelefone(morador.phone) : '-'}</span>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingThis ? (
                                            <input
                                              type="checkbox"
                                              checked={Boolean(editMoradorData.is_active)}
                                              onChange={e => handleMoradorFieldChange('is_active', e.target.checked)}
                                              className="status-checkbox"
                                            />
                                          ) : (
                                            <span className={morador.is_active ? 'status-active' : 'status-inactive'}>
                                              {morador.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          <div className="actions-column">
                                            {isEditingThis ? (
                                              <>
                                                <button className="save-button" onClick={saveMorador} title="Salvar"><FaCheck /></button>
                                                <button className="cancel-button" onClick={cancelEditMorador} title="Cancelar"><FaTimes /></button>
                                              </>
                                            ) : (
                                              <>
                                                <button className="edit-button" onClick={() => startEditMorador(morador)} title="Editar morador"><FaEdit /></button>
                                                {onResetPassword && (
                                                  <button className="reset-button" onClick={() => onResetPassword(morador.id)} title="Resetar senha"><FaKey /></button>
                                                )}
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
                          ) : (
                            /* Lista simples de moradores - modo portaria (read-only) */
                            <div className="table-container compact-table" style={{ marginTop: 4 }}>
                              <div className="table-scroll">
                              <table className="generic-table">
                                <colgroup>
                                  <col />
                                  <col style={{ minWidth: 160 }} />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th><span className="header-content">Nome</span></th>
                                    <th><span className="header-content">CPF</span></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {moradores.map(morador => (
                                    <tr key={morador.id}>
                                      <td><span className="cell-content">{morador.full_name || '-'}</span></td>
                                      <td><span className="cell-content">{formatCpfDisplay(morador.cpf)}</span></td>
                                    </tr>
                                  ))}
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

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
          <button
            className="page-button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
          >
            Anterior
          </button>
          <span style={{ padding: '6px 12px', color: '#64748b', fontSize: '0.9rem' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            className="page-button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

export default ExpandableUnitsTable;
