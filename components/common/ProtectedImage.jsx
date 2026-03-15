import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// Componente que carrega imagens protegidas (endpoint que exige token) retornando um blob URL.
// Exibe spinner durante o carregamento e fallback após erro definitivo.
// Uso: <ProtectedImage src={url} alt="..." className="..." style={{}} />
export default function ProtectedImage({ src, alt, fallbackSrc, ...rest }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl = null;

    const shouldFetch = src && src.includes('/logo-db/');

    if (!shouldFetch) {
      setBlobUrl(null);
      setLoading(false);
      setError(false);
      return () => {};
    }

    setLoading(true);
    setError(false);
    setBlobUrl(null);

    const fetchBlob = async () => {
      try {
        const resp = await api.get(src, { responseType: 'blob' });
        if (!mounted) return;
        objectUrl = URL.createObjectURL(resp.data);
        setBlobUrl(objectUrl);
      } catch (e) {
        console.error('Erro ao carregar imagem protegida:', e);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBlob();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (loading) {
    const { className, style } = rest;
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: 8,
          ...style,
        }}
        aria-label="Carregando imagem..."
      >
        <div style={{
          width: 28,
          height: 28,
          border: '3px solid #d1fae5',
          borderTopColor: '#2abb98',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} alt={alt} {...rest} />;
    }
    const { className, style } = rest;
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#9ca3af',
          fontSize: '0.75rem',
          borderRadius: 8,
          ...style,
        }}
      >
        {alt || 'Imagem indisponível'}
      </div>
    );
  }

  const finalSrc = blobUrl || src;
  return <img src={finalSrc} alt={alt} {...rest} />;
}
