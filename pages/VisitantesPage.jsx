import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import GenericTable from '../components/GenericTable';
import AddVisitanteDropdown from '../components/Visitantes/AddVisitanteDropdown';
import { useAuth } from '../context/AuthContext';
import api, { visitanteAPI } from '../services/api';
import '../styles/VisitantesPage.css';
import { FaPlus, FaSearch, FaEdit, FaCheck, FaTimes, FaCopy, FaEnvelope } from 'react-icons/fa';

function VisitantesPage() {
  const { user } = useAuth();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddVisitante, setShowAddVisitante] = useState(false);
  const addVisitanteButtonRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRowId, setEditingRowId] = useState(null);
  const [currentEditData, setCurrentEditData] = useState({});
  const [qrCopyStatus, setQrCopyStatus] = useState({});
  const [qrEmailStatus, setQrEmailStatus] = useState({});

  // Verificar se o usuário tem acesso
  const isPortaria = user?.groups?.some(group => group.name === 'Portaria');
  const isMorador = user?.groups?.some(group => group.name === 'Moradores');
  const hasAccess = user?.is_staff || isPortaria || isMorador;

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  const fetchData = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await api.get(`/cadastros/visitantes/?page=${page}&search=${search}`);
      if (response.data.results !== undefined) {
        setTableData(response.data.results);
        setTotalPages(response.data.num_pages || Math.ceil(response.data.count / 10));
      } else {
        setTableData(response.data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Erro ao buscar visitantes:', error);
      setTableData([]);
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

  const handleSave = async (id, data) => {
    try {
      const payload = {
        nome: data.nome,
        documento: data.documento,
        email: data.email || '',
        data_entrada: data.data_entrada ? new Date(data.data_entrada).toISOString() : null,
        data_saida: data.data_saida ? new Date(data.data_saida).toISOString() : null,
        is_permanente: Boolean(data.is_permanente),
        morador_id: data.morador
      };

      await api.patch(`/cadastros/visitantes/${id}/update/`, payload);
      fetchData(currentPage, searchTerm);
      setEditingRowId(null);
    } catch (error) {
      console.error('Erro ao atualizar visitante:', error);
      alert(`Erro ao salvar: ${error.response?.data?.error || 'Ocorreu um erro ao salvar os dados'}`);
    }
  };

  const handleEditRow = (rowId) => {
    setEditingRowId(rowId);
  };

  const handleCopyQr = async (id, token) => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(String(token));
      setQrCopyStatus(prev => ({ ...prev, [id]: 'copied' }));
      setTimeout(() => setQrCopyStatus(prev => ({ ...prev, [id]: 'idle' })), 2000);
    } catch {
      setQrCopyStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setQrCopyStatus(prev => ({ ...prev, [id]: 'idle' })), 2500);
    }
  };

  const handleSendEmail = async (id, email) => {
    if (!email) return;
    setQrEmailStatus(prev => ({ ...prev, [id]: 'sending' }));
    try {
      await visitanteAPI.enviarQrCode(id);
      setQrEmailStatus(prev => ({ ...prev, [id]: 'sent' }));
      setTimeout(() => setQrEmailStatus(prev => ({ ...prev, [id]: 'idle' })), 3000);
    } catch {
      setQrEmailStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setQrEmailStatus(prev => ({ ...prev, [id]: 'idle' })), 3000);
    }
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
      key: 'nome',
      header: 'Nome',
      width: '18%',
      editable: isMorador || user?.is_staff,
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.nome || ''}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      )
    },
    {
      key: 'documento',
      header: 'Documento',
      width: '14%',
      editable: isMorador || user?.is_staff,
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="text"
          value={editData.documento || ''}
          onChange={(e) => handleInputChange('documento', e.target.value)}
        />
      )
    },
    {
      key: 'morador_nome',
      header: 'Morador',
      width: '16%',
      render: (row) => row.morador_nome || '-'
    },
    {
      key: 'data_entrada',
      header: 'Data Entrada',
      width: '14%',
      editable: isPortaria || user?.is_staff,
      render: (row) => formatDateTime(row.data_entrada),
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="datetime-local"
          value={editData.data_entrada ? new Date(editData.data_entrada).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleInputChange('data_entrada', e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      )
    },
    {
      key: 'data_saida',
      header: 'Data Saída',
      width: '14%',
      editable: isPortaria || user?.is_staff,
      render: (row) => formatDateTime(row.data_saida),
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="datetime-local"
          value={editData.data_saida ? new Date(editData.data_saida).toISOString().slice(0, 16) : ''}
          onChange={(e) => handleInputChange('data_saida', e.target.value ? new Date(e.target.value).toISOString() : null)}
        />
      )
    },
    {
      key: 'is_permanente',
      header: 'Permanente',
      width: '8%',
      editable: isMorador || user?.is_staff,
      render: (row) => (
        <span className={row.is_permanente ? 'status-active' : 'status-inactive'}>
          {row.is_permanente ? 'Sim' : 'Não'}
        </span>
      ),
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_permanente)}
          onChange={(e) => handleInputChange('is_permanente', e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'email',
      header: 'E-mail',
      width: '16%',
      editable: isMorador || user?.is_staff,
      render: (row) => row.email || '-',
      editComponent: (editData, handleInputChange) => (
        <input
          className="edit-input"
          type="email"
          value={editData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="E-mail do visitante"
        />
      )
    },
    {
      key: 'esta_no_condominio',
      header: 'Status',
      width: '8%',
      render: (row) => (
        <span className={row.esta_no_condominio ? 'status-active' : 'status-inactive'}>
          {row.esta_no_condominio ? 'Presente' : 'Saiu'}
        </span>
      )
    }
  ];

  // Adicionar coluna de ações
  columns.push({
    key: 'actions',
    header: 'Ações',
    width: '10%',
    render: (row) => {
      const isEditing = editingRowId === row.id;
      const copyStatus = qrCopyStatus[row.id] || 'idle';
      const emailStatus = qrEmailStatus[row.id] || 'idle';

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
            <>
              <button
                className={`edit-button${copyStatus === 'copied' ? ' save-button' : copyStatus === 'error' ? ' cancel-button' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyQr(row.id, row.qr_token);
                }}
                title={row.qr_token ? 'Copiar QR Code' : 'QR indisponível'}
                disabled={!row.qr_token}
                style={{ color: copyStatus === 'copied' ? '#2abb98' : copyStatus === 'error' ? '#dc2626' : undefined }}
              >
                {copyStatus === 'copied' ? <FaCheck /> : <FaCopy />}
              </button>
              <button
                className={`edit-button${emailStatus === 'sent' ? ' save-button' : emailStatus === 'error' ? ' cancel-button' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendEmail(row.id, row.email);
                }}
                title={row.email ? 'Enviar QR por e-mail' : 'Cadastre um e-mail para enviar o QR'}
                disabled={!row.email || emailStatus === 'sending'}
                style={{
                  color: emailStatus === 'sent' ? '#2abb98' : emailStatus === 'error' ? '#dc2626' : undefined,
                  opacity: !row.email ? 0.4 : 1,
                }}
              >
                {emailStatus === 'sent' ? <FaCheck /> : <FaEnvelope />}
              </button>
              <button
                className="edit-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditRow(row.id);
                }}
                title="Editar visitante"
              >
                <FaEdit />
              </button>
            </>
          )}
        </div>
      );
    }
  });

  return (
    <div className="visitantes-page">
      <Header />

      <main className="visitantes-content">
        <div className="page-header">
          <h1>Gerenciamento de Visitantes</h1>
          
          <div className="page-actions">
            {(isMorador || user?.is_staff) && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-button"
                  onClick={() => setShowAddVisitante(true)}
                  ref={addVisitanteButtonRef}
                >
                  <FaPlus /> Adicionar Visitante
                </button>
                {showAddVisitante && (
                  <AddVisitanteDropdown
                    onClose={() => setShowAddVisitante(false)}
                    onSuccess={() => {
                      fetchData(currentPage, searchTerm);
                      setShowAddVisitante(false);
                    }}
                    triggerRef={addVisitanteButtonRef}
                  />
                )}
              </div>
            )}

            <div className="search-container">
              <div className="search-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por nome, documento ou morador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>
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
        />
      </main>
    </div>
  );
}

export default VisitantesPage;
