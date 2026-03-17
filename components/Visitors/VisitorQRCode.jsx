import React, { useState } from 'react';
import { FaCopy, FaEnvelope, FaCheck } from 'react-icons/fa';
import { listaConvidadosAPI } from '../../services/api';
import { useToast } from '../common/Toast';

/**
 * VisitorQRCode
 *
 * Exibe ações de QR para um convidado: copiar token para clipboard e enviar por e-mail.
 *
 * Props:
 *   listaId      {number|string} — ID da lista de convidados
 *   convidadoId  {number|string} — ID do convidado
 *   convidadoNome {string}       — Nome do convidado (exibido no botão)
 *   qrToken      {string}        — Token do QR code (copiado para clipboard)
 */
function VisitorQRCode({ listaId, convidadoId, convidadoNome, qrToken }) {
  const [copyStatus,  setCopyStatus]  = useState('idle'); // idle | copying | copied | error
  const [emailStatus, setEmailStatus] = useState('idle'); // idle | sending | sent | error

  const handleCopy = async () => {
    if (!qrToken) return;
    setCopyStatus('copying');
    try {
      await navigator.clipboard.writeText(qrToken);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };

  const toast = useToast();
  const handleSendEmail = async () => {
    if (!listaId || !convidadoId) return;
    setEmailStatus('sending');
    try {
      await listaConvidadosAPI.enviarQrCode(listaId, convidadoId);
      setEmailStatus('sent');
      toast.push('E-mail com o QR enviado.', { type: 'success' });
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch {
      setEmailStatus('error');
      toast.push('Falha ao enviar o e-mail.', { type: 'error' });
      setTimeout(() => setEmailStatus('idle'), 3000);
    }
  };

  return (
    <div className="visitor-qr-actions">
      {/* Copy button */}
      <button
        className={`visitor-qr-btn visitor-qr-btn--copy${copyStatus === 'copied' ? ' visitor-qr-btn--success' : ''}${copyStatus === 'error' ? ' visitor-qr-btn--error' : ''}`}
        onClick={handleCopy}
        disabled={copyStatus === 'copying' || !qrToken}
        title={`Copiar QR — ${convidadoNome}`}
      >
        {copyStatus === 'copied' ? <FaCheck /> : <FaCopy />}
        <span>
          {copyStatus === 'copied' ? 'Copiado!' : copyStatus === 'error' ? 'Erro' : 'Copiar'}
        </span>
      </button>

      {/* Send by email button */}
      <button
        className={`visitor-qr-btn visitor-qr-btn--email${emailStatus === 'sent' ? ' visitor-qr-btn--success' : ''}${emailStatus === 'error' ? ' visitor-qr-btn--error' : ''}`}
        onClick={handleSendEmail}
        disabled={emailStatus === 'sending'}
        title={`Enviar QR por e-mail — ${convidadoNome}`}
      >
        {emailStatus === 'sent' ? <FaCheck /> : <FaEnvelope />}
        <span>
          {emailStatus === 'sending' ? 'Enviando…'
            : emailStatus === 'sent'  ? 'Enviado!'
            : emailStatus === 'error' ? 'Erro'
            : 'E-mail'}
        </span>
      </button>
    </div>
  );
}

export default VisitorQRCode;
