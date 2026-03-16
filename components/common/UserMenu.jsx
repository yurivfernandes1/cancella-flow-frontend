import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaKey, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import ProtectedImage from './ProtectedImage';

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || '?';

  const avatarUrl = user?.foto_url || user?.foto || user?.avatar || user?.profile_picture || null;

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <button
        className="user-menu-avatar-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu do usuário"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <ProtectedImage src={avatarUrl} alt="Avatar" className="user-menu-avatar-img" />
        ) : (
          <span className="user-menu-avatar-initials">{initials}</span>
        )}
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-info">
            <span className="user-menu-name">
              {user?.first_name} {user?.last_name}
            </span>
          </div>
          <div className="user-menu-divider" />
          <Link
            to="/perfil/meu"
            className="user-menu-item"
            onClick={() => setOpen(false)}
          >
            <FaUser /> Meu Perfil
          </Link>
          <Link
            to="/perfil/senha"
            className="user-menu-item"
            onClick={() => setOpen(false)}
          >
            <FaKey /> Alterar Senha
          </Link>
          <button className="user-menu-item user-menu-logout" onClick={handleLogout}>
            <FaSignOutAlt /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
