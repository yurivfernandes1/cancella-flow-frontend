import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// Componente que carrega imagens protegidas (endpoint que exige token) retornando um blob URL.
// Uso: <ProtectedImage src={url} alt="..." className="..." style={{}} />
export default function ProtectedImage({ src, alt, ...rest }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let objectUrl = null;

    const shouldFetch = src && src.includes('/logo-db/');

    if (!shouldFetch) {
      // Não é URL protegida, usar direto
      setBlobUrl(null);
      return () => {};
    }

    const fetchBlob = async () => {
      try {
        setLoading(true);
        // axios aceita URL absoluto; interceptors do api adicionarão token
        const resp = await api.get(src, { responseType: 'blob' });
        if (!mounted) return;
        objectUrl = URL.createObjectURL(resp.data);
        setBlobUrl(objectUrl);
      } catch (e) {
        console.error('Erro ao carregar imagem protegida:', e);
        setBlobUrl(null);
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

  // Se blobUrl estiver definido (imagem protegida pronta), usar ele; senão usar src como fallback
  const finalSrc = blobUrl || src;

  return <img src={finalSrc} alt={alt} {...rest} />;
}
