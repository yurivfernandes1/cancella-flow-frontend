import React, { useEffect, useState } from 'react';
import api from '../../services/api';

// Cache de blob URLs por src — evita re-fetches para a mesma URL na mesma sessão
const blobCache = new Map();

// Promises em andamento — deduplica requests simultâneos para a mesma URL
const pendingFetches = new Map();

// Chame antes de re-exibir uma logo que acabou de ser sobrescrita no servidor
export function invalidateBlobCache(url) {
  if (!url) return;
  // Também invalida versões com cache-busting (?t=...)
  const base = url.split('?')[0];
  for (const key of blobCache.keys()) {
    if (key === url || key.startsWith(base)) {
      URL.revokeObjectURL(blobCache.get(key));
      blobCache.delete(key);
    }
  }
  // Cancela qualquer fetch em andamento para esta URL
  for (const key of pendingFetches.keys()) {
    if (key === url || key.startsWith(base)) {
      pendingFetches.delete(key);
    }
  }
}

// Retorna um blob URL cacheado (ou undefined)
export function getCachedBlobUrl(url) {
  if (!url) return null;
  return blobCache.get(url);
}

// Componente que carrega imagens protegidas (endpoint que exige token) retornando um blob URL.
// Exibe spinner durante o carregamento e fallback após erro definitivo.
// Uso: <ProtectedImage src={url} alt="..." className="..." style={{}} />
export default function ProtectedImage({ src, alt, fallbackSrc, ...rest }) {
  const cached = src ? blobCache.get(src) : null;
  const [blobUrl, setBlobUrl] = useState(cached || null);
  const [loading, setLoading] = useState(
    () => !!(src && (src.includes('/logo-db/') || src.includes('/imagem-db/') || src.includes('/foto-db/')) && !cached)
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const shouldFetch = src && (src.includes('/logo-db/') || src.includes('/foto-db/') || src.includes('/imagem-db/'));

    if (!shouldFetch) {
      setBlobUrl(null);
      setLoading(false);
      setError(false);
      return () => {};
    }

    // Serve do cache se disponível
    if (blobCache.has(src)) {
      setBlobUrl(blobCache.get(src));
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    setError(false);
    setBlobUrl(null);

    const fetchBlob = async () => {
      try {
        // Reutiliza a promise em andamento se outro componente já iniciou o fetch
        let promise = pendingFetches.get(src);
        if (!promise) {
          // Tentar usar caminho relativo quando a URL for mesma origem
          let fetchUrl = src;
          try {
            const parsed = new URL(src, window.location.origin);
            if (parsed.origin === window.location.origin) {
              fetchUrl = parsed.pathname + (parsed.search || '');
            } else if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
              fetchUrl = src.replace(/^http:\/\//, 'https://');
            }
          } catch (e) {
            // se URL inválida, usa src cru
            fetchUrl = src;
          }

          // Garantir envio do header Authorization usando o token do localStorage
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          const headers = token ? { Authorization: `Token ${token}` } : {};

          promise = api.get(fetchUrl, { responseType: 'blob', headers }).then((resp) => {
            const objectUrl = URL.createObjectURL(resp.data);
            blobCache.set(src, objectUrl);
            return objectUrl;
          }).catch(async (err) => {
            // Se 401, tenta um fallback direto com fetch() incluindo Authorization
            try {
              const status = err?.response?.status || (err && err.status) || null;
              if (status === 401) {
                console.debug('ProtectedImage: axios returned 401, trying fetch fallback', fetchUrl);
                const token2 = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const fallbackHeaders = token2 ? { Authorization: `Token ${token2}` } : {};
                const fResp = await fetch(fetchUrl, { headers: fallbackHeaders });
                if (!fResp.ok) throw new Error(`Fallback fetch failed: ${fResp.status}`);
                const blob = await fResp.blob();
                const objectUrl2 = URL.createObjectURL(blob);
                blobCache.set(src, objectUrl2);
                return objectUrl2;
              }
            } catch (e2) {
              // continue to throw original error below
              console.debug('ProtectedImage fallback failed', e2);
            }
            throw err;
          }).finally(() => {
            pendingFetches.delete(src);
          });
          pendingFetches.set(src, promise);
        }
        const objectUrl = await promise;
        if (!mounted) return;
        setBlobUrl(objectUrl);
      } catch (e) {
        console.error('Erro ao carregar imagem protegida:', e);
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchBlob();

    // Não revogamos URL ao desmontar — está no cache para reutilização
    return () => { mounted = false; };
  }, [src]);

  if (loading) {
    const { className, style } = rest;
    const isCircular = typeof className === 'string' && /avatar|avatar-img|condo-logo|sidebar-condo-logo|user-menu-avatar/.test(className);
    const spinnerSize = isCircular ? 36 : 28;
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: isCircular ? '50%' : 8,
          ...style,
        }}
        aria-label="Carregando imagem..."
      >
        <div style={{
          width: spinnerSize,
          height: spinnerSize,
          border: '3px solid rgba(209,250,229,0.9)',
          borderTopColor: 'var(--sl-primary, #2abb98)',
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
    const isCircular = typeof className === 'string' && /avatar|avatar-img|condo-logo|sidebar-condo-logo|user-menu-avatar/.test(className);
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
          borderRadius: isCircular ? '50%' : 8,
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
