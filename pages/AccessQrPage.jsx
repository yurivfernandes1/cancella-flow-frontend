import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import ProtectedImage from '../components/common/ProtectedImage';
import '../styles/ProfilePage.css';

export default function AccessQrPage() {
  const { user, condominioData, condominioLogoUrl } = useAuth();
  const [qrUrl, setQrUrl] = useState(null);

  useEffect(() => {
    const cpfDigits = (user?.cpf || '').replace(/\D/g, '');
    const token = cpfDigits ? `MORADOR:${cpfDigits}` : '';
    if (!token) { setQrUrl(null); return; }
    let mounted = true;
    // Gerar QR menor para dar mais espaço à logo
    QRCode.toDataURL(token, { margin: 1, width: 280 })
      .then((url) => { if (mounted) setQrUrl(url); })
      .catch(() => { if (mounted) setQrUrl(null); });
    return () => { mounted = false; };
  }, [user]);

  const firstName = (user?.first_name || user?.full_name || '').split(/\s+/)[0] || '';

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 420, background: '#fff', border: '1px solid #e6eef0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        {condominioLogoUrl && (
          <div style={{ marginBottom: 10 }}>
            <ProtectedImage src={condominioLogoUrl} alt="Logo do condomínio" style={{ width: 140, height: 140, objectFit: 'contain' }} />
          </div>
        )}
        {qrUrl ? (
          <div>
            <img src={qrUrl} alt="QR de acesso" style={{ width: 260, height: 260, background: '#fff', padding: 8, borderRadius: 8 }} />
            <div style={{ marginTop: 12, fontWeight: 700 }}>{firstName}</div>
          </div>
        ) : (
          <div style={{ color: '#64748b' }}>CPF ausente — preencha seu CPF no perfil para gerar o QR de acesso.</div>
        )}
      </div>
    </div>
  );
}
