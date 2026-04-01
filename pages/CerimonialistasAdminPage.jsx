import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FaPlus, FaSearch } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AddUserDropdown from '../components/Users/AddUserDropdown';
import UsersCards from '../components/Users/UsersCards';
import DeleteConfirm from '../components/Users/DeleteConfirm';
import PasswordResetModal from '../components/Users/PasswordResetModal';
import { generateStrongPassword } from '../utils/passwordGenerator';
import '../styles/UsersPage.css';

function CerimonialistasAdminPage() {
  const { user } = useAuth();
  const hasAccess = user?.is_staff || user?.groups?.some((g) => g.name === 'admin');

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetInfo, setResetInfo] = useState({
    show: false,
    title: '',
    subtitle: '',
    message: '',
  });

  const addButtonRef = useRef(null);

  const fetchUsers = async (page = currentPage, search = searchTerm) => {
    setLoading(true);
    try {
      const response = await api.get('/access/users/', {
        params: {
          type: 'cerimonialistas',
          page,
          search,
        },
      });

      const list = response.data?.results || [];
      setUsers(Array.isArray(list) ? list : []);
      setTotalPages(response.data?.num_pages || 1);
    } catch (error) {
      console.error('Erro ao carregar cerimonialistas:', error);
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;
    const t = setTimeout(() => {
      fetchUsers(currentPage, searchTerm);
    }, 300);

    return () => clearTimeout(t);
  }, [hasAccess, currentPage, searchTerm]);

  const handleSave = async (id, data) => {
    const payload = {
      full_name: data.full_name,
      email: data.email,
      cpf: data.cpf,
      phone: data.phone,
      is_active: Boolean(data.is_active),
    };

    if (data.username) payload.username = data.username;

    await api.patch(`/access/profile/${id}/`, payload);
    await fetchUsers(currentPage, searchTerm);
  };

  const handleDeactivate = async () => {
    if (!deleteTarget?.id) return;
    await api.patch(`/access/profile/${deleteTarget.id}/`, {
      is_active: false,
    });
    setDeleteTarget(null);
    await fetchUsers(currentPage, searchTerm);
  };

  const handleResetPassword = async (id) => {
    const target = users.find((u) => u.id === id);
    const password = generateStrongPassword();

    const response = await api.patch(`/access/profile/${id}/`, {
      password,
    });
    const senhaEmailEnviado = Boolean(response?.data?.senha_email_enviado);
    const senhaEmailErro = response?.data?.senha_email_erro;

    setResetInfo({
      show: true,
      title: 'Senha redefinida',
      subtitle: target?.username ? `Usuário: ${target.username}` : '',
      message: senhaEmailEnviado
        ? 'Uma nova senha foi enviada por e-mail para o cerimonialista.'
        : `Senha redefinida, mas não foi possível enviar e-mail${
            senhaEmailErro ? `: ${senhaEmailErro}` : ''
          }.`,
    });
  };

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="tecnicos-page users-page">
      <div className="tecnicos-content">
        <div className="page-header">
          <div className="page-actions">
            <button
              ref={addButtonRef}
              className="add-button"
              onClick={() => setShowAddUser(true)}
            >
              <FaPlus /> Novo Cerimonialista
            </button>
          </div>

          <div className="search-container">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="Buscar cerimonialistas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <UsersCards
          users={users}
          loading={loading}
          userType="cerimonialista"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onSave={handleSave}
          onResetPassword={handleResetPassword}
          onDelete={(u) => setDeleteTarget(u)}
        />

        {showAddUser && (
          <AddUserDropdown
            onClose={() => setShowAddUser(false)}
            onSuccess={() => {
              setShowAddUser(false);
              fetchUsers(1, searchTerm);
            }}
            triggerRef={addButtonRef}
            userType="cerimonialista"
            position="center"
          />
        )}

        {deleteTarget && (
          <DeleteConfirm
            title="Desativar Cerimonialista"
            message={`${deleteTarget.full_name || deleteTarget.username}`}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDeactivate}
          />
        )}

        {resetInfo.show && (
          <PasswordResetModal
            title={resetInfo.title}
            subtitle={resetInfo.subtitle}
            message={resetInfo.message}
            onClose={() =>
              setResetInfo({ show: false, title: '', subtitle: '', message: '' })
            }
          />
        )}
      </div>
    </div>
  );
}

export default CerimonialistasAdminPage;
