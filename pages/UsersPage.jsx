import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import GenericTable from '../components/GenericTable';
import AddAvisoDropdown from '../components/Avisos/AddAvisoDropdown';
import EditAvisoModal from '../components/Avisos/EditAvisoModal';
import AddUserDropdown from '../components/Users/AddUserDropdown';
import AddProfileDropdown from '../components/Users/AddProfileDropdown';
import AddTeamDropdown from '../components/Users/AddTeamDropdown';
import AddGroupDropdown from '../components/Users/AddGroupDropdown';
import AddCondominioDropdown from '../components/Users/AddCondominioDropdown';
import AddUnidadeModal from '../components/Unidades/AddUnidadeModal';
import AddEspacoModal from '../components/Espacos/AddEspacoModal';
import EditEspacoModal from '../components/Espacos/EditEspacoModal';
import EventoModal from '../components/Eventos/EventoModal';
import { useAuth } from '../context/AuthContext';
import api, { condominioAPI, avisoAPI, espacoAPI, espacoReservaAPI, eventoAPI } from '../services/api';
import ProtectedImage from '../components/common/ProtectedImage';
import '../styles/UsersPage.css';
import { FaUserPlus, FaSearch, FaPlus, FaKey, FaEdit, FaCheck, FaTimes, FaBan } from 'react-icons/fa';
import PasswordResetModal from '../components/Users/PasswordResetModal';
import { generateStrongPassword } from '../utils/passwordGenerator';
import Select from 'react-select';
import { validateCPF, validateCNPJ, validatePhone, validateCEP, formatCEP, fetchCEPData } from '../utils/validators';
import { formatTelefone, formatCPF } from '../utils/formatters';

// Normaliza diferentes formatos de status retornados pela API
const getBooleanStatus = (row) => {
  if (!row) return false;
  const candidates = [
    row.is_active,
    row.is_ativo,
    row.isAtivo,
    row.ativo,
    row.status,
    row.esta_no_condominio,
    row.active,
  ];

  for (const v of candidates) {
    if (v === true) return true;
    if (v === false) return false;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (['true', '1', 'sim', 's', 'yes', 'y'].includes(s)) return true;
      if (['false', '0', 'não', 'nao', 'n', 'no', 'false'].includes(s)) return false;
      // se for palavra não reconhecida, continue para próximos candidatos
    }
  }

  return false;
};

const tabs = [
  { id: 'condominios', label: 'Condomínios', requiresAdmin: true },
  { id: 'sindicos', label: 'Síndicos', requiresAdmin: true },
  { id: 'grupos', label: 'Grupos', requiresAdmin: true },
  { id: 'unidades', label: 'Unidades', requiresSindico: true },
  { id: 'espacos', label: 'Espaços', requiresSindico: true },
  { id: 'reservas', label: 'Reservas', requiresSindico: true },
  { id: 'eventos', label: 'Eventos', requiresSindico: true },
  { id: 'avisos', label: 'Avisos', requiresSindico: true },
  { id: 'portaria', label: 'Portaria', requiresSindico: true },
  { id: 'moradores', label: 'Moradores', requiresSindico: true }
];

function UsersPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const getDefaultTab = () => {
    if (searchParams.get('tab')) return searchParams.get('tab');
    if (user?.is_staff || user?.groups?.some(group => group.name === 'admin')) return 'condominios';
    if (user?.groups?.some(group => group.name === 'Síndicos')) return 'unidades';
    return 'portaria';
  };
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [tableData, setTableData] = useState({
    condominios: [],
    sindicos: [],
    grupos: [],
    unidades: [],
    espacos: [],
    reservas: [],
    eventos: [],
    moradores: [],
    portaria: [],
    avisos: []
  });
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState({
    condominios: 1,
    sindicos: 1,
    grupos: 1,
    unidades: 1,
    espacos: 1,
    reservas: 1,
    eventos: 1,
    moradores: 1,
    portaria: 1,
    avisos: 1
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddUser, setShowAddUser] = useState(false);
  const addUserButtonRef = useRef(null); // Adicionando uma ref para o botão de adicionar usuário
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false); // Adicionado para completude
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddCondominio, setShowAddCondominio] = useState(false);
  const [showAddUnidade, setShowAddUnidade] = useState(false);
  const addTeamButtonRef = useRef(null);
  const addProfileButtonRef = useRef(null);
  const addGroupButtonRef = useRef(null);
  const addCondominioButtonRef = useRef(null);
  const addUnidadeButtonRef = useRef(null);
  const addAvisoButtonRef = useRef(null);
  const [showAddAviso, setShowAddAviso] = useState(false);
  const [editingAviso, setEditingAviso] = useState(null);
  const [showAddEspaco, setShowAddEspaco] = useState(false);
  const [editingEspaco, setEditingEspaco] = useState(null);
  const [showEventoModal, setShowEventoModal] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resetPassword, setResetPassword] = useState({ show: false, password: '', userId: null });
  const [profiles, setProfiles] = useState([]);
  const [editingRowId, setEditingRowId] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [unidades, setUnidades] = useState([]);
  const [unidadesLoaded, setUnidadesLoaded] = useState(false);
  const [espacosDisponiveis, setEspacosDisponiveis] = useState([]);
  const [espacosLoaded, setEspacosLoaded] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewEdit, setLogoPreviewEdit] = useState(null);

  // Verificar se o usuário tem acesso a pelo menos uma aba
  const hasAccess = user?.is_staff || 
                   user?.groups?.some(group => ['admin', 'Síndicos'].includes(group.name));

  if (!hasAccess) {
    return <Navigate to="/welcome" replace />;
  }

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const profilesRes = await api.get('/access/profiles/');
        if (profilesRes.data.results !== undefined) {
          setProfiles(profilesRes.data.results);
        } else {
          setProfiles(profilesRes.data);
        }
      } catch (error) {
        console.error('Erro ao carregar perfis:', error);
        setProfiles([]);
      }
    };

    loadProfiles();
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await api.get('/access/teams/');
        console.log('Dados de equipes carregados na UsersPage:', response.data);
        
        if (response.data.results) {
          setTeams(response.data.results);
        } else {
          setTeams(response.data);
        }
        setTeamsLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar equipes:', error);
        setTeams([]);
        setTeamsLoaded(true);
      }
    };

    loadTeams();
  }, []);

  useEffect(() => {
    const loadUnidades = async () => {
      try {
        const response = await api.get('/cadastros/unidades/?page_size=1000');
        const unidadesList = response.data.results || response.data || [];
        setUnidades(unidadesList);
        setUnidadesLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar unidades:', error);
        setUnidades([]);
        setUnidadesLoaded(true);
      }
    };

    loadUnidades();
  }, []);

  useEffect(() => {
    const loadEspacos = async () => {
      try {
        console.log('[UsersPage] Carregando espaços...');
        const response = await espacoAPI.list({ page_size: 1000 });
        console.log('[UsersPage] Resposta da API de espaços:', response.data);
        const espacosList = response.data.results || response.data || [];
        console.log('[UsersPage] Espaços carregados:', espacosList);
        // Não filtrar para não perder dados se is_active não vier
        setEspacosDisponiveis(espacosList);
        setEspacosLoaded(true);
      } catch (error) {
        console.error('Erro ao carregar espaços:', error);
        setEspacosDisponiveis([]);
        setEspacosLoaded(true);
      }
    };

    loadEspacos();
  }, []);

  const fetchData = async (type, page = 1, search = '') => {
    setLoading(true);
    try {
      switch (type) {
        case 'condominios':
          // Buscar condomínios
          const responseCondominios = await condominioAPI.list({ page, search });
          if (responseCondominios.data.results !== undefined) {
            setTableData(prev => ({ ...prev, condominios: responseCondominios.data.results }));
            setTotalPages(prev => ({
              ...prev,
              condominios: responseCondominios.data.num_pages || Math.ceil(responseCondominios.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, condominios: responseCondominios.data }));
            setTotalPages(prev => ({ ...prev, condominios: 1 }));
          }
          break;
        case 'sindicos':
          // Buscar usuários do tipo síndico
          const responseSindicos = await api.get(`/access/users/?page=${page}&search=${search}&type=sindicos`);
          if (responseSindicos.data.results !== undefined) {
            setTableData(prev => ({ ...prev, sindicos: responseSindicos.data.results }));
            setTotalPages(prev => ({
              ...prev,
              sindicos: responseSindicos.data.num_pages || Math.ceil(responseSindicos.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, sindicos: responseSindicos.data }));
            setTotalPages(prev => ({ ...prev, sindicos: 1 }));
          }
          break;
        case 'grupos':
          // Buscar grupos
          const responseGrupos = await api.get(`/access/groups/?page=${page}&search=${search}`);
          if (responseGrupos.data.results !== undefined) {
            setTableData(prev => ({ ...prev, grupos: responseGrupos.data.results }));
            setTotalPages(prev => ({
              ...prev,
              grupos: responseGrupos.data.num_pages || Math.ceil(responseGrupos.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, grupos: responseGrupos.data }));
            setTotalPages(prev => ({ ...prev, grupos: 1 }));
          }
          break;
        case 'unidades':
          // Buscar unidades
          const responseUnidades = await api.get(`/cadastros/unidades/?page=${page}&search=${search}`);
          if (responseUnidades.data.results !== undefined) {
            setTableData(prev => ({ ...prev, unidades: responseUnidades.data.results }));
            setTotalPages(prev => ({
              ...prev,
              unidades: responseUnidades.data.num_pages || Math.ceil(responseUnidades.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, unidades: responseUnidades.data }));
            setTotalPages(prev => ({ ...prev, unidades: 1 }));
          }
          break;
        case 'moradores':
          // Buscar moradores como usuários (mesmos campos de síndico/funcionário)
          const responseMoradores = await api.get(`/access/users/?page=${page}&search=${search}&type=moradores`);
          if (responseMoradores.data.results !== undefined) {
            setTableData(prev => ({ ...prev, moradores: responseMoradores.data.results }));
            setTotalPages(prev => ({
              ...prev,
              moradores: responseMoradores.data.num_pages || Math.ceil(responseMoradores.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, moradores: responseMoradores.data }));
            setTotalPages(prev => ({ ...prev, moradores: 1 }));
          }
          break;
        case 'portaria':
          // Buscar usuários de Portaria
          const responsePortaria = await api.get(`/access/users/?page=${page}&search=${search}&type=portaria`);
          if (responsePortaria.data.results !== undefined) {
            setTableData(prev => ({ ...prev, portaria: responsePortaria.data.results }));
            setTotalPages(prev => ({
              ...prev,
              portaria: responsePortaria.data.num_pages || Math.ceil(responsePortaria.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, portaria: responsePortaria.data }));
            setTotalPages(prev => ({ ...prev, portaria: 1 }));
          }
          break;
        case 'avisos':
          // Buscar avisos (todos visíveis ao usuário)
          const responseAvisos = await avisoAPI.list({ page, search });
          if (responseAvisos.data.results !== undefined) {
            setTableData(prev => ({ ...prev, avisos: responseAvisos.data.results }));
            setTotalPages(prev => ({
              ...prev,
              avisos: responseAvisos.data.num_pages || Math.ceil(responseAvisos.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, avisos: responseAvisos.data }));
            setTotalPages(prev => ({ ...prev, avisos: 1 }));
          }
          break;
        case 'eventos':
          // Buscar eventos
          const responseEventos = await api.get(`/cadastros/eventos/?page=${page}&search=${search}`);
          const eventosData = responseEventos.data.results !== undefined
            ? responseEventos.data.results
            : responseEventos.data;

          const eventosNormalizados = Array.isArray(eventosData)
            ? eventosData.map(ev => ({
                ...ev,
                espaco: ev.espaco_id ?? ev.espaco ?? null,
                espaco_nome: ev.espaco_nome ?? ev.espaco_nome,
                // Backend não retorna local_texto; preencher com local_completo quando não houver espaço
                local_texto: ev.local_texto ?? ev.local_completo ?? '',
              }))
            : [];

          setTableData(prev => ({ ...prev, eventos: eventosNormalizados }));
          setTotalPages(prev => ({
            ...prev,
            eventos: responseEventos.data.num_pages || Math.ceil((responseEventos.data.count || eventosNormalizados.length || 1) / 10)
          }));
          break;
        case 'espacos':
          // Buscar espaços
          const responseEspacos = await espacoAPI.list({ page, search });
          if (responseEspacos.data.results !== undefined) {
            setTableData(prev => ({ ...prev, espacos: responseEspacos.data.results }));
            setTotalPages(prev => ({
              ...prev,
              espacos: responseEspacos.data.num_pages || Math.ceil(responseEspacos.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, espacos: responseEspacos.data }));
            setTotalPages(prev => ({ ...prev, espacos: 1 }));
          }
          break;
        case 'reservas':
          // Buscar todas as reservas (síndico vê todas)
          const responseReservas = await espacoReservaAPI.list({ page, search });
          if (responseReservas.data.results !== undefined) {
            setTableData(prev => ({ ...prev, reservas: responseReservas.data.results }));
            setTotalPages(prev => ({
              ...prev,
              reservas: responseReservas.data.num_pages || Math.ceil(responseReservas.data.count / 10)
            }));
          } else {
            setTableData(prev => ({ ...prev, reservas: responseReservas.data }));
            setTotalPages(prev => ({ ...prev, reservas: 1 }));
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setTableData(prev => ({ ...prev, [type]: [] }));
      setTotalPages(prev => ({ ...prev, [type]: 1 }));
    } finally {
      setLoading(false);
    }
  };

  // Carregar condominios quando necessário para o select de síndicos
  useEffect(() => {
    const loadCondominios = async () => {
      if (activeTab === 'sindicos' && tableData.condominios.length === 0) {
        try {
          const response = await condominioAPI.list({});
          const condominios = response.data.results || response.data || [];
          setTableData(prev => ({ ...prev, condominios }));
        } catch (error) {
          console.error('Erro ao carregar condomínios:', error);
        }
      }
    };
    loadCondominios();
  }, [activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData(activeTab, currentPage, searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [activeTab, currentPage, searchTerm]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setCurrentPage(1);
  };

  const handleSuccess = (type) => {
    fetchData(type, currentPage);
  };

  const handleResetPassword = async (userId) => {
    try {
      const newPassword = generateStrongPassword();
      await api.patch(`/access/profile/${userId}/`, {
        password: newPassword
      });

      setResetPassword({ show: true, password: newPassword, userId: userId });
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      alert('Erro ao resetar senha');
    }
  };

  const handleSave = async (id, data) => {
    try {
      console.log("=== DEBUG SAVE ===");
      console.log("Active Tab:", activeTab);
      console.log("Row ID:", id);
      console.log("Data to save:", data);
      
      if (activeTab === 'condominios') {
        console.log("Calling condominioAPI.patch with:", { id, data });
        
        // Se houver arquivo de logo, atualizamos os campos via PATCH (sem arquivo)
        // e depois enviamos o arquivo para o endpoint DB (/logo-db/upload/)
        if (logoFile) {
          const condominioData = {
            ...data,
            cep: data.cep ? data.cep.replace(/\D/g, '') : '',
            is_ativo: Boolean(data.is_ativo)
          };

          // Atualiza dados sem o arquivo para não gravar no FileField
          await condominioAPI.patch(id, condominioData);

          // Agora envia só o arquivo para o endpoint DB
          const uploadForm = new FormData();
          uploadForm.append('logo', logoFile);

          // Usamos a instância 'api' direta para enviar ao caminho customizado
          await api.post(`/cadastros/condominios/${id}/logo-db/upload/`, uploadForm);

          // Limpar states de logo após salvar
          setLogoFile(null);
          setLogoPreviewEdit(null);
        } else {
          // Sem arquivo de logo, enviar JSON normal
          const condominioData = {
            ...data,
            cep: data.cep ? data.cep.replace(/\D/g, '') : '',
            is_ativo: Boolean(data.is_ativo)
          };
          const response = await condominioAPI.patch(id, condominioData);
          console.log("Response from API:", response);
        }
      } else if (activeTab === 'sindicos') {
        // Validar CPF e telefone (opcionais, mas se preenchidos, precisam ser válidos)
        const cpfDigitsS = (data.cpf || '').replace(/\D/g, '');
        const phoneDigitsS = (data.phone || '').replace(/\D/g, '');
        // CPF obrigatório e válido
        if (!cpfDigitsS) {
          alert('CPF é obrigatório.');
          return;
        }
        if (!validateCPF(cpfDigitsS)) {
          alert('CPF inválido.');
          return;
        }
        if (phoneDigitsS && !validatePhone(phoneDigitsS)) {
          alert('Telefone inválido.');
          return;
        }
        const payload = {
          full_name: data.full_name,
          is_active: data.is_active,
          email: data.email,
          cpf: cpfDigitsS,
          phone: phoneDigitsS,
          condominio_id: data.condominio_id,
          is_morador: Boolean(data.is_morador)
        };
        console.log("Calling api.patch for sindicos with:", payload);
        const response = await api.patch(`/access/profile/${id}/`, payload);
        console.log("Response from API:", response);
      } else if (activeTab === 'portaria') {
        const cpfDigitsP = (data.cpf || '').replace(/\D/g, '');
        const phoneDigitsP = (data.phone || '').replace(/\D/g, '');
        if (!cpfDigitsP) {
          alert('CPF é obrigatório.');
          return;
        }
        if (!validateCPF(cpfDigitsP)) {
          alert('CPF inválido.');
          return;
        }
        if (phoneDigitsP && !validatePhone(phoneDigitsP)) {
          alert('Telefone inválido.');
          return;
        }
        await api.patch(`/access/profile/${id}/`, {
          full_name: data.full_name,
          is_active: data.is_active,
          email: data.email,
          cpf: cpfDigitsP,
          phone: phoneDigitsP
        });
      } else if (activeTab === 'grupos') {
        await api.patch(`/access/groups/${id}/`, {
          nome: data.nome
        });
      } else if (activeTab === 'moradores') {
        const cpfDigitsM = (data.cpf || '').replace(/\D/g, '');
        const phoneDigitsM = (data.phone || '').replace(/\D/g, '');
        if (!cpfDigitsM) {
          alert('CPF é obrigatório.');
          return;
        }
        if (!validateCPF(cpfDigitsM)) {
          alert('CPF inválido.');
          return;
        }
        if (phoneDigitsM && !validatePhone(phoneDigitsM)) {
          alert('Telefone inválido.');
          return;
        }
        await api.patch(`/access/profile/${id}/`, {
          full_name: data.full_name,
          is_active: data.is_active,
          email: data.email,
          cpf: cpfDigitsM,
          phone: phoneDigitsM,
          unidade_id: data.unidade_id || null
        });
      } else if (activeTab === 'unidades') {
        // Salvar unidade (número, bloco e status)
        const payload = {
          numero: data.numero,
          bloco: data.bloco || '',
          is_active: ('is_active' in data) ? Boolean(data.is_active) : getBooleanStatus(data)
        };
        await api.patch(`/cadastros/unidades/${id}/update/`, payload);
      }

      fetchData(activeTab, currentPage, searchTerm);
      setEditingRowId(null); // Cancelar edição após salvar com sucesso
    } catch (error) {
      console.error(`Erro ao atualizar ${activeTab}:`, error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Ocorreu um erro ao salvar os dados';
      alert(`Erro ao salvar: ${errorMessage}`);
    }
  };

  const handleEditRow = (rowId) => {
    setEditingRowId(rowId);
    // Limpar logo preview ao iniciar edição de nova linha
    setLogoFile(null);
    setLogoPreviewEdit(null);
  };

  const handleLogoChangeEdit = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreviewEdit(null);
      return;
    }

    // Validar tipo de arquivo
    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Formato inválido! Use PNG, JPG, JPEG ou SVG.');
      e.target.value = '';
      return;
    }

    // Validar tamanho do arquivo (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 2MB.');
      e.target.value = '';
      return;
    }

    // Para SVG, não precisamos validar dimensões
    if (file.type === 'image/svg+xml') {
      setLogoFile(file);
      setLogoPreviewEdit(URL.createObjectURL(file));
      return;
    }

    // Validar dimensões da imagem
    const img = new Image();
    img.onload = () => {
      if (img.width !== img.height) {
        alert('A imagem deve ser quadrada!');
        e.target.value = '';
        return;
      }

      if (img.width > 250 || img.height > 250) {
        alert('A imagem deve ter no máximo 250x250px!');
        e.target.value = '';
        return;
      }

      setLogoFile(file);
      setLogoPreviewEdit(URL.createObjectURL(file));
    };

    img.onerror = () => {
      alert('Erro ao carregar imagem!');
      e.target.value = '';
    };

    img.src = URL.createObjectURL(file);
  };

  const handleRemoveLogoEdit = () => {
    setLogoFile(null);
    setLogoPreviewEdit(null);
    const fileInput = document.getElementById('logo-upload-edit');
    if (fileInput) fileInput.value = '';
  };

  const handleInactivateUnidade = async (id) => {
    try {
      const unidade = tableData.unidades.find(u => u.id === id);
      const action = unidade.is_active ? 'inativar' : 'ativar';
      
      if (confirm(`Deseja realmente ${action} esta unidade?`)) {
        await api.patch(`/cadastros/unidades/${id}/inactivate/`);
        fetchData('unidades', currentPage, searchTerm);
      }
    } catch (error) {
      console.error('Erro ao alterar status da unidade:', error);
      alert('Erro ao alterar status da unidade');
    }
  };

  const handleDeleteEvento = async (id) => {
    if (!confirm('Deseja realmente excluir este evento?')) {
      return;
    }

    try {
      // endpoint correto para exclusão segue o padrão '/delete/'
      await api.delete(`/cadastros/eventos/${id}/delete/`);
      fetchData('eventos', currentPage, searchTerm);
      alert('Evento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erro ao excluir evento';
      alert(`Erro: ${errorMessage}`);
    }
  };

  // Guardar o estado atual dos dados sendo editados na linha
  const [currentEditData, setCurrentEditData] = useState({});
  const [editValidation, setEditValidation] = useState({ cpf: null, phone: null, cep: null });
  const [cepAddressData, setCepAddressData] = useState(null);
  const [loadingCepEdit, setLoadingCepEdit] = useState(false);

  useEffect(() => {
    // Resetar validações ao mudar a linha ou a aba
    setEditValidation({ cpf: null, phone: null, cep: null });
    setCepAddressData(null);
    setLoadingCepEdit(false);
  }, [editingRowId, activeTab]);

  const sindicosColumns = [
    {
      key: 'full_name',
      header: 'Nome',
      width: '16%',
      editable: true
    },
    {
      key: 'username',
      header: 'Usuário',
      width: '11%'
    },
    {
      key: 'email',
      header: 'E-mail',
      width: '15%',
      editable: true
    },
    {
      key: 'cpf',
      header: 'CPF',
      width: '12%',
      editable: true,
      render: (value, row) => {
        const rawCpf = value || row.cpf_value || row.cpf_number || '';
        if (!rawCpf) return '-';
        const cpf = String(rawCpf).replace(/\D/g, '');
        return cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : rawCpf;
      },
      editComponent: (editData, handleInputChange) => {
        const valueDigits = String(editData.cpf || '').replace(/\D/g, '').slice(0, 11);
        const isValid = !valueDigits ? null : validateCPF(valueDigits);
        return (
          <input
            className={`edit-input ${isValid === false ? 'input-error' : ''} ${isValid === true ? 'input-valid' : ''}`}
            type="text"
            value={formatCPF(valueDigits)}
            onChange={(e) => {
              const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
              setEditValidation(prev => ({ ...prev, cpf: !digits ? null : validateCPF(digits) }));
              handleInputChange('cpf', digits);
            }}
            placeholder="Somente números"
          />
        );
      }
    },
    {
      key: 'phone',
      header: 'Telefone',
      width: '12%',
      editable: true,
      render: (value, row) => {
        const rawPhone = value || row.telefone || '';
        if (!rawPhone) return '-';
        return formatTelefone(String(rawPhone));
      },
      editComponent: (editData, handleInputChange) => {
        const valueDigits = String(editData.phone || '').replace(/\D/g, '').slice(0, 11);
        const isValid = !valueDigits ? null : validatePhone(valueDigits);
        return (
          <input
            className={`edit-input ${isValid === false ? 'input-error' : ''} ${isValid === true ? 'input-valid' : ''}`}
            type="text"
            value={formatTelefone(valueDigits)}
            onChange={(e) => {
              const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
              setEditValidation(prev => ({ ...prev, phone: !digits ? null : validatePhone(digits) }));
              handleInputChange('phone', digits);
            }}
            placeholder="Somente números"
          />
        );
      }
    },
    {
      key: 'condominio_id',
      header: 'Condomínio',
      width: '15%',
      editable: true,
      render: (_value, row) => {
        return row.condominio_nome || (row.condominio && (row.condominio.nome || row.condominio.name)) || '-';
      },
      editComponent: (editData, handleInputChange) => (
        <Select
          className="edit-select"
          classNamePrefix="select"
          options={(tableData?.condominios || []).map(c => ({ value: c.id, label: c.nome }))}
          value={(tableData?.condominios || []).map(c => ({ value: c.id, label: c.nome })).find(opt => opt.value === editData.condominio_id) || null}
          onChange={(opt) => handleInputChange('condominio_id', opt ? opt.value : null)}
          placeholder="Selecione um condomínio"
          isClearable
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          styles={{
            container: (base) => ({ ...base, width: '100%' }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            control: (base, state) => ({
              ...base,
              minHeight: 36,
              borderColor: state.isFocused ? '#2abb98' : '#cbd5e1',
              boxShadow: state.isFocused ? '0 0 0 2px rgba(42, 187, 152, 0.15)' : 'none',
            }),
            valueContainer: (base) => ({ ...base, padding: '2px 8px' }),
            placeholder: (base) => ({ ...base, color: '#94a3b8' }),
          }}
        />
      )
    },
    {
      key: 'is_morador',
      header: 'É Morador',
      width: '7%',
      editable: true,
      render: (_value, row) => {
        const isMorador = row.groups?.some(g => g.name === 'Moradores') || false;
        return (
          <span className={isMorador ? 'status-active' : 'status-inactive'}>
            {isMorador ? 'Sim' : 'Não'}
          </span>
        );
      },
      editComponent: (editData, handleInputChange) => {
        // Verificar se o usuário tem o grupo Moradores
        // Priorizar editData.is_morador se já foi modificado, senão verificar grupos
        let isMorador = false;
        if ('is_morador' in editData) {
          isMorador = Boolean(editData.is_morador);
        } else if (editData.groups) {
          isMorador = editData.groups.some(g => g.name === 'Moradores');
        }
        
        return (
          <input
            type="checkbox"
            checked={isMorador}
            onChange={(e) => handleInputChange('is_morador', e.target.checked)}
            className="status-checkbox"
          />
        );
      }
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '6%',
      editable: true,
      render: (_value, row) => {
        const isActive = getBooleanStatus(row);
        return (
          <span className={isActive ? 'status-active' : 'status-inactive'}>
            {isActive ? 'Ativo' : 'Inativo'}
          </span>
        );
      },
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_active)}
          onChange={(e) => handleInputChange('is_active', !!e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '8%',
      render: (_value, row) => {
        if (user && !user.is_staff && (row.is_staff || row.is_gestor)) {
          return null;
        }

        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Salvar com os dados editados atuais
                    handleSave(row.id, currentEditData && currentEditData.id === row.id ? currentEditData : row);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Inicializar is_morador baseado nos grupos do usuário
                    const isMorador = row.groups?.some(g => g.name === 'Moradores') || false;
                    setCurrentEditData({ ...row, is_morador: isMorador });
                    handleEditRow(row.id);
                  }} 
                  title="Editar síndico"
                >
                  <FaEdit />
                </button>
                <button
                  className="reset-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPassword(row.id);
                  }}
                  title="Resetar senha"
                >
                  <FaKey />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const gruposColumns = [
    {
      key: 'nome',
      header: 'Nome do Grupo',
      width: '50%',
      editable: true
    },
    {
      key: 'users_count',
      header: 'Usuários',
      width: '42%',
      render: (value) => `${value || 0} usuário(s)`
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '8%',
      render: (row) => {
        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // garantir que os dados editados sejam passados para salvar
                    handleSave(row.id, currentEditData && currentEditData.id === row.id ? currentEditData : row);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <button
                className="edit-button" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditRow(row.id);
                }} 
                title="Editar grupo"
              >
                <FaEdit />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  const unidadesColumns = [
    {
      key: 'numero',
      header: 'Número',
      width: '15%',
      editable: true
    },
    {
      key: 'bloco',
      header: 'Bloco',
      width: '15%',
      editable: true
    },
    {
      key: 'identificacao_completa',
      header: 'Identificação',
      width: '30%'
    },
    {
      key: 'created_on',
      header: 'Criado em',
      width: '12%',
      render: (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '-'
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '8%',
      editable: true,
      render: (value, row) => (
        <span className={`status-badge ${getBooleanStatus(row) ? 'active' : 'inactive'}`}>
          {getBooleanStatus(row) ? 'Ativo' : 'Inativo'}
        </span>
      ),
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_active)}
          onChange={(e) => handleInputChange('is_active', !!e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '8%',
      render: (row) => {
        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(row.id, currentEditData && currentEditData.id === row.id ? currentEditData : row);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                    setCurrentEditData({});
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentEditData({ ...row });
                    handleEditRow(row.id);
                  }}
                  title="Editar unidade"
                >
                  <FaEdit />
                </button>
                <button
                  className="inactivate-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInactivateUnidade(row.id);
                  }}
                  title={row.is_active ? "Inativar unidade" : "Ativar unidade"}
                  style={{ fontSize: '14px' }}
                >
                  <FaBan />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const moradoresColumns = [
    {
      key: 'full_name',
      header: 'Nome',
      width: '16%',
      editable: true
    },
    {
      key: 'username',
      header: 'Usuário',
      width: '11%'
    },
    {
      key: 'email',
      header: 'E-mail',
      width: '16%',
      editable: true
    },
    {
      key: 'cpf',
      header: 'CPF',
      width: '10%',
      editable: true,
      render: (value, row) => {
        const rawCpf = value || row.cpf_value || row.cpf_number || '';
        if (!rawCpf) return '-';
        const cpf = String(rawCpf).replace(/\D/g, '');
        return cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : rawCpf;
      },
      editComponent: (editData, handleInputChange) => {
        const valueDigits = String(editData.cpf || '').replace(/\D/g, '').slice(0, 11);
        const isValid = !valueDigits ? null : validateCPF(valueDigits);
        return (
          <input
            className={`edit-input ${isValid === false ? 'input-error' : ''} ${isValid === true ? 'input-valid' : ''}`}
            type="text"
            value={formatCPF(valueDigits)}
            onChange={(e) => {
              const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
              setEditValidation(prev => ({ ...prev, cpf: !digits ? null : validateCPF(digits) }));
              handleInputChange('cpf', digits);
            }}
            placeholder="Somente números"
          />
        );
      }
    },
    {
      key: 'phone',
      header: 'Telefone',
      width: '10%',
      editable: true,
      render: (value, row) => {
        const rawPhone = value || row.telefone || '';
        if (!rawPhone) return '-';
        return formatTelefone(String(rawPhone));
      },
      editComponent: (editData, handleInputChange) => {
        const valueDigits = String(editData.phone || '').replace(/\D/g, '').slice(0, 11);
        const isValid = !valueDigits ? null : validatePhone(valueDigits);
        return (
          <input
            className={`edit-input ${isValid === false ? 'input-error' : ''} ${isValid === true ? 'input-valid' : ''}`}
            type="text"
            value={formatTelefone(valueDigits)}
            onChange={(e) => {
              const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
              setEditValidation(prev => ({ ...prev, phone: !digits ? null : validatePhone(digits) }));
              handleInputChange('phone', digits);
            }}
            placeholder="Somente números"
          />
        );
      }
    },
    {
      key: 'unidade_identificacao',
      header: 'Unidade',
      width: '13%',
      editable: true,
      render: (value, row) => row?.unidade_identificacao || '-',
      editComponent: (editData, handleInputChange) => (
        <Select
          options={unidades.map(unidade => ({
            value: unidade.id,
            label: unidade.identificacao_completa
          }))}
          value={unidades.find(u => u.id === editData.unidade_id) ? {
            value: editData.unidade_id,
            label: unidades.find(u => u.id === editData.unidade_id).identificacao_completa
          } : null}
          onChange={(selectedOption) => handleInputChange('unidade_id', selectedOption?.value || null)}
          placeholder="Selecione"
          isClearable
          className="unidade-select-edit react-select-container"
          styles={{
            control: (base) => ({
              ...base,
              minHeight: '32px',
              height: '32px',
              fontSize: '0.875rem',
              minWidth: '200px',
              width: '100%'
            }),
            valueContainer: (base) => ({
              ...base,
              height: '32px',
              padding: '0 6px',
              overflow: 'visible'
            }),
            input: (base) => ({
              ...base,
              margin: '0px'
            }),
            indicatorsContainer: (base) => ({
              ...base,
              height: '32px'
            }),
            singleValue: (base) => ({
              ...base,
              overflow: 'visible',
              textOverflow: 'clip',
              whiteSpace: 'normal'
            }),
            menu: (base) => ({
              ...base,
              width: 'auto',
              minWidth: '250px',
              maxWidth: '400px'
            }),
            menuPortal: (base) => ({ 
              ...base, 
              zIndex: 300000 
            })
          }}
          classNamePrefix="react-select"
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          menuPosition="fixed"
        />
      )
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '6%',
      editable: true,
      render: (_value, row) => (
        <span className={getBooleanStatus(row) ? 'status-active' : 'status-inactive'}>
          {getBooleanStatus(row) ? 'Ativo' : 'Inativo'}
        </span>
      ),
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_active)}
          onChange={(e) => handleInputChange('is_active', !!e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '10%',
      render: (_value, row) => {
        if (user && !user.is_staff && (row.is_staff || row.is_gestor)) {
          return null;
        }

        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const dataToSave = currentEditData && currentEditData.id === row.id ? currentEditData : { ...row, unidade_id: row.unidade?.id || row.unidade_id };
                    handleSave(row.id, dataToSave);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentEditData({ ...row, unidade_id: row.unidade?.id || row.unidade_id || null });
                    handleEditRow(row.id);
                  }} 
                  title="Editar morador"
                >
                  <FaEdit />
                </button>
                <button
                  className="reset-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPassword(row.id);
                  }}
                  title="Resetar senha"
                >
                  <FaKey />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  // Colunas para funcionários (similar aos síndicos)
  const funcionariosColumns = [
    {
      key: 'full_name',
      header: 'Nome',
      width: '18%',
      editable: true
    },
    {
      key: 'username',
      header: 'Usuário',
      width: '13%'
    },
    {
      key: 'email',
      header: 'E-mail',
      width: '18%',
      editable: true
    },
    {
      key: 'cpf',
      header: 'CPF',
      width: '12%',
      editable: true,
      render: (value) => {
        if (!value) return '-';
        const cpf = String(value).replace(/\D/g, '');
        return cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value;
      },
      editComponent: (editData, handleInputChange) => {
        const valueDigits = String(editData.cpf || '').replace(/\D/g, '').slice(0, 11);
        const isValid = !valueDigits ? null : validateCPF(valueDigits);
        return (
          <input
            className={`edit-input ${isValid === false ? 'input-error' : ''} ${isValid === true ? 'input-valid' : ''}`}
            type="text"
            value={formatCPF(valueDigits)}
            onChange={(e) => {
              const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
              setEditValidation(prev => ({ ...prev, cpf: !digits ? null : validateCPF(digits) }));
              handleInputChange('cpf', digits);
            }}
            placeholder="Somente números"
          />
        );
      }
    },
    {
      key: 'phone',
      header: 'Telefone',
      width: '12%',
      editable: true,
      render: (value) => {
        if (!value) return '-';
        return formatTelefone(String(value));
      },
      editComponent: (editData, handleInputChange) => {
        const valueDigits = String(editData.phone || '').replace(/\D/g, '').slice(0, 11);
        const isValid = !valueDigits ? null : validatePhone(valueDigits);
        return (
          <input
            className={`edit-input ${isValid === false ? 'input-error' : ''} ${isValid === true ? 'input-valid' : ''}`}
            type="text"
            value={formatTelefone(valueDigits)}
            onChange={(e) => {
              const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 11);
              setEditValidation(prev => ({ ...prev, phone: !digits ? null : validatePhone(digits) }));
              handleInputChange('phone', digits);
            }}
            placeholder="Somente números"
          />
        );
      }
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '6%',
      editable: true,
      render: (_value, row) => (
        <span className={getBooleanStatus(row) ? 'status-active' : 'status-inactive'}>
          {getBooleanStatus(row) ? 'Ativo' : 'Inativo'}
        </span>
      ),
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_active)}
          onChange={(e) => handleInputChange('is_active', !!e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '10%',
      render: (_value, row) => {
        if (user && !user.is_staff && (row.is_staff || row.is_gestor)) {
          return null;
        }

        const isEditing = editingRowId === row.id;

        return (
          <div className="actions-column">
            {isEditing ? (
              <>
                <button
                  className="save-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // garantir que os dados editados sejam passados
                    handleSave(row.id, currentEditData && currentEditData.id === row.id ? currentEditData : row);
                  }}
                  title="Salvar alterações"
                >
                  <FaCheck />
                </button>
                <button
                  className="cancel-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRowId(null);
                  }}
                  title="Cancelar edição"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  className="edit-button" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRow(row.id);
                  }} 
                  title="Editar funcionário"
                >
                  <FaEdit />
                </button>
                <button
                  className="reset-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetPassword(row.id);
                  }}
                  title="Resetar senha"
                >
                  <FaKey />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  // Colunas para condomínios
  const condominiosColumns = [
    {
      key: 'logo_url',
      header: 'Logo',
      width: '120px',
      editable: true,
      render: (value, row) => {
        if (value) {
          return (
            <ProtectedImage
              src={value}
              alt="Logo"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f1f9"/><text x="50" y="54" font-size="28" text-anchor="middle" fill="%2394a3b8" font-family="Arial">?</text></svg>';
                e.currentTarget.style.objectFit = 'contain';
                e.currentTarget.style.background = '#f8fafc';
              }}
              style={{
                width: '50px',
                height: '50px',
                objectFit: 'cover',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}
            />
          );
        }
        return (
          <div style={{ 
            width: '50px', 
            height: '50px', 
            background: '#f1f5f9', 
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            color: '#94a3b8',
            border: '1px solid #e2e8f0'
          }}>
            Sem logo
          </div>
        );
      },
      editComponent: (editData) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          {(logoPreviewEdit || editData.logo_url) && (
            <div style={{ position: 'relative' }}>
              <img 
                src={logoPreviewEdit || editData.logo_url} 
                alt="Logo" 
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  objectFit: 'cover', 
                  borderRadius: '6px',
                  border: '2px solid #cbd5e1'
                }} 
              />
              {logoPreviewEdit && (
                <button
                  type="button"
                  onClick={handleRemoveLogoEdit}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
          <input
            type="file"
            id="logo-upload-edit"
            accept="image/png,image/jpg,image/jpeg,image/svg+xml"
            onChange={handleLogoChangeEdit}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="logo-upload-edit"
            style={{
              padding: '4px 8px',
              background: '#667eea',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {logoPreviewEdit ? 'Trocar' : (editData.logo_url ? 'Alterar' : 'Adicionar')}
          </label>
        </div>
      )
    },
    {
      key: 'nome',
      header: 'Nome do Condomínio',
      width: '200px',
      editable: true
    },
    {
      key: 'endereco_completo',
      header: 'Endereço',
      width: '500px',
      editable: true,
      editComponent: (editData, handleInputChange) => {
        const handleCepChange = async (cepValue) => {
          const formatted = formatCEP(cepValue);
          handleInputChange('cep', formatted);
          const cepLimpo = formatted.replace(/\D/g, '');
          if (validateCEP(cepLimpo)) {
            setLoadingCepEdit(true);
            const result = await fetchCEPData(cepLimpo);
            setLoadingCepEdit(false);
            if (result.success) {
              setCepAddressData(result.data);
              setEditValidation(prev => ({ ...prev, cep: 'valid' }));
            } else {
              setCepAddressData(null);
              setEditValidation(prev => ({ ...prev, cep: 'invalid' }));
            }
          } else {
            setCepAddressData(null);
            setEditValidation(prev => ({ ...prev, cep: cepLimpo.length ? 'invalid' : null }));
          }
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9em' }}>
            <div className="address-edit">
              <input
                className={`edit-input compact-edit-input cep-input ${editValidation.cep === 'invalid' ? 'input-error' : ''} ${editValidation.cep === 'valid' ? 'input-valid' : ''}`}
                type="text"
                value={formatCEP(editData?.cep || '')}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="CEP"
              />
              <input
                className="edit-input compact-edit-input numero-input"
                type="text"
                value={editData?.numero || ''}
                onChange={(e) => handleInputChange('numero', e.target.value)}
                placeholder="Nº"
              />
              <input
                className="edit-input compact-edit-input complemento-input"
                type="text"
                value={editData?.complemento || ''}
                onChange={(e) => handleInputChange('complemento', e.target.value)}
                placeholder="Complemento"
              />
            </div>
            {loadingCepEdit && (
              <span style={{ color: '#666', fontSize: '0.85em' }}>Buscando endereço...</span>
            )}
            {cepAddressData && (
              <span style={{ color: '#28a745', fontSize: '0.85em' }}>
                📍 {cepAddressData.logradouro}, {cepAddressData.bairro} - {cepAddressData.cidade}/{cepAddressData.estado}
              </span>
            )}
          </div>
        );
      },
      render: (value) => value || '-'
    },
    {
      key: 'cnpj',
      header: 'CNPJ',
      width: '200px',
      editable: true,
      render: (value, row) => {
        const rawCnpj = value || row.cnpj_value || '';
        if (!rawCnpj) return '-';
        const cnpj = String(rawCnpj).replace(/\D/g, '');
        return cnpj.length === 14 ? cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : rawCnpj;
      },
      editComponent: (editData, handleInputChange) => {
        const formatCNPJInput = (value) => {
          const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
          if (digits.length <= 2) return digits;
          if (digits.length <= 5) return digits.replace(/(\d{2})(\d+)/, '$1.$2');
          if (digits.length <= 8) return digits.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
          if (digits.length <= 12) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
          return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
        };

        return (
          <input
            className="edit-input compact-edit-input"
            type="text"
            value={formatCNPJInput(editData.cnpj)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              handleInputChange('cnpj', digits);
            }}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        );
      }
    },
    {
      key: 'telefone',
      header: 'Telefone',
      width: '160px',
      editable: true,
      render: (value, row) => {
        const rawPhone = value || row.phone || '';
        if (!rawPhone) return '-';
        const telefone = String(rawPhone).replace(/\D/g, '');
        if (telefone.length === 11) {
          return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (telefone.length === 10) {
          return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return rawPhone;
      },
      editComponent: (editData, handleInputChange) => {
        const formatTelefoneInput = (value) => {
          const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
          if (digits.length <= 2) return digits;
          if (digits.length <= 6) return digits.replace(/(\d{2})(\d+)/, '($1) $2');
          if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
          return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        };

        return (
          <input
            className="edit-input compact-edit-input"
            type="text"
            value={formatTelefoneInput(editData.telefone)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              handleInputChange('telefone', digits);
            }}
            placeholder="(00) 00000-0000"
            maxLength={15}
          />
        );
      }
    },
    {
      key: 'sindico_nome',
      header: 'Síndico',
      width: '180px',
      render: (value, row) => value || row?.sindico?.full_name || row?.sindico?.nome || row?.sindico_name || '-'
    },
    {
      key: 'is_ativo',
      header: 'Status',
      width: '100px',
      editable: true,
      render: (_value, row) => {
        const isActive = getBooleanStatus(row);
        return (
          <span className={isActive ? 'status-active' : 'status-inactive'}>
            {isActive ? 'Ativo' : 'Inativo'}
          </span>
        );
      },
      editComponent: (editData, handleInputChange) => (
        <input
          type="checkbox"
          checked={Boolean(editData.is_ativo)}
          onChange={(e) => handleInputChange('is_ativo', !!e.target.checked)}
          className="status-checkbox"
        />
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      width: '100px',
    },

  ];

  // Colunas para Eventos
  const eventosColumns = [
    {
      key: 'titulo',
      label: 'Título',
      width: '20%'
    },
    {
      key: 'descricao',
      label: 'Descrição',
      width: '22%'
    },
    {
      key: 'espaco',
      label: 'Espaço',
      width: '15%',
      render: (value, row) => row.espaco_nome || row.local_texto || row.local_completo || '-',
      editComponent: (data, onChange) => {
        console.log('[EventosColumns] Renderizando select de espaços:', {
          espacosDisponiveis: espacosDisponiveis,
          espacosCount: espacosDisponiveis.length,
          valorAtual: data.espaco
        });
        const ativos = espacosDisponiveis.filter(e => e.is_active !== false);
        const selecionado = data.espaco ? espacosDisponiveis.find(e => e.id === data.espaco) : null;
        const options = selecionado && !ativos.some(e => e.id === selecionado.id)
          ? [...ativos, selecionado]
          : ativos;
        return (
          <select
            className="mobile-edit-input"
            value={data.espaco || ''}
            onChange={(e) => {
              const newValue = e.target.value === '' ? null : parseInt(e.target.value);
              console.log('[EventosColumns] Espaço alterado:', newValue);
              onChange('espaco', newValue);
            }}
          >
            <option value="">-- Nenhum espaço --</option>
            {options.map(esp => (
              <option key={esp.id} value={esp.id}>{esp.nome}</option>
            ))}
          </select>
        );
      }
    },
    {
      key: 'local_texto',
      label: 'Local (texto)',
      width: '15%',
      render: (value, row) => value || row.local_completo || '-'
    },
    {
      key: 'datetime_inicio',
      label: 'Início',
      width: '14%',
      render: (value, row) => {
        const v = value || row.datetime_inicio;
        if (!v) return '-';
        if (typeof v === 'string' && v.includes('T')) {
          const cleaned = v.replace('Z','').split('.')[0];
          return cleaned.replace('T',' ');
        }
        return v;
      }
    },
    {
      key: 'datetime_fim',
      label: 'Fim',
      width: '14%',
      render: (value, row) => {
        const v = value || row.datetime_fim;
        if (!v) return '-';
        if (typeof v === 'string' && v.includes('T')) {
          const cleaned = v.replace('Z','').split('.')[0];
          return cleaned.replace('T',' ');
        }
        return v;
      }
    },
    {
      key: 'data_evento',
      label: 'Data',
      width: '12%',
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return date.toLocaleDateString('pt-BR');
      }
    },
    {
      key: 'hora_inicio',
      label: 'Horário',
      width: '13%',
      render: (value, row) => {
        if (!value) return '-';
        const horaFim = row.hora_fim || '';
        return `${value.slice(0, 5)} - ${horaFim.slice(0, 5)}`;
      }
    },
    {
      key: 'actions',
      label: 'Ações',
      width: '18%',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setEditingEvento(row);
              setShowEventoModal(true);
            }}
            className="action-button edit-button"
            title="Editar evento"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDeleteEvento(row.id)}
            className="action-button delete-button"
            title="Excluir evento"
          >
            <FaBan />
          </button>
        </div>
      )
    }
  ];

  // Filtrar abas com base nos níveis de acesso
  const getVisibleTabs = () => {
    console.log('🔍 User Groups:', user?.groups?.map(g => g.name));
    console.log('🔍 Is Staff:', user?.is_staff);
    return tabs.filter(tab => {
      if (tab.requiresAdmin) {
        return user?.is_staff || user?.groups?.some(group => group.name === 'admin');
      }
      if (tab.requiresSindico) {
        const hasSindicoGroup = user?.groups?.some(group => group.name === 'Síndicos');
        console.log(`🔍 Tab ${tab.id} - Requires Sindico:`, hasSindicoGroup);
        return hasSindicoGroup;
      }
      return true;
    });
  };

  const visibleTabs = getVisibleTabs();
  console.log('✅ Visible Tabs:', visibleTabs.map(t => t.id));

  return (
    <div className="tecnicos-page">
      <Header />

      <main className="tecnicos-content">
        <div className="tabs-container">
          <div className="tabs">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="page-header">
          <div className="page-actions">
            {activeTab === 'condominios' && user?.is_staff && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button"
                  onClick={() => setShowAddCondominio(true)}
                  ref={addCondominioButtonRef}
                >
                  <FaPlus /> Adicionar condomínio
                </button>
                {showAddCondominio && (
                  <AddCondominioDropdown
                    onClose={() => setShowAddCondominio(false)}
                    onSuccess={() => {
                      fetchData(activeTab, currentPage, searchTerm);
                      setShowAddCondominio(false);
                    }}
                    triggerRef={addCondominioButtonRef}
                  />
                )}
              </div>
            )}
            {activeTab === 'sindicos' && user?.is_staff && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button" 
                  onClick={() => setShowAddUser(true)}
                  ref={addUserButtonRef}
                >
                  <FaUserPlus /> Adicionar síndico
                </button>
                {showAddUser && (
                  <AddUserDropdown
                    onClose={() => setShowAddUser(false)}
                    onSuccess={() => handleSuccess(activeTab)}
                    triggerRef={addUserButtonRef}
                    availableTeams={teams}
                    teamsLoaded={teamsLoaded}
                    userType="sindico"
                  />
                )}
              </div>
            )}
            {(activeTab === 'portaria' || activeTab === 'moradores') && (
              user?.is_staff || user?.groups?.some(group => group.name === 'Síndicos')
            ) && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button" 
                  onClick={() => setShowAddUser(true)}
                  ref={addUserButtonRef}
                >
                  <FaUserPlus /> Adicionar {activeTab === 'portaria' ? 'portaria' : 'morador'}
                </button>
                {showAddUser && (
                  <AddUserDropdown
                    onClose={() => setShowAddUser(false)}
                    onSuccess={() => handleSuccess(activeTab)}
                    triggerRef={addUserButtonRef}
                    availableTeams={teams}
                    teamsLoaded={teamsLoaded}
                    userType={activeTab === 'portaria' ? 'portaria' : 'morador'}
                  />
                )}
              </div>
            )}
            {activeTab === 'grupos' && (user?.is_staff || user?.groups?.some(group => group.name === 'admin')) && (
              <div className="dropdown-wrapper">
                <button className="add-user-button" onClick={() => setShowAddGroup(true)} ref={addGroupButtonRef}>
                  <FaPlus /> Adicionar grupo
                </button>
                {showAddGroup && (
                  <AddGroupDropdown
                    onClose={() => setShowAddGroup(false)}
                    onSuccess={() => handleSuccess('grupos')}
                    triggerRef={addGroupButtonRef}
                  />
                )}
              </div>
            )}
            {activeTab === 'unidades' && user?.groups?.some(group => group.name === 'Síndicos') && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button" 
                  onClick={() => setShowAddUnidade(true)}
                  ref={addUnidadeButtonRef}
                >
                  <FaPlus /> Adicionar unidade(s)
                </button>
                {showAddUnidade && (
                  <AddUnidadeModal
                    onClose={() => setShowAddUnidade(false)}
                    onSuccess={() => {
                      fetchData('unidades', currentPage, searchTerm);
                      setShowAddUnidade(false);
                    }}
                  />
                )}
              </div>
            )}

            {activeTab === 'eventos' && user?.groups?.some(group => group.name === 'Síndicos') && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button" 
                  onClick={() => {
                    setEditingEvento(null);
                    setShowEventoModal(true);
                  }}
                >
                  <FaPlus /> Novo evento
                </button>
              </div>
            )}

            {activeTab === 'avisos' && user?.groups?.some(group => group.name === 'Síndicos') && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button" 
                  onClick={() => setShowAddAviso(true)}
                  ref={addAvisoButtonRef}
                >
                  <FaPlus /> Novo aviso
                </button>
                {showAddAviso && (
                  <AddAvisoDropdown
                    onClose={() => setShowAddAviso(false)}
                    onSuccess={() => {
                      fetchData('avisos', currentPage, searchTerm);
                      setShowAddAviso(false);
                    }}
                    triggerRef={addAvisoButtonRef}
                  />
                )}
              </div>
            )}

            {activeTab === 'espacos' && user?.groups?.some(group => group.name === 'Síndicos') && (
              <div className="dropdown-wrapper">
                <button 
                  className="add-user-button" 
                  onClick={() => setShowAddEspaco(true)}
                >
                  <FaPlus /> Novo espaço
                </button>
              </div>
            )}

          </div>

          <div className="search-container">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {activeTab === 'eventos' ? (
          <>
            <GenericTable
              columns={eventosColumns}
              data={tableData.eventos}
              loading={loading}
              onSave={async (rowId, updatedData) => {
                try {
                  console.log('[UsersPage] Salvando evento:', { rowId, updatedData });
                  
                  // Remover apenas campos calculados/readonly antes de enviar
                  const { espaco_nome, created_at, hora_inicio, hora_fim, ...dataToSave } = updatedData;
                  // Normalizar campo espaco vazio para null
                  if (!dataToSave.espaco) {
                    dataToSave.espaco = null;
                  }
                  
                  console.log('[UsersPage] Dados filtrados para salvar:', dataToSave);
                  await eventoAPI.patch(rowId, dataToSave);
                  await fetchData('eventos', currentPage, searchTerm);
                } catch (error) {
                  console.error('Erro ao salvar evento:', error);
                  alert('Erro ao salvar evento: ' + (error.response?.data?.detail || error.response?.data?.non_field_errors?.[0] || error.message));
                }
              }}
              onPageChange={(page) => setCurrentPage(page)}
              totalPages={totalPages.eventos}
              currentPage={currentPage}
              className="full-width-table allow-horizontal-scroll"
            />
          </>
        ) : activeTab === 'avisos' ? (
          <>
            <GenericTable
              columns={[
                { key: 'titulo', header: 'Título', width: '22%' },
                { key: 'descricao', header: 'Descrição', width: '28%', render: (v) => v || '-' },
                { key: 'grupo_nome', header: 'Grupo', width: '12%' },
                { key: 'prioridade', header: 'Prioridade', width: '10%', render: (v) => ({ baixa:'Baixa', media:'Média', alta:'Alta', urgente:'Urgente' }[v] || v),
                  editComponent: (data, onChange) => (
                    <select className="mobile-edit-input" value={data.prioridade || ''} onChange={(e)=>onChange('prioridade', e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  )
                },
                { key: 'status', header: 'Status', width: '10%', render: (v) => ({ rascunho:'Rascunho', ativo:'Ativo', inativo:'Inativo' }[v] || v),
                  editComponent: (data, onChange) => (
                    <select className="mobile-edit-input" value={data.status || ''} onChange={(e)=>onChange('status', e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="rascunho">Rascunho</option>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  )
                },
                { key: 'data_inicio', header: 'Início', width: '9%', render: (v) => {
                    if (!v) return '-';
                    if (typeof v === 'string') {
                      const cleaned = v.replace('Z','').split('.')[0];
                      if (cleaned.includes('T')) return cleaned.replace('T',' ');
                    }
                    return v;
                  },
                  editComponent: (data, onChange) => (
                    <input
                      className="mobile-edit-input"
                      type="datetime-local"
                      value={(() => {
                        const raw = data.data_inicio;
                        if (!raw) return '';
                        if (typeof raw === 'string') {
                          const cleaned = raw.replace('Z','').split('.')[0];
                          if (cleaned.length >= 16) return cleaned.slice(0,16);
                        }
                        return '';
                      })()}
                      onChange={(e)=> onChange('data_inicio', e.target.value ? `${e.target.value}:00Z` : null)}
                    />
                  )
                },
                { key: 'data_fim', header: 'Fim', width: '9%', render: (v) => {
                    if (!v) return '-';
                    if (typeof v === 'string') {
                      const cleaned = v.replace('Z','').split('.')[0];
                      if (cleaned.includes('T')) return cleaned.replace('T',' ');
                    }
                    return v;
                  },
                  editComponent: (data, onChange) => (
                    <input
                      className="mobile-edit-input"
                      type="datetime-local"
                      value={(() => {
                        const raw = data.data_fim;
                        if (!raw) return '';
                        if (typeof raw === 'string') {
                          const cleaned = raw.replace('Z','').split('.')[0];
                          if (cleaned.length >= 16) return cleaned.slice(0,16);
                        }
                        return '';
                      })()}
                      onChange={(e)=> onChange('data_fim', e.target.value ? `${e.target.value}:00Z` : null)}
                    />
                  )
                },
                {
                  key: 'acoes', header: 'Ações', width: '10%', render: (_val, row) => (
                    <div className="actions-column">
                      <button
                        className="edit-button"
                        onClick={(e) => { e.stopPropagation(); setEditingAviso(row); }}
                        title="Editar aviso"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )
                },
              ]}
              data={tableData.avisos}
              loading={loading}
              onSave={async (rowId, updatedData) => {
                try {
                  console.log('[UsersPage] Salvando aviso:', { rowId, updatedData });
                  await avisoAPI.patch(rowId, updatedData);
                  await fetchData('avisos', currentPage, searchTerm);
                } catch (error) {
                  console.error('Erro ao salvar aviso:', error);
                  alert('Erro ao salvar aviso: ' + (error.response?.data?.detail || error.message));
                }
              }}
              onPageChange={(page) => setCurrentPage(page)}
              totalPages={totalPages.avisos}
              currentPage={currentPage}
              className="full-width-table allow-horizontal-scroll"
            />
            {editingAviso && (
              <EditAvisoModal
                aviso={editingAviso}
                onClose={() => setEditingAviso(null)}
                onSaved={() => fetchData('avisos', currentPage, searchTerm)}
                onDeleted={() => fetchData('avisos', currentPage, searchTerm)}
              />
            )}
          </>
        ) : activeTab === 'espacos' ? (
          <>
            <GenericTable
              columns={[
                { key: 'nome', header: 'Nome', width: '35%' },
                { key: 'capacidade_pessoas', header: 'Capacidade', width: '15%', render: (v) => `${v || 0} pessoas` },
                { key: 'created_on', header: 'Criado em', width: '20%', render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-' },
                { 
                  key: 'is_active', 
                  header: 'Status', 
                  width: '15%',
                  render: (v, row) => (
                    <span className={`status-badge ${getBooleanStatus(row) ? 'active' : 'inactive'}`}>
                      {getBooleanStatus(row) ? 'Ativo' : 'Inativo'}
                    </span>
                  )
                },
                {
                  key: 'acoes', header: 'Ações', width: '15%', render: (_val, row) => (
                    <div className="actions-column">
                      <button
                        className="edit-button"
                        onClick={(e) => { e.stopPropagation(); setEditingEspaco(row); }}
                        title="Editar espaço"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )
                },
              ]}
              data={tableData.espacos}
              loading={loading}
              onSave={async (rowId, updatedData) => {
                try {
                  console.log('[UsersPage] Salvando espaço:', { rowId, updatedData });
                  await espacoAPI.patch(rowId, updatedData);
                  await fetchData('espacos', currentPage, searchTerm);
                } catch (error) {
                  console.error('Erro ao salvar espaço:', error);
                  alert('Erro ao salvar espaço: ' + (error.response?.data?.detail || error.message));
                }
              }}
              onPageChange={(page) => setCurrentPage(page)}
              totalPages={totalPages.espacos}
              currentPage={currentPage}
              className="full-width-table"
            />
            
            {showAddEspaco && (
              <AddEspacoModal
                onClose={() => setShowAddEspaco(false)}
                onSuccess={() => {
                  fetchData('espacos', currentPage, searchTerm);
                  setShowAddEspaco(false);
                }}
              />
            )}
            {editingEspaco && (
              <EditEspacoModal
                espaco={editingEspaco}
                onClose={() => setEditingEspaco(null)}
                onSaved={() => fetchData('espacos', currentPage, searchTerm)}
                onDeleted={() => fetchData('espacos', currentPage, searchTerm)}
              />
            )}
          </>
        ) : activeTab === 'reservas' ? (
          <GenericTable
            columns={[
              { key: 'espaco_nome', header: 'Espaço', width: '23%' },
              { key: 'morador_nome', header: 'Morador', width: '23%' },
              { key: 'data_reserva', header: 'Data', width: '13%', render: (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '-' },
              { key: 'valor_cobrado', header: 'Valor', width: '11%', render: (v) => `R$ ${parseFloat(v || 0).toFixed(2)}` },
              { 
                key: 'status', 
                header: 'Status', 
                width: '12%',
                render: (v) => (
                  <span className={`status-badge ${v === 'confirmada' ? 'active' : v === 'cancelada' ? 'inactive' : 'pending'}`}>
                    {{ confirmada: 'Confirmada', cancelada: 'Cancelada', pendente: 'Pendente' }[v] || v}
                  </span>
                )
              },
              { key: 'created_on', header: 'Criado em', width: '10%', render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-' },
              {
                key: 'acoes',
                header: 'Ações',
                width: '8%',
                render: (_, row) => (
                  <div className="actions-column">
                    {row.status === 'confirmada' && (
                      <button
                        className="cancel-button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Deseja cancelar esta reserva? A data ficará disponível novamente.')) {
                            try {
                              await espacoReservaAPI.patch(row.id, { status: 'cancelada' });
                              fetchData('reservas', currentPage, searchTerm);
                              alert('Reserva cancelada com sucesso!');
                            } catch (err) {
                              console.error('Erro ao cancelar reserva:', err);
                              alert('Erro ao cancelar reserva.');
                            }
                          }
                        }}
                        title="Cancelar reserva"
                      >
                        <FaBan />
                      </button>
                    )}
                    {row.status === 'cancelada' && (
                      <button
                        className="edit-button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm('Deseja reativar esta reserva?')) {
                            try {
                              await espacoReservaAPI.patch(row.id, { status: 'confirmada' });
                              fetchData('reservas', currentPage, searchTerm);
                              alert('Reserva reativada com sucesso!');
                            } catch (err) {
                              console.error('Erro ao reativar reserva:', err);
                              alert('Erro ao reativar reserva.');
                            }
                          }
                        }}
                        title="Reativar reserva"
                      >
                        <FaCheck />
                      </button>
                    )}
                  </div>
                )
              }
            ]}
            data={tableData.reservas}
            loading={loading}
            onSave={async (rowId, updatedData) => {
              try {
                console.log('[UsersPage] Salvando reserva:', { rowId, updatedData });
                await espacoReservaAPI.patch(rowId, updatedData);
                await fetchData('reservas', currentPage, searchTerm);
              } catch (error) {
                console.error('Erro ao salvar reserva:', error);
                alert('Erro ao salvar reserva: ' + (error.response?.data?.detail || error.message));
              }
            }}
            onPageChange={(page) => setCurrentPage(page)}
            totalPages={totalPages.reservas}
            currentPage={currentPage}
            className="full-width-table"
          />
        ) : (
          <GenericTable
            columns={
              activeTab === 'condominios' ? condominiosColumns :
              activeTab === 'sindicos' ? sindicosColumns :
              activeTab === 'grupos' ? gruposColumns :
              activeTab === 'unidades' ? unidadesColumns :
              activeTab === 'moradores' ? moradoresColumns :
              funcionariosColumns
            }
            data={tableData[activeTab]}
            loading={loading}
            onPageChange={(page) => setCurrentPage(page)}
            totalPages={totalPages[activeTab]}
            currentPage={currentPage}
            onSave={handleSave}
            onCancel={() => {
              setEditingRowId(null);
              setLogoFile(null);
              setLogoPreviewEdit(null);
            }}
            className="full-width-table allow-horizontal-scroll"
            editingRowId={editingRowId}
            onEditRow={handleEditRow}
            onEditDataChange={setCurrentEditData}
          />
        )}

        {resetPassword.show && (
          <PasswordResetModal
            password={resetPassword.password}
            onClose={() => setResetPassword({ show: false, password: '', userId: null })}
          />
        )}

        {showEventoModal && (
          <EventoModal
            isOpen={showEventoModal}
            onClose={() => {
              setShowEventoModal(false);
              setEditingEvento(null);
            }}
            onSuccess={() => {
              fetchData('eventos', currentPage, searchTerm);
            }}
            evento={editingEvento}
          />
        )}
      </main>
    </div>
  );
}

export default UsersPage;
