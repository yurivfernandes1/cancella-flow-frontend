import React, { useEffect, useState } from 'react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import Select from 'react-select';
import '../styles/GenericTable.css';
import GenericMobileCard from './GenericMobileCard';

function GenericTable({ columns, data, loading, onSave, onEdit, onCancel, onPageChange, totalPages, currentPage, editingRowId, onEditRow, className = '', teams, onEditDataChange, onEditChange, currentEditData, titleColumnKey, hideEditButton = false }) {
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se está em mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Quando o controle de edição vem de fora (editingRowId), sincronizar o editData com a linha correspondente
  useEffect(() => {
    if (editingRowId && Array.isArray(data)) {
      const row = data.find((r) => r.id === editingRowId);
      if (row) {
        setEditData({ ...row });
        if (onEditDataChange) onEditDataChange({ ...row });
      }
    } else {
      setEditData({});
      if (onEditDataChange) onEditDataChange({});
    }
    // Sincronizar o estado interno de edição com o controle externo
    setEditingId(editingRowId || null);
  }, [editingRowId, data]);

  const handleEdit = (item) => {
    setEditingId(item.id);
    
    // CORREÇÃO: Simplificar para garantir que todos os dados estejam disponíveis para edição
    // Não fazemos mais manipulações complexas aqui - apenas copiamos os dados diretamente
    const initialData = { ...item };
    
    console.log("Dados completos do item para edição:", initialData);
    setEditData(initialData);
    // Notifica o componente pai que a edição foi iniciada
    if (onEditDataChange) onEditDataChange(initialData);
    if (onEditRow) onEditRow(item.id);
    if (onEdit) onEdit(item);
  };

  const handleSave = (rowId, updatedData) => {
    // CORREÇÃO: Garantir que os dados atualizados sejam mesclados corretamente
    // Preferir currentEditData quando disponível (controle externo)
    const source = currentEditData && Object.keys(currentEditData).length ? currentEditData : editData;
    const merged = { ...source, ...updatedData };
    console.log("Salvando dados (merged):", merged);
    if (onSave) {
      onSave(rowId, merged);
    }
    // Resetar estados internos e notificar o pai que a edição terminou
    setEditingId(null);
    setEditData({});
    if (onEditRow) onEditRow(null);
    if (onEditDataChange) onEditDataChange({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
    if (onCancel) onCancel();
    if (onEditRow) onEditRow(null);
    if (onEditDataChange) onEditDataChange({});
  };

  const handleInputChange = (key, value) => {
    // Se tem controle externo (onEditChange), usar ele
    if (onEditChange) {
      onEditChange(key, value);
    } else {
      // Caso contrário, usar o estado interno
      setEditData(prev => {
        const updated = { ...prev, [key]: value };
        if (onEditDataChange) onEditDataChange(updated);
        return updated;
      });
    }
  };

  const renderCell = (row, column) => {
    const isEditingRow = (editingId === row.id) || (editingRowId === row.id);
    // Renderização padrão para coluna de ações
    if (column.key === 'actions') {
      // Se o consumidor fornecer um render customizado, usar ele para permitir ações próprias (ex.: reset de senha)
      if (typeof column.render === 'function') {
        const value = row[column.key];
        try {
          return column.render(value, row);
        } catch (err) {
          console.error('Erro no render da coluna actions', err);
        }
      }

      // Fallback para ações padrão da tabela
      return (
        <div className="actions-column">
          {isEditingRow ? (
            <>
              <button type="button" className="save-button" onClick={() => handleSave(row.id, editData)} title="Salvar">
                <FaCheck />
              </button>
              <button type="button" className="cancel-button" onClick={handleCancel} title="Cancelar">
                <FaTimes />
              </button>
            </>
          ) : (
            <button type="button" className="edit-button" onClick={() => handleEdit(row)}>
              <FaEdit />
            </button>
          )}
        </div>
      );
    }

    // PRIORIDADE: quando em edição e a coluna é editável, usar o editComponent
    const activeEditData = currentEditData || editData;
    if (isEditingRow && column.editable) {
      return column.editComponent ? (
        // CORREÇÃO: Passar o objeto editData sem modificações adicionais
        column.editComponent(activeEditData, handleInputChange)
      ) : (
        <input
          className="edit-input"
          type={column.type || "text"}
          value={activeEditData[column.key] || ""}
          onChange={(e) => handleInputChange(column.key, e.target.value)}
        />
      );
    }

    // Caso não esteja editando, se a coluna tiver um render customizado, chamar com (value, row)
    if (column.render) {
      const value = row[column.key];
      try {
        return column.render(value, row);
      } catch (err) {
        console.error('Erro no render da coluna', column.key, err);
        // Fallback para exibir algo legível
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        return value ?? '-';
      }
    }

    // Valor padrão quando não há dado
    return row[column.key] ?? '-';
  };

  // Se está em mobile, renderizar componente de cards
  if (isMobile) {
    return (
      <GenericMobileCard
        columns={columns}
        data={data}
        loading={loading}
        onSave={onSave}
        onEdit={onEdit}
        onCancel={onCancel}
        onPageChange={onPageChange}
        totalPages={totalPages}
        currentPage={currentPage}
        editingRowId={editingRowId}
        onEditRow={onEditRow}
        className={className}
        onEditDataChange={onEditDataChange}
        onEditChange={onEditChange}
        currentEditData={currentEditData}
        titleColumnKey={titleColumnKey}
        hideEditButton={hideEditButton}
      />
    );
  }

  return (
    <div className={`table-container ${className} ${(editingId || editingRowId) ? 'editing-active' : ''}`}>
      <div className="table-scroll">
        <table className="generic-table">
          <colgroup>
            {columns.map((column) => (
              <col 
                key={`col-${column.key || column.header}`} 
                className={`col-${column.key}`}
                style={column.width ? { width: column.width } : {}}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key || column.header || column.label}
                  data-key={column.key}
                  className={`header-cell ${column.key}`}
                  title={column.header || column.label} // Adiciona tooltip para mostrar o texto completo
                >
                  <div className="header-content">
                    {column.header || column.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                  Nenhum registro encontrado
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td 
                      key={column.key || column.header}
                      data-key={column.key}
                      data-column={column.key}
                      className={`data-cell ${column.key} ${((editingId === row.id) || (editingRowId === row.id)) && column.editable ? 'editing' : ''}`}
                    >
                      <div className="cell-content">
                        {editingRowId === row.id && column.editable ? (
                          column.editComponent ? (
                            // Importante: passar currentEditData ou editData, não row, para refletir mudanças em tempo real
                            column.editComponent(currentEditData || editData, handleInputChange)
                          ) : (
                            <input
                              className="edit-input"
                              type={column.type || "text"}
                              value={(currentEditData || editData)[column.key] ?? row[column.key] ?? ""}
                              onChange={(e) => handleInputChange(column.key, e.target.value)}
                            />
                          )
                        ) : (
                          renderCell(row, column)
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <div className="pagination-info">
          {data.length > 0 ? `Página ${currentPage} de ${totalPages}` : 'Sem registros'}
        </div>
        <div className="pagination-controls">
          <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1 || data.length === 0}>
            Anterior
          </button>
          <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || data.length === 0}>
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export default GenericTable;
