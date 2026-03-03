import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaTimes, FaRedo, FaCheckCircle, FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';
import { listaConvidadosAPI, condominioAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ProtectedImage from '../common/ProtectedImage';

const QR_ID = 'qr-scanner-viewport';
// Altura do app-header (definida em Header.css)
const HEADER_H = 64;

export default function QrCodeScanner({ onClose, onConfirmado }) {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const [fase, setFase] = useState('scanning'); // 'scanning' | 'loading' | 'resultado'
  const [resultado, setResultado] = useState(null);
  const [erroCam, setErroCam] = useState('');
  const [condLogo, setCondLogo] = useState(null);
  const [condNome, setCondNome] = useState('');

  // Buscar logo e nome do condomínio
  useEffect(() => {
    const condId = user?.condominio_id || user?.condominio?.id;
    const nomeUser = user?.condominio_nome || user?.condominio?.nome || '';
    if (nomeUser) setCondNome(nomeUser);
    if (!condId) return;
    condominioAPI.get(condId)
      .then(r => {
        if (r.data?.logo_url) setCondLogo(r.data.logo_url);
        if (r.data?.nome) setCondNome(r.data.nome);
      })
      .catch(() => {});
  }, [user]);

  const pararScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  const iniciarScanner = useCallback(() => {
    setResultado(null);
    setErroCam('');
    setFase('scanning');
    processingRef.current = false;

    // Pequeno delay para garantir que o DOM está pronto
    setTimeout(async () => {
      const el = document.getElementById(QR_ID);
      if (!el) return;

      const qr = new Html5Qrcode(QR_ID);
      scannerRef.current = qr;

      try {
        await qr.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          async (text) => {
            if (processingRef.current) return;
            processingRef.current = true;
            await pararScanner();
            setFase('loading');
            try {
              const resp = await listaConvidadosAPI.confirmarPorQrCode(text.trim());
              const d = resp.data;
              setResultado(
                d.aviso
                  ? { tipo: 'aviso', msg: d.aviso, nome: d.nome, lista: d.lista }
                  : { tipo: 'sucesso', msg: 'Entrada confirmada!', nome: d.nome, lista: d.lista }
              );
              if (!d.aviso) onConfirmado?.(d);
            } catch (e) {
              setResultado({ tipo: 'invalido', msg: e.response?.data?.error || 'QR Code inválido ou expirado.' });
            } finally {
              setFase('resultado');
            }
          },
          () => {} // erros de frame — ignorar
        );
      } catch {
        setErroCam('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
        setFase('resultado');
        setResultado({ tipo: 'invalido', msg: 'Câmera indisponível.' });
      }
    }, 200);
  }, [pararScanner, onConfirmado]);

  useEffect(() => {
    iniciarScanner();
    return () => { pararScanner(); };
  }, []);

  const handleLerOutro = () => {
    pararScanner().then(() => iniciarScanner());
  };

  const corMap = {
    sucesso:  { accent: '#059669', bg: '#d1fae5', text: '#065f46', icon: <FaCheckCircle size={28} /> },
    aviso:    { accent: '#d97706', bg: '#fef3c7', text: '#92400e', icon: <FaExclamationTriangle size={28} /> },
    invalido: { accent: '#dc2626', bg: '#fee2e2', text: '#991b1b', icon: <FaExclamationCircle size={28} /> },
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: '#ffffff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto',
      // O app-header (z-index 9999) fica visível por cima; o conteúdo começa abaixo dele
      paddingTop: HEADER_H,
    }}>

      {/* CSS para forçar vídeo quadrado dentro do container */}
      <style>{`
        #${QR_ID} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #${QR_ID} > div { border: none !important; padding: 0 !important; }
        @keyframes qr-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Botão fechar — logo abaixo do header */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: HEADER_H + 12, right: 16, zIndex: 10,
          background: '#f1f5f9', border: '1px solid #e2e8f0',
          borderRadius: '50%', width: 40, height: 40,
          cursor: 'pointer', color: '#374151', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <FaTimes size={16} />
      </button>

      {/* Cabeçalho com logo */}
      <div style={{
        width: '100%', paddingTop: 20, paddingBottom: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        {condLogo ? (
          <ProtectedImage
            src={condLogo}
            alt="Logo"
            style={{ height: 60, width: 'auto', maxWidth: 150, objectFit: 'contain', borderRadius: 8 }}
            onError={() => setCondLogo(null)}
          />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: 12,
            background: 'rgba(42,187,152,0.08)', border: '1.5px solid #2abb98',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 26 }}>🏢</span>
          </div>
        )}
        {condNome && (
          <p style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
            {condNome}
          </p>
        )}
        <p style={{ color: '#2abb98', fontWeight: 600, fontSize: '0.78rem', margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Confirmar Entrada · QR Code
        </p>
      </div>

      {/* Área da câmera — container quadrado fixo */}
      {fase !== 'resultado' && (
        <div style={{ position: 'relative', width: 280, height: 280, flexShrink: 0 }}>
          <div
            id={QR_ID}
            style={{
              width: 280, height: 280,
              borderRadius: 16,
              overflow: 'hidden',
              background: '#000',
            }}
          />

          {/* Cantos do viewfinder */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 220, height: 220 }}>
              {[
                { top: 0, left: 0, borderTop: '3px solid #2abb98', borderLeft: '3px solid #2abb98', borderRadius: '4px 0 0 0' },
                { top: 0, right: 0, borderTop: '3px solid #2abb98', borderRight: '3px solid #2abb98', borderRadius: '0 4px 0 0' },
                { bottom: 0, left: 0, borderBottom: '3px solid #2abb98', borderLeft: '3px solid #2abb98', borderRadius: '0 0 0 4px' },
                { bottom: 0, right: 0, borderBottom: '3px solid #2abb98', borderRight: '3px solid #2abb98', borderRadius: '0 0 4px 0' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
              ))}
            </div>
          </div>

          {fase === 'loading' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
              borderRadius: 16, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, border: '3px solid rgba(255,255,255,0.25)',
                borderTopColor: '#2abb98', borderRadius: '50%',
                animation: 'qr-spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '0.85rem', color: '#e5e7eb' }}>Verificando...</span>
            </div>
          )}
        </div>
      )}

      {/* Instrução */}
      {fase === 'scanning' && (
        <p style={{
          color: '#64748b', fontSize: '0.82rem', textAlign: 'center',
          margin: '16px 24px 0', lineHeight: 1.5,
        }}>
          Aponte a câmera para o QR Code do convidado para confirmar a entrada
        </p>
      )}

      {/* Card de resultado */}
      {fase === 'resultado' && resultado && (() => {
        const c = corMap[resultado.tipo];
        return (
          <div style={{ width: '100%', maxWidth: 360, padding: '32px 20px 0' }}>
            <div style={{
              background: c.bg, borderRadius: 18, padding: '1.8rem 1.4rem',
              textAlign: 'center', border: `2px solid ${c.accent}`,
              boxShadow: `0 8px 32px ${c.accent}22`,
            }}>
              <div style={{ color: c.accent, marginBottom: 12 }}>{c.icon}</div>
              <p style={{ fontWeight: 700, color: c.text, fontSize: '1.1rem', margin: '0 0 6px' }}>
                {resultado.msg}
              </p>
              {resultado.nome && (
                <p style={{ color: c.text, fontSize: '0.95rem', fontWeight: 600, margin: '4px 0' }}>
                  {resultado.nome}
                </p>
              )}
              {resultado.lista && (
                <p style={{ color: c.text, fontSize: '0.8rem', margin: '4px 0', opacity: 0.8 }}>
                  Lista: {resultado.lista}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={handleLerOutro}
                style={{
                  flex: 1, background: '#2abb98', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '12px', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <FaRedo size={13} /> Ler outro
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, background: '#f1f5f9', color: '#374151',
                  border: '1px solid #e2e8f0', borderRadius: 10,
                  padding: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        );
      })()}

      {erroCam && (
        <p style={{ color: '#dc2626', fontSize: '0.82rem', textAlign: 'center', margin: '16px 24px 0' }}>
          {erroCam}
        </p>
      )}
    </div>
  );
}
