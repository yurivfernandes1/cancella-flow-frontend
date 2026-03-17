import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

// Small modal-style toast that mimics PasswordResetModal appearance
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, type }

  const push = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToast({ id, message, type });
    if (duration > 0) {
      setTimeout(() => {
        setToast(null);
      }, duration);
    }
    return id;
  }, []);

  const remove = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      {toast && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={(e) => e.stopPropagation()}>
          <div className="password-modal" style={{ zIndex: 2010 }} onClick={(e) => e.stopPropagation()}>
            <div className="password-modal-header">
              <h3>{toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : 'Aviso'}</h3>
              <button className="modal-close" onClick={remove}>×</button>
            </div>
            <div className="password-modal-content">
              <p style={{ color: '#475569' }}>{toast.message}</p>
              <div className="modal-actions" style={{ marginTop: 12, textAlign: 'right' }}>
                <button type="button" className="button-primary" onClick={remove}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
