import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/WelcomePage.css';
import ProtectedImage from '../components/common/ProtectedImage';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import { avisoAPI, dashboardAPI, signupAPI } from '../services/api';
import { 
  FaUserCog, 
  FaUsers,
  FaCogs,
  FaBuilding,
  FaUserTie,
  FaUserFriends,
  FaHome,
  FaChartLine,
  FaCheckCircle,
  FaUserShield,
  FaServer,
  FaBell,
  FaBox,
  FaCalendarCheck,
  FaExclamationTriangle,
  FaClipboardList,
  FaDoorOpen,
  FaQrcode,
} from 'react-icons/fa';
import QrCodeScanner from '../components/Eventos/QrCodeScanner';


function WelcomePage() {
  const { user, condominioData, condominioLogoUrl } = useAuth();
  const navigate = useNavigate();
  const [avisosHome, setAvisosHome] = useState([]);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [moradorStats, setMoradorStats] = useState(null);
  const [sindicoStats, setSindicoStats] = useState(null);
  const [portariaStats, setPortariaStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [signupLinkLoading, setSignupLinkLoading] = useState(false);
  const [signupLinkError, setSignupLinkError] = useState('');
  const [signupLinkToast, setSignupLinkToast] = useState({ visible: false, type: 'success', text: '' });

  const formatCondominioName = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.toLocaleUpperCase('pt-BR');
  };

  useEffect(() => {
    document.title = 'Cancella Flow | Home';
  }, []);

  useEffect(() => {
    // Deduplicate aviso fetches (prevents double requests in StrictMode/dev)
    if (WelcomePage._avisoPromise) {
      WelcomePage._avisoPromise
        .then((data) => setAvisosHome(Array.isArray(data) ? data : []))
        .catch(() => setAvisosHome([]));
      return;
    }

    WelcomePage._avisoPromise = (async () => {
      try {
        const resp = await avisoAPI.home();
        return resp.data;
      } catch (e) {
        throw e;
      }
    })();

    WelcomePage._avisoPromise
      .then((data) => setAvisosHome(Array.isArray(data) ? data : []))
      .catch(() => setAvisosHome([]))
      .finally(() => { WelcomePage._avisoPromise = null; });
  }, []);

  useEffect(() => {
    if (!signupLinkToast.visible) return undefined;

    const timer = setTimeout(() => {
      setSignupLinkToast((prev) => ({ ...prev, visible: false }));
    }, 2500);

    return () => clearTimeout(timer);
  }, [signupLinkToast.visible]);

  // Carregar estatísticas conforme o perfil
  useEffect(() => {
    const isMoradorGroup = user?.groups?.some(group => group.name === 'Moradores');
    const isSindicoGroup = user?.groups?.some(group => group.name === 'Síndicos');
    const isPortariaGroup = user?.groups?.some(group => group.name === 'Portaria');
    const isAdminUser = user?.is_staff || user?.groups?.some(group => group.name === 'admin');

    const key = isAdminUser ? 'admin' : isSindicoGroup ? 'sindico' : isMoradorGroup ? 'morador' : isPortariaGroup ? 'portaria' : null;
    if (!key) {
      setLoadingStats(false);
      return;
    }

    // Use a per-key promise cache to dedupe concurrent/stat duplicate calls
    WelcomePage._statsPromises = WelcomePage._statsPromises || {};
    if (WelcomePage._statsPromises[key]) {
      setLoadingStats(true);
      WelcomePage._statsPromises[key]
        .then((data) => {
          if (key === 'admin') setAdminStats(data);
          if (key === 'sindico') setSindicoStats(data);
          if (key === 'morador') setMoradorStats(data);
          if (key === 'portaria') setPortariaStats(data);
        })
        .catch((e) => console.error('Erro ao carregar estatísticas:', e))
        .finally(() => setLoadingStats(false));
      return;
    }

    setLoadingStats(true);
    const fetcher = (async () => {
      try {
        if (key === 'admin') return (await dashboardAPI.adminStats()).data;
        if (key === 'sindico') return (await dashboardAPI.sindicoStats()).data;
        if (key === 'morador') return (await dashboardAPI.moradorStats()).data;
        if (key === 'portaria') return (await dashboardAPI.portariaStats()).data;
        return null;
      } catch (e) {
        throw e;
      }
    })();

    WelcomePage._statsPromises[key] = fetcher;
    fetcher
      .then((data) => {
        if (key === 'admin') setAdminStats(data);
        if (key === 'sindico') setSindicoStats(data);
        if (key === 'morador') setMoradorStats(data);
        if (key === 'portaria') setPortariaStats(data);
      })
      .catch((e) => {
        console.error('Erro ao carregar estatísticas:', e);
        if (key === 'admin') setAdminStats(null);
        if (key === 'sindico') setSindicoStats(null);
        if (key === 'morador') setMoradorStats(null);
        if (key === 'portaria') setPortariaStats(null);
      })
      .finally(() => {
        WelcomePage._statsPromises[key] = null;
        setLoadingStats(false);
      });
  }, [user]);

  const handleCopySignupLink = async () => {
    try {
      setSignupLinkLoading(true);
      setSignupLinkError('');

      let response = await signupAPI.getInviteLink({ frontend_base: window.location.origin });
      let link = response.data?.signup_url || '';

      if (!link) {
        response = await signupAPI.regenerateInviteLink({}, { frontend_base: window.location.origin });
        link = response.data?.signup_url || '';
      }

      if (!link) {
        throw new Error('Link não disponível.');
      }

      await navigator.clipboard.writeText(link);
      setSignupLinkToast({
        visible: true,
        type: 'success',
        text: 'Link de cadastro copiado com sucesso.',
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Não foi possível gerar o link de cadastro.';
      setSignupLinkError(msg);
      setSignupLinkToast({
        visible: true,
        type: 'error',
        text: msg,
      });
    } finally {
      setSignupLinkLoading(false);
    }
  };

  const handleDownloadSignupQrCode = async () => {
    try {
      setSignupLinkLoading(true);
      setSignupLinkError('');

      const response = await signupAPI.downloadInviteQrCode({
        frontend_base: window.location.origin,
      });

      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'qrcode-cadastro-condominio.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.error || 'Não foi possível gerar o QR Code do link de cadastro.';
      setSignupLinkError(msg);
    } finally {
      setSignupLinkLoading(false);
    }
  };

  // Dashboard dinâmico para síndico (ordenado por prioridade: ocorrências → encomendas → reservas → ...)
  const sindicoDashboardStats = loadingStats ? [] : [
    {
      title: 'Ocorrências Abertas',
      value: sindicoStats?.ocorrencias_pendentes?.total?.toString() || '0',
      icon: <FaClipboardList size={32} />,
      color: (sindicoStats?.ocorrencias_pendentes?.total || 0) > 0 ? '#ef4444' : '#2abb98',
      description: 'Ocorrências aguardando resposta',
      link: '/gestao-usuarios?tab=ocorrencias'
    },
    {
      title: 'Encomendas Pendentes',
      value: sindicoStats?.encomendas_pendentes?.total?.toString() || '0',
      icon: <FaBox size={32} />,
      color: sindicoStats?.encomendas_pendentes?.cor_alerta || '#2abb98',
      description: (function(){
        const dias = sindicoStats?.encomendas_pendentes?.dias_mais_antiga;
        if (dias == null) return 'Encomendas aguardando retirada';
        if (dias <= 0) return 'Pendentes há menos de 1 dia';
        if (dias === 1) return 'Mais antiga há 1 dia';
        return `Mais antiga há ${dias} dias`;
      })(),
      link: '/gestao-usuarios?tab=encomendas'
    },
    {
      title: 'Reservas (Próximos 7 dias)',
      value: sindicoStats?.reservas_proximas?.total?.toString() || '0',
      icon: <FaCalendarCheck size={32} />,
      color: '#2abb98',
      description: 'Reservas de espaços confirmadas'
    },
    {
      title: 'Eventos (Próximos 7 dias)',
      value: sindicoStats?.eventos_proximos?.total?.toString() || '0',
      icon: <FaCalendarCheck size={32} />,
      color: '#3b82f6',
      description: 'Eventos próximos na agenda'
    },
    {
      title: 'Avisos Ativos',
      value: sindicoStats?.avisos_ativos?.total?.toString() || '0',
      icon: <FaBell size={32} />,
      color: '#f59e0b',
      description: 'Avisos publicados atualmente'
    },
    {
      title: 'Visitantes (Mês)',
      value: sindicoStats?.visitantes_mes?.total?.toString() || '0',
      icon: <FaUserShield size={32} />,
      color: '#2abb98',
      description: 'Visitantes registrados este mês'
    },
    {
      title: 'Moradores',
      value: sindicoStats?.moradores?.total?.toString() || '0',
      icon: <FaHome size={32} />,
      color: '#2abb98',
      description: 'Total de moradores cadastrados'
    },
    {
      title: 'Moradores Ativos',
      value: sindicoStats?.moradores?.ativos?.toString() || '0',
      icon: <FaCheckCircle size={32} />,
      color: '#10b981',
      description: `${sindicoStats?.moradores?.percentual_ativos || 0}% dos moradores ativos`
    },
    {
      title: 'Cadastros Pendentes',
      value: sindicoStats?.moradores?.pendentes?.toString() || '0',
      icon: <FaUsers size={32} />,
      color: (sindicoStats?.moradores?.pendentes || 0) > 0 ? '#f59e0b' : '#2abb98',
      description: 'Moradores aguardando aprovação',
      link: '/gestao-usuarios?tab=unidades_moradores'
    },
    {
      title: 'Funcionários',
      value: sindicoStats?.funcionarios?.total?.toString() || '0',
      icon: <FaUsers size={32} />,
      color: '#19294a',
      description: 'Funcionários do condomínio'
    },
  ];

  // Dashboard dinâmico para admin (dados reais da API)
  const adminDashboardStats = loadingStats ? [] : [
    {
      title: 'Total de Condomínios',
      value: adminStats?.total_condominios?.toString() || '0',
      icon: <FaBuilding size={32} />,
      color: '#19294a',
      description: 'Condomínios ativos no sistema',
    },
    {
      title: 'Usuários Ativos',
      value: adminStats?.total_usuarios?.toString() || '0',
      icon: <FaCheckCircle size={32} />,
      color: '#10b981',
      description: 'Usuários com acesso ativo'
    },
    {
      title: 'Total de Síndicos',
      value: adminStats?.total_sindicos?.toString() || '0',
      icon: <FaUserTie size={32} />,
      color: '#2abb98',
      description: 'Síndicos cadastrados',
    },
    {
      title: 'Total de Moradores',
      value: adminStats?.total_moradores?.toString() || '0',
      icon: <FaHome size={32} />,
      color: '#2abb98',
      description: 'Moradores cadastrados'
    },
    {
      title: 'Total de Porteiros',
      value: adminStats?.total_porteiros?.toString() || '0',
      icon: <FaUsers size={32} />,
      color: '#19294a',
      description: 'Porteiros cadastrados'
    },
  ];

  const cards = [];

  // Gestão do Sistema - baseada nos grupos do usuário
  if (user?.is_staff || user?.groups?.some(group => ['admin', 'Síndicos'].includes(group.name))) {
    const systemSubItems = [];
    
    // Administradores podem ver Condomínios e Síndicos
    if (user?.is_staff || user?.groups?.some(group => group.name === 'admin')) {
      systemSubItems.push(
        { 
          name: 'Gestão de Condomínios', 
          icon: <FaBuilding size={16} />, 
          path: '/gestao-usuarios?tab=condominios'
        },
        { 
          name: 'Gestão de Síndicos', 
          icon: <FaUserTie size={16} />, 
          path: '/gestao-usuarios?tab=sindicos'
        },
        {
          name: 'Gestão de Cerimonialistas',
          icon: <FaUserCog size={16} />,
          path: '/admin/cerimonialistas?tab=lista'
        }
      );
    }
    
    // Síndicos podem ver Funcionários e Moradores
    if (user?.groups?.some(group => group.name === 'Síndicos')) {
      systemSubItems.push(
        {
          name: 'Meu Condomínio',
          icon: <FaBuilding size={16} />,
          path: '/gestao-usuarios?tab=meu_condominio'
        },
        { 
          name: 'Gestão de Funcionários', 
          icon: <FaUsers size={16} />, 
          path: '/gestao-usuarios?tab=funcionarios'
        },
        { 
          name: 'Gestão de Moradores', 
          icon: <FaHome size={16} />, 
          path: '/gestao-usuarios?tab=moradores'
        }
      );
    }
    
    // Administradores sempre podem ver Grupos e Acessos
    if (user?.is_staff || user?.groups?.some(group => group.name === 'admin')) {
      systemSubItems.push(
        { 
          name: 'Grupos', 
          icon: <FaUserFriends size={16} />, 
          path: '/gestao-usuarios?tab=grupos'
        }
      );
    }
    
    cards.push({
      title: 'Gestão do Sistema',
      description: 'Gerencie os diferentes aspectos do sistema',
      active: true,
      icon: <FaCogs size={32} />,
      subItems: systemSubItems
    });
  }

  // Verificar tipo de usuário
  const isAdmin = user?.is_staff || user?.groups?.some(group => group.name === 'admin');
  const isSindico = user?.groups?.some(group => group.name === 'Síndicos');
  const isMorador = user?.groups?.some(group => group.name === 'Moradores');
  const isPortaria = user?.groups?.some(group => group.name === 'Portaria');
  const isCerimonialista = user?.groups?.some(group => group.name === 'Cerimonialista');
  const isRecepcao = user?.groups?.some(group => group.name === 'Recepção');
  const isOrganizadorEvento = user?.groups?.some(group => group.name === 'Organizador do Evento');

  if ((isCerimonialista || isRecepcao || isOrganizadorEvento) && cards.length === 0) {
    const rolePanelPath = isCerimonialista
      ? '/cerimonialista?tab=eventos'
      : isRecepcao
        ? '/recepcao?tab=eventos'
        : '/organizador-evento?tab=eventos';

    cards.push({
      title: 'Minha Área',
      description: 'Acesse seu painel e configurações de perfil.',
      active: true,
      icon: <FaUserCog size={32} />,
      subItems: [
        {
          name: 'Painel',
          icon: <FaChartLine size={16} />,
          path: rolePanelPath,
        },
        {
          name: 'Meu Perfil',
          icon: <FaUserShield size={16} />,
          path: '/perfil/meu',
        },
      ],
    });
  }
  const showDashboard = isAdmin || isSindico || isMorador || isPortaria;

  // Nome e logo do condomínio vêm do contexto — sem fetch adicional
  const condominioName = condominioData?.nome || null;

  // Debug para verificar grupos
  React.useEffect(() => {
    if (user) {
      console.log('=== DEBUG WELCOME PAGE ===');
      console.log('User:', user);
      console.log('Groups:', user.groups);
      console.log('isPortaria:', isPortaria);
      console.log('isMorador:', isMorador);
      console.log('isSindico:', isSindico);
      console.log('isAdmin:', isAdmin);
      console.log('showDashboard:', showDashboard);
    }
  }, [user, isPortaria, isMorador, isSindico, isAdmin, showDashboard]);

  // Dashboard dinâmico para moradores
  const getDescricaoEncomenda = () => {
    if (!moradorStats?.encomendas) return 'Encomendas aguardando retirada';
    const dias = moradorStats.encomendas.dias_mais_antiga;
    if (dias === 0) return 'Encomendas aguardando retirada';
    if (dias === 1) return 'Encomenda há 1 dia aguardando';
    return `Encomenda há ${dias} dias aguardando`;
  };

  const moradorDashboardStats = loadingStats ? [] : [
    {
      title: 'Minhas Encomendas',
      value: moradorStats?.encomendas?.total?.toString() || '0',
      icon: <FaBox size={32} />,
      color: moradorStats?.encomendas?.cor_alerta || '#2abb98',
      description: getDescricaoEncomenda(),
      link: '/minha-area?tab=encomendas'
    },
    {
      title: 'Meus Visitantes',
      value: moradorStats?.visitantes?.total?.toString() || '0',
      icon: <FaUserShield size={32} />,
      color: '#19294a',
      description: 'Visitantes cadastrados',
      link: '/minha-area?tab=visitantes'
    },
    {
      title: 'Avisos',
      value: moradorStats?.avisos?.total?.toString() || '0',
      icon: <FaBell size={32} />,
      color: '#f59e0b',
      description: 'Avisos do condomínio',
      link: '/minha-area?tab=avisos'
    },
    {
      title: 'Minhas Reservas',
      value: moradorStats?.reservas?.total?.toString() || '0',
      icon: <FaCalendarCheck size={32} />,
      color: '#10b981',
      description: 'Reservas futuras confirmadas',
      link: '/minha-area?tab=reservas'
    }
  ];

  // Dashboard dinâmico para portaria (dados reais da API)
  const portariaDashboardStats = loadingStats ? [] : [
    {
      title: 'Visitantes no Condomínio',
      value: portariaStats?.visitantes_dentro?.total?.toString() || '0',
      icon: <FaDoorOpen size={32} />,
      color: '#19294a',
      description: 'Presentes agora no condomínio',
      link: '/portaria?tab=visitantes'
    },
    {
      title: 'Encomendas Pendentes',
      value: portariaStats?.encomendas_pendentes?.total?.toString() || '0',
      icon: <FaBox size={32} />,
      color: '#f59e0b',
      description: 'Aguardando retirada',
      link: '/portaria?tab=encomendas'
    },
    {
      title: 'Reservas Hoje',
      value: portariaStats?.reservas_hoje?.total?.toString() || '0',
      icon: <FaCalendarCheck size={32} />,
      color: '#10b981',
      description: 'Espaços reservados para hoje',
      link: '/portaria?tab=reservas'
    },
    {
      title: 'Eventos Hoje',
      value: portariaStats?.eventos_hoje?.total?.toString() || '0',
      icon: <FaCalendarCheck size={32} />,
      color: '#3b82f6',
      description: 'Eventos acontecendo hoje'
    }
  ];

  const portariaQrCard = isPortaria && (
    <div
      className="dashboard-card clickable qr-mobile-only"
      onClick={() => setShowQrScanner(true)}
      style={{ cursor: 'pointer' }}
    >
      <div className="dashboard-card-icon" style={{ color: '#2abb98' }}>
        <FaQrcode size={32} />
      </div>
      <div className="dashboard-card-content">
        <h3>Ler QR Code</h3>
        <div className="dashboard-card-value" style={{ color: '#2abb98' }}>→</div>
        <p className="dashboard-card-description">Confirmar entrada de convidado via QR</p>
      </div>
    </div>
  );

  // Meu QR de Acesso - primeiro card clicável para moradores/síndicos
  const meuQrCard = (isMorador || isSindico) && (
    <div
      className="dashboard-card clickable"
      onClick={() => navigate('/perfil/qr')}
      style={{ cursor: 'pointer' }}
    >
      <div className="dashboard-card-icon" style={{ color: '#2abb98' }}>
        <FaQrcode size={32} />
      </div>
      <div className="dashboard-card-content">
        <h3>QR Code de acesso</h3>
        <div className="dashboard-card-value" style={{ color: '#2abb98' }}>Mostrar</div>
        <p className="dashboard-card-description">Qr Code de acesso ao condomínio</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="welcome-container">
        {signupLinkToast.visible && (
          <div
            className={`system-toast ${signupLinkToast.type === 'error' ? 'system-toast--error' : 'system-toast--success'}`}
            role="status"
            aria-live="polite"
          >
            {signupLinkToast.text}
          </div>
        )}
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <header className="welcome-header">
          <div className="welcome-header-inner">
            {/* Logo do Condomínio à esquerda para Síndicos, Moradores e Porteiros */}
            {(isSindico || isMorador || isPortaria) && condominioLogoUrl && (
              <div className="condo-logo-wrapper condo-logo-left">
                <div className="sidebar-condo-logo-wrap">
                  <ProtectedImage
                    src={condominioLogoUrl}
                    alt="Logo do Condomínio"
                    className="sidebar-condo-logo"
                  />
                </div>
              </div>
            )}

            <div className="welcome-text">
              <h1>Bem-vindo ao {condominioName ? `Condomínio ${formatCondominioName(condominioName)}` : ''} {user?.first_name ? `, ${user.first_name}` : ''}!</h1>
              {isAdmin ? (
                <p className="welcome-subtitle">
                  Dashboard Administrativo - Visão geral do sistema
                </p>
              ) : isSindico ? (
                <p className="welcome-subtitle">
                  Dashboard do síndico
                </p>
              ) : isPortaria ? (
                <p className="welcome-subtitle">
                  Dashboard da Portaria
                </p>
              ) : isMorador ? (
                <p className="welcome-subtitle">
                  Acompanhe suas encomendas e visitantes.
                </p>
              ) : (
                <p className="welcome-subtitle">
                  Selecione uma das opções abaixo para acessar as funcionalidades:
                </p>
              )}
            </div>
          </div>
        </header>
        
        {/* Avisos (quando existirem) */}
        {avisosHome && avisosHome.length > 0 && (
          <div style={{ maxWidth: 1100, margin: '0 auto 16px', width: '100%' }}>
            {avisosHome.map((av) => (
              <AvisoBanner key={av.id} aviso={av} />
            ))}
          </div>
        )}

        {showDashboard ? (
          <>
            {isSindico && (
              <section style={{ maxWidth: 1100, margin: '0 auto 16px', width: '100%' }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}>
                  <strong style={{ color: '#19294a' }}>Convite de cadastro de moradores</strong>
                  <button
                    type="button"
                    disabled={signupLinkLoading}
                    onClick={handleCopySignupLink}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      background: '#19294a',
                      color: '#fff',
                      padding: '8px 12px',
                      cursor: signupLinkLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {signupLinkLoading ? 'Gerando...' : 'Copiar link de cadastro'}
                  </button>
                  <button
                    type="button"
                    disabled={signupLinkLoading}
                    onClick={handleDownloadSignupQrCode}
                    style={{
                      border: '1px solid #19294a',
                      borderRadius: 8,
                      background: '#fff',
                      color: '#19294a',
                      padding: '8px 12px',
                      cursor: signupLinkLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {signupLinkLoading ? 'Gerando...' : 'Baixar QR Code'}
                  </button>
                  {signupLinkError && (
                    <span style={{ color: '#b91c1c', fontSize: 13 }}>{signupLinkError}</span>
                  )}
                </div>
              </section>
            )}
            <main className="dashboard-grid">
              {meuQrCard}
              {portariaQrCard}
              {(isAdmin ? adminDashboardStats : isSindico ? sindicoDashboardStats : isPortaria ? portariaDashboardStats : moradorDashboardStats).map((stat, index) => (
                <div 
                  key={index} 
                  className={`dashboard-card ${stat.link && stat.link !== '#' ? 'clickable' : ''}`}
                  onClick={() => {
                    if (stat.link && stat.link !== '#') {
                      navigate(stat.link);
                    }
                  }}
                  style={{ cursor: stat.link && stat.link !== '#' ? 'pointer' : 'default' }}
                >
                  <div className="dashboard-card-icon" style={{ color: stat.color }}>
                    {stat.icon}
                  </div>
                  <div className="dashboard-card-content">
                    <h3>{stat.title}</h3>
                    <div className="dashboard-card-value" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <p className="dashboard-card-description">{stat.description}</p>
                  </div>
                </div>
              ))}
            </main>
            {isAdmin && !loadingStats && adminStats?.condominios_detalhes?.length > 0 && (
              <section className="admin-condominios-section">
                <h2 className="admin-section-title">Condomínios</h2>
                <div className="admin-condominios-table-wrapper">
                  <table className="admin-condominios-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Moradores</th>
                        <th>Unidades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.condominios_detalhes.map(c => (
                        <tr
                          key={c.id}
                          className="clickable"
                          onClick={() => navigate('/gestao-usuarios?tab=condominios')}
                        >
                          <td>{formatCondominioName(c.nome)}</td>
                          <td>{c.total_moradores}</td>
                          <td>{c.total_unidades}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        ) : (
          <main className="welcome-cards-grid">
            {cards.map((card, index) => (
              <div key={index} className={`welcome-card ${!card.active ? 'disabled' : ''}`}>
                <div className="welcome-card-content">
                  <div className="welcome-card-header">
                    <div className="welcome-card-icon">{card.icon}</div>
                    <h2>{card.title}</h2>
                  </div>
                  <p>{card.description}</p>
                  {card.subItems && (
                    <ul className="sub-items">
                      {card.subItems.map((item, i) => (
                        <li key={i}>
                          <Link to={item.path}>
                            <span className="sub-item-icon">{item.icon}</span>
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </main>
        )}
      </div>
      {showQrScanner && (
        <QrCodeScanner
          onClose={() => setShowQrScanner(false)}
          onConfirmado={() => {}}
        />
      )}
    </>
  );
}

export default WelcomePage;
