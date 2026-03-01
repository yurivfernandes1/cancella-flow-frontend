import React from 'react';
import { FaInfoCircle, FaExclamationTriangle, FaExclamationCircle, FaBell } from 'react-icons/fa';
import '../../styles/Aviso.css';

const prioridadeConfig = {
  baixa: { className: 'aviso-baixa', icon: <FaInfoCircle /> },
  media: { className: 'aviso-media', icon: <FaBell /> },
  alta: { className: 'aviso-alta', icon: <FaExclamationTriangle /> },
  urgente: { className: 'aviso-urgente', icon: <FaExclamationCircle /> },
};

const formatDatePtBR = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return null;
  }
};

export default function AvisoBanner({ aviso }) {
  const cfg = prioridadeConfig[aviso.prioridade] || prioridadeConfig.media;
  const inicio = formatDatePtBR(aviso.data_inicio);
  const fim = formatDatePtBR(aviso.data_fim);
  return (
    <div className={`aviso-banner ${cfg.className}`}>
      <div className="aviso-icon">{cfg.icon}</div>
      <div className="aviso-content">
        <div className="aviso-title">{aviso.titulo}</div>
        {aviso.descricao && <div className="aviso-description">{aviso.descricao}</div>}
        {(inicio || fim) && (
          <div className="aviso-vigencia">
            Vigência: {inicio || '?'} — {fim || '?'}
          </div>
        )}
        <div className="aviso-meta">
          <span className="aviso-chip">{(aviso.prioridade || '').toUpperCase()}</span>
          {aviso.grupo_nome && <span className="aviso-chip light">{aviso.grupo_nome}</span>}
        </div>
      </div>
    </div>
  );
}
