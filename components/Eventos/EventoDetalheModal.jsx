import React, { useState } from 'react';
import ProtectedImage from '../common/ProtectedImage';
import { FaTimes, FaExpand, FaCompress } from 'react-icons/fa';
import '../../styles/Modal.css';

function EventoDetalheModal({ isOpen, onClose, evento }) {
  const [expanded, setExpanded] = useState(false);
  if (!isOpen || !evento) return null;

  const titulo = evento.titulo || 'Sem título';
  const descricao = evento.descricao || '';
  const imagem = evento.imagem_url || null;
  const data = evento.data_evento || '-';
  const inicio = evento.hora_inicio ? evento.hora_inicio.slice(0,5) : '-';
  const fim = evento.hora_fim ? evento.hora_fim.slice(0,5) : '-';
  const local = evento.espaco_nome || evento.local_texto || '-';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: expanded ? '95%' : 720, width: expanded ? '95%' : 'auto' }}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {imagem && (
              <button className="modal-icon-button" onClick={() => setExpanded(prev => !prev)} title={expanded ? 'Reduzir' : 'Expandir'}>
                {expanded ? <FaCompress /> : <FaExpand />}
              </button>
            )}
            <button className="modal-close" onClick={onClose}><FaTimes /></button>
          </div>
        </div>

        <div className="modal-content" style={{ display: 'flex', flexDirection: expanded ? 'column' : 'row', gap: 16 }}>
          {imagem && (
            <div style={{ flex: expanded ? 'none' : '0 0 320px', maxHeight: expanded ? '80vh' : 220, overflow: 'hidden' }}>
              <ProtectedImage src={imagem} alt={titulo} style={{ width: '100%', height: expanded ? 'auto' : 220, objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ flex: 1 }}>
            <p style={{ marginTop: 0 }}>{descricao}</p>
            <div style={{ marginTop: 12 }}>
              <div><strong>Data:</strong> {data}</div>
              <div><strong>Horário:</strong> {inicio} - {fim}</div>
              <div><strong>Local:</strong> {local}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default EventoDetalheModal;
