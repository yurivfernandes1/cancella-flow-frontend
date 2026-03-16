import React from 'react';
import { FaTimes } from 'react-icons/fa';

function PasswordResetModal({ title = "Senha Resetada", subtitle, message, password, onClose }) {
  const handleClose = (e) => {
    if (e) e.preventDefault();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="password-modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="password-modal-content">
          {subtitle && <p>{subtitle}</p>}
          <p style={{ color: '#475569' }}>
            {message || 'Operação concluída com sucesso.'}
          </p>
          
          <div className="modal-actions">
            <button 
              type="button"
              className="button-primary" 
              onClick={handleClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordResetModal;
