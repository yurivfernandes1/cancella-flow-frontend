import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { condominioAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [firstAccess, setFirstAccess]     = useState(false);
  const [condominioData, setCondominioData] = useState(null);
  // URL exibida no ProtectedImage — pode ter ?t= para forçar re-fetch após upload
  const [condominioLogoUrl, setCondominioLogoUrl] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  /** Aplica o objeto do condomínio no contexto.
   *  bustImg=true → adiciona timestamp à logo para forçar o ProtectedImage a re-buscar */
  const _applyCondominioData = (data, bustImg = false) => {
    setCondominioData(data);
    const url = data?.logo_url || null;
    setCondominioLogoUrl(bustImg && url ? `${url}?t=${Date.now()}` : url);
  };

  /** Busca perfil do condomínio em paralelo ao perfil do usuário (não bloqueia loading) */
  const _fetchCondominioData = (condId) => {
    if (!condId) return;
    condominioAPI.get(condId)
      .then((res) => _applyCondominioData(res.data))
      .catch(() => {});
  };

  const fetchUserProfile = async (token) => {
    try {
      const response = await api.get('/access/profile/', {
        headers: { Authorization: `Token ${token}` },
      });
      const userData = response.data;
      setUser(userData);
      setFirstAccess(userData.first_access);
      // Carrega dados do condomínio em background (não bloqueia a UI)
      _fetchCondominioData(userData.condominio_id);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) await fetchUserProfile(token);
  };

  /** Ré-busca os dados do condomínio e atualiza o contexto.
   *  Use após salvar nome/telefone ou fazer upload de logo. */
  const refreshCondominioData = (condId) => {
    const id = condId || user?.condominio_id;
    if (!id) return;
    condominioAPI.get(id)
      .then((res) => _applyCondominioData(res.data, true))
      .catch(() => {});
  };

  const login = async (token) => {
    localStorage.setItem('token', token);
    await fetchUserProfile(token);
  };

  const logout = () => {
    setUser(null);
    setCondominioData(null);
    setCondominioLogoUrl(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        firstAccess,
        refreshUser,
        condominioData,
        condominioLogoUrl,
        refreshCondominioData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
