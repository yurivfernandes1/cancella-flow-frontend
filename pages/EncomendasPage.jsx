import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import GenericTable from '../components/GenericTable';
import AddEncomendaDropdown from '../components/Encomendas/AddEncomendaDropdown';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/EncomendasPage.css';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

function EncomendasPage() {
  const { user } = useAuth();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddEncomenda, setShowAddEncomenda] = useState(false);
  const addEncomendaButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [incluirEntregues, setIncluirEntregues] = useState(false);
  const [unidadeAntigaId, setUnidadeAntigaId] = useState('');
  const [codigoAntiga, setCodigoAntiga] = useState('');
  const [unidades, setUnidades] = useState([]);

  // Verificar se o usuário tem acesso
  const isPortaria = user?.groups?.some(group => group.name === 'Portaria');
  const isMorador = user?.groups?.some(group => group.name === 'Moradores');
  const hasAccess = user?.is_staff || isPortaria || isMorador;

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const fetchData = async (page = 1, search = '', incluirEntregues = false, unidadeId = '', codigo = '') => {
    setLoading(true);
    try {
      let url = `/cadastros/encomendas/?page=${page}&search=${search}`;
      
      if (incluirEntregues) {
        url += '&incluir_entregues=true';
      }
      if (unidadeId) {
        url += `&unidade_antiga=${unidadeId}`;
      }
      if (codigo) {
        url += `&codigo_antiga=${codigo}`;
      }
      
      const response = await api.get(url);
      if (response.data.results !== undefined) {
        setTableData(response.data.results);
        setTotalPages(response.data.num_pages || Math.ceil(response.data.count / 10));
      } else {
        setTableData(response.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
      setTableData([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnidades = async () => {
    try {
      const response = await api.get('/cadastros/unidades/');
      const unidadesData = response.data.results || response.data;
      setUnidades(unidadesData);
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
    }
  };

  useEffect(() => {
    fetchUnidades();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(currentPage, searchTerm, incluirEntregues, unidadeAntigaId, codigoAntiga);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, incluirEntregues, unidadeAntigaId, codigoAntiga]);

  const handleSave = async (id, data) => {
    try {
      const payload = {
        descricao: data.descricao,
        codigo_rastreio: data.codigo_rastreio || '',
        retirado_por: data.retirado_por || '',
        retirado_em: data.retirado_em || null,
        destinatario_id: data.destinatario
      };

      await api.patch(`/cadastros/encomendas/${id}/update/`, payload);
      fetchData(currentPage, searchTerm, incluirEntregues, unidadeAntigaId, codigoAntiga);
      setEditingRowId(null);
    } catch (error) {
      console.error('Erro ao atualizar encomenda:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
    }
  };

  const handleEditRow = (rowId) => {
    setEditingRowId(rowId);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns = [
    {
      key: 'destinatario_nome',
      header: 'Destinatário',
        width: '220px',
      render: (row) => row.destinatario_nome || '-'
    },
    {
      key: 'descricao',
      header: 'Descrição',
        width: '220px',
      editable: isPortaria || user?.is_staff,
      editComponent: (editData, handleInputChange) => (
        <textarea
          className="edit-textarea"
          value={editData.descricao || ''}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          rows="2"
        />
      )
    },
    {
      key: 'codigo_rastreio',
      header: 'Código Rastreio',
        width: '180px',
      editable: isPortaria || user?.is_staff,
      render: (row) => row.codigo_rastreio || '-',
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.codigo_rastreio || ''}
          onChange={(e) => handleInputChange('codigo_rastreio', e.target.value)}
        />
      )
    },
    {
      key: 'retirado_por',
      header: 'Retirado Por',
        width: '180px',
      editable: isPortaria || user?.is_staff,
      render: (row) => row.retirado_por || '-',
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.retirado_por || ''}
          onChange={(e) => handleInputChange('retirado_por', e.target.value)}
        />
      )
    },
    {
      key: 'retirado_em',
      header: 'Data Retirada',
        width: '180px',
      editable: isPortaria || user?.is_staff,
      render: (row) => formatDateTime(row.retirado_em),
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="datetime-local"
          value={editData.retirado_em ? new Date(editData.retirado_em).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleInputChange('retirado_em', e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      )
    },
    {
      key: 'created_on',
      header: 'Cadastrada em',
        width: '180px',
      render: (row) => formatDateTime(row.created_on)
    }
  ];

  // Adicionar coluna de ações apenas para Portaria
  if (isPortaria || user?.is_staff) {
    columns.push({
      key: 'actions',
      header: 'Ações',
      width: '6%',
      render: (row) => {
        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(row.id, currentEditData && currentEditData.id === row.id ? currentEditData : row);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <button
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditRow(row.id);
                }}
                title="Editar encomenda"
              >
                <FaEdit />
              </button>
            )}
          </div>
        );
      }
    });
  }

  return (
    <div className="encomendas-page">
      <Header />

      <main className="encomendas-content">
        <div className="page-header">
          <h1>Gerenciamento de Encomendas</h1>
          
          <div className="page-actions">
            {(isPortaria || user?.is_staff) && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-button"
                  onClick={() => setShowAddEncomenda(true)}
                  ref={addEncomendaButtonRef}
                >
                  <FaPlus /> Adicionar Encomenda
                </button>
                {showAddEncomenda && (
                  <AddEncomendaDropdown
                    onClose={() => setShowAddEncomenda(false)}
                    onSuccess={() => {
                      fetchData(currentPage, searchTerm, incluirEntregues, unidadeAntigaId, codigoAntiga);
                      setShowAddEncomenda(false);
                    }}
                    triggerRef={addEncomendaButtonRef}
                  />
                )}
              </div>
            )}

            <div className="search-container">
              <div className="search-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por destinatário, descrição ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={incluirEntregues}
                onChange={(e) => {
                  setIncluirEntregues(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              Incluir encomendas entregues
            </label>
          </div>

          <div className="filter-group">
            <label htmlFor="unidade-filter">Buscar antigas por unidade:</label>
            <select
              id="unidade-filter"
              value={unidadeAntigaId}
              onChange={(e) => {
                setUnidadeAntigaId(e.target.value);
                setCodigoAntiga(''); // Limpa o outro filtro
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">Selecione uma unidade...</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.identificacao_completa || `${unidade.bloco} - ${unidade.numero}`}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="codigo-filter">Buscar por código:</label>
            <input
              id="codigo-filter"
              type="text"
              value={codigoAntiga}
              onChange={(e) => {
                setCodigoAntiga(e.target.value);
                setUnidadeAntigaId(''); // Limpa o outro filtro
                setCurrentPage(1);
              }}
              placeholder="Código de rastreio..."
              className="filter-input"
            />
          </div>

          {(unidadeAntigaId || codigoAntiga || incluirEntregues) && (
            <button
              className="clear-filters-button"
              onClick={() => {
                setUnidadeAntigaId('');
                setCodigoAntiga('');
                setIncluirEntregues(false);
                setCurrentPage(1);
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        <GenericTable
          columns={columns}
          data={tableData}
          loading={loading}
          onPageChange={(page) => setCurrentPage(page)}
          totalPages={totalPages}
          currentPage={currentPage}
          onSave={handleSave}
          className="full-width-table allow-horizontal-scroll"
          editingRowId={editingRowId}
          onEditRow={handleEditRow}
          onEditDataChange={setCurrentEditData}
          titleColumnKey={'codigo_rastreio'}
        />
      </main>
    </div>
  );
}

export default EncomendasPage;
