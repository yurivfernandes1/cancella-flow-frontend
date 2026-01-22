import axios from 'axios';

// Use Vite environment variable when available, fallback para localhost
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Lista de rotas que não precisam de token
const publicRoutes = [
  'access/login/',
  'access/signup/',
  'docs/', // Adicionar rota da documentação como pública
];

api.interceptors.request.use(config => {
  const isPublicRoute = publicRoutes.some(route => config.url.includes(route));
  
  if (!isPublicRoute) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
  }
  
  // Se for FormData, remover Content-Type para o navegador definir automaticamente com boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Interceptor para tratamento de erros
// Interceptor para tratamento de erros: normaliza erros de rede
api.interceptors.response.use(
  response => response,
  error => {
    // Erro de rede (sem resposta do servidor)
    if (error.request && !error.response) {
      error.userMessage = 'Erro ao conectar com o servidor. Tente novamente mais tarde.';
    }

    // Propaga o erro, com userMessage disponível para UI
    return Promise.reject(error);
  }
);

// Funções específicas para Condomínios
export const condominioAPI = {
  // Listar condomínios
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/condominios/${queryParams ? `?${queryParams}` : ''}`);
  },
  
  // Criar condomínio
  create: (data) => api.post('/cadastros/condominios/create/', data),
  
  // Obter detalhes de um condomínio
  get: (id) => api.get(`/cadastros/condominios/${id}/`),
  
  // Atualizar condomínio
  update: (id, data) => api.put(`/cadastros/condominios/${id}/update/`, data),
  
  // Atualização parcial
  patch: (id, data) => api.patch(`/cadastros/condominios/${id}/update/`, data),
  
  // Excluir condomínio
  delete: (id) => api.delete(`/cadastros/condominios/${id}/delete/`),
  
  // Buscar opções para selects (sem paginação)
  options: () => api.get('/cadastros/condominios/options/')
};

// Funções específicas para Encomendas
export const encomendaAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/encomendas/${queryParams ? `?${queryParams}` : ''}`);
  },
  badge: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/encomendas/badge/${queryParams ? `?${queryParams}` : ''}`);
  },
  create: (data) => api.post('/cadastros/encomendas/create/', data),
  get: (id) => api.get(`/cadastros/encomendas/${id}/`),
  update: (id, data) => api.put(`/cadastros/encomendas/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/encomendas/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/encomendas/${id}/delete/`)
};

// Funções específicas para Visitantes
export const visitanteAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/visitantes/${queryParams ? `?${queryParams}` : ''}`);
  },
  create: (data) => api.post('/cadastros/visitantes/create/', data),
  get: (id) => api.get(`/cadastros/visitantes/${id}/`),
  update: (id, data) => api.put(`/cadastros/visitantes/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/visitantes/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/visitantes/${id}/delete/`)
};

// Funções específicas para Avisos
export const avisoAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/avisos/${queryParams ? `?${queryParams}` : ''}`);
  },
  home: () => api.get('/cadastros/avisos/home/'),
  create: (data) => api.post('/cadastros/avisos/create/', data),
  get: (id) => api.get(`/cadastros/avisos/${id}/`),
  update: (id, data) => api.put(`/cadastros/avisos/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/avisos/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/avisos/${id}/delete/`),
  groupsOptions: () => api.get('/cadastros/avisos/grupos/options/')
};

// Funções específicas para Espaços
export const espacoAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/espacos/${queryParams ? `?${queryParams}` : ''}`);
  },
  create: (data) => api.post('/cadastros/espacos/create/', data),
  get: (id) => api.get(`/cadastros/espacos/${id}/`),
  update: (id, data) => api.put(`/cadastros/espacos/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/espacos/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/espacos/${id}/delete/`)
};

// Funções específicas para Inventário de Espaços
export const espacoInventarioAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/espacos/inventario/${queryParams ? `?${queryParams}` : ''}`);
  },
  create: (data) => api.post('/cadastros/espacos/inventario/create/', data),
  get: (id) => api.get(`/cadastros/espacos/inventario/${id}/`),
  update: (id, data) => api.put(`/cadastros/espacos/inventario/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/espacos/inventario/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/espacos/inventario/${id}/delete/`)
};

// Funções específicas para Reservas de Espaços
export const espacoReservaAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/espacos/reservas/${queryParams ? `?${queryParams}` : ''}`);
  },
  hoje: () => api.get('/cadastros/espacos/reservas/hoje/'),
  disponibilidade: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/espacos/reservas/disponibilidade/${queryParams ? `?${queryParams}` : ''}`);
  },
  create: (data) => api.post('/cadastros/espacos/reservas/create/', data),
  get: (id) => api.get(`/cadastros/espacos/reservas/${id}/`),
  update: (id, data) => api.put(`/cadastros/espacos/reservas/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/espacos/reservas/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/espacos/reservas/${id}/delete/`)
};

// API de Dashboard
export const dashboardAPI = {
  moradorStats: () => api.get('/cadastros/dashboard/morador-stats/'),
  sindicoStats: () => api.get('/cadastros/dashboard/sindico-stats/')
};

// API de Eventos
export const eventoAPI = {
  list: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/cadastros/eventos/${queryParams ? `?${queryParams}` : ''}`);
  },
  create: (data) => api.post('/cadastros/eventos/create/', data),
  get: (id) => api.get(`/cadastros/eventos/${id}/`),
  update: (id, data) => api.put(`/cadastros/eventos/${id}/update/`, data),
  patch: (id, data) => api.patch(`/cadastros/eventos/${id}/update/`, data),
  delete: (id) => api.delete(`/cadastros/eventos/${id}/delete/`)
};

export default api;
