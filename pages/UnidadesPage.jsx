import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import GenericTable from '../components/GenericTable';
import AddUnidadeModal from '../components/Unidades/AddUnidadeModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/UsersPage.css';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaBan, FaTrash } from 'react-icons/fa';

function UnidadesPage() {
  const { user } = useAuth();
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});

  // Verificar se o usuário é síndico
  const isSindico = user?.groups?.some(group => group.name === 'Síndicos');
  const hasAccess = user?.is_staff || isSindico;

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const fetchData = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await api.get(`/cadastros/unidades/?page=${page}&search=${search}`);
      if (response.data.results !== undefined) {
        setUnidades(response.data.results);
        setTotalPages(response.data.num_pages || Math.ceil(response.data.count / 10));
      } else {
        setUnidades(response.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      setUnidades([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(currentPage, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm]);

  const handleSaveUnidade = async (id, data) => {
    try {
      console.log('Salvando unidade:', id, data);
      const payload = {
        numero: data.numero,
        bloco: data.bloco || '',
      };
      console.log('Payload:', payload);

      await api.patch(`/cadastros/unidades/${id}/update/`, payload);
      fetchData(currentPage, searchTerm);
      setEditingRowId(null);
      setCurrentEditData({});
    } catch (error) {
      console.error('Erro ao atualizar unidade:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
    }
  };

  const handleInactivateUnidade = async (id) => {
    if (!window.confirm('Deseja realmente inativar esta unidade?')) {
      return;
    }

    try {
      await api.patch(`/cadastros/unidades/${id}/inactivate/`);
      alert('Unidade inativada com sucesso!');
      fetchData(currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao inativar unidade:', error);
      alert(`Erro ao inativar: ${error.response?.data?.error || 'Ocorreu um erro'}`);
    }
  };

  const handleDeleteUnidade = async (id) => {
    if (!window.confirm('Tem certeza que deseja EXCLUIR esta unidade? Essa ação não pode ser desfeita.')) {
      return;
    }
    try {
      await api.delete(`/cadastros/unidades/${id}/delete/`);
      alert('Unidade excluída com sucesso!');
      fetchData(currentPage, searchTerm);
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      alert(`Erro ao excluir: ${error.response?.data?.error || 'Ocorreu um erro'}`);
    }
  };

  const columns = [
    {
      key: 'numero',
      label: 'Número',
      width: '150px',
      editable: true
    },
    {
      key: 'bloco',
      label: 'Bloco',
      width: '150px',
      editable: true
    },
    {
      key: 'identificacao_completa',
      label: 'Identificação',
      width: '200px',
      editable: false
    },
    {
      key: 'is_active',
      label: 'Status',
      width: '120px',
      editable: false,
      render: (value) => (
        <span className={`status-badge ${value ? 'status-active' : 'status-inactive'}`}>
          {value ? 'Ativa' : 'Inativa'}
        </span>
      )
    },
    {
      key: 'created_on',
      label: 'Cadastrado em',
      width: '180px',
      editable: false,
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    },
    {
      key: 'actions',
      label: 'Ações',
      width: '150px',
      render: (_, row) => {
        if (editingRowId === row.id) {
          return (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSaveUnidade(row.id, currentEditData)}
                className="action-button save-button"
                title="Salvar"
              >
                <FaCheck />
              </button>
              <button
                onClick={() => {
                  setEditingRowId(null);
                  setCurrentEditData({});
                }}
                className="action-button cancel-button"
                title="Cancelar"
              >
                <FaTimes />
              </button>
            </div>
          );
        }
        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setEditingRowId(row.id);
                setCurrentEditData({ ...row });
              }}
              className="action-button edit-button"
              title="Editar"
            >
              <FaEdit />
            </button>
            {row.is_active && (
              <button
                onClick={() => handleInactivateUnidade(row.id)}
                className="action-button delete-button"
                title="Inativar"
              >
                <FaBan />
              </button>
            )}
            {(user?.is_staff) && (
              <button
                onClick={() => handleDeleteUnidade(row.id)}
                className="action-button delete-button"
                title="Excluir permanentemente"
              >
                <FaTrash />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <>
      <Header />
      <div className="users-page">
        <div className="page-header">
          <h1>Gestão de Unidades</h1>
        </div>

        <div className="filters-section">
          <div className="actions-group">
            <button
              onClick={() => setShowAddModal(true)}
              className="add-button"
            >
              <FaPlus /> Cadastrar Unidades
            </button>
          </div>
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar unidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <GenericTable
          data={unidades}
          columns={columns}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="full-width-table allow-horizontal-scroll"
          editingRowId={editingRowId}
          onEditRow={(id) => setEditingRowId(id)}
          onEditChange={(field, value) => {
            setCurrentEditData(prev => ({ ...prev, [field]: value }));
          }}
          onEditDataChange={setCurrentEditData}
          currentEditData={currentEditData}
        />

        {showAddModal && (
          <AddUnidadeModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              fetchData(currentPage, searchTerm);
              setShowAddModal(false);
            }}
          />
        )}
      </div>
    </>
  );
}

export default UnidadesPage;
