import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/WelcomePage.css';
import ProtectedImage from '../components/common/ProtectedImage';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import { avisoAPI, dashboardAPI } from '../services/api';
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

  const formatCondominioName = (value) => {
    if (!value || typeof value !== 'string') return '';
    return value.toLocaleUpperCase('pt-BR');
  };

  useEffect(() => {
    document.title = 'Cancella Flow | Home';
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await avisoAPI.home();
        setAvisosHome(Array.isArray(resp.data) ? resp.data : []);
      } catch (e) {
        setAvisosHome([]);
      }
    })();
  }, []);

  // Carregar estatísticas conforme o perfil
  useEffect(() => {
    const isMoradorGroup = user?.groups?.some(group => group.name === 'Moradores');
    const isSindicoGroup = user?.groups?.some(group => group.name === 'Síndicos');
    const isPortariaGroup = user?.groups?.some(group => group.name === 'Portaria');
    const isAdminUser = user?.is_staff || user?.groups?.some(group => group.name === 'admin');

    if (isAdminUser) {
      (async () => {
        try {
          setLoadingStats(true);
          const resp = await dashboardAPI.adminStats();
          setAdminStats(resp.data);
        } catch (e) {
          console.error('Erro ao carregar estatísticas do admin:', e);
          setAdminStats(null);
        } finally {
          setLoadingStats(false);
        }
      })();
    } else if (isSindicoGroup) {
      (async () => {
        try {
          setLoadingStats(true);
          const resp = await dashboardAPI.sindicoStats();
          setSindicoStats(resp.data);
        } catch (e) {
          console.error('Erro ao carregar estatísticas do síndico:', e);
          setSindicoStats(null);
        } finally {
          setLoadingStats(false);
        }
      })();
    } else if (isMoradorGroup) {
      (async () => {
        try {
          setLoadingStats(true);
          const resp = await dashboardAPI.moradorStats();
          setMoradorStats(resp.data);
        } catch (e) {
          console.error('Erro ao carregar estatísticas do morador:', e);
          setMoradorStats(null);
        } finally {
          setLoadingStats(false);
        }
      })();
    } else if (isPortariaGroup) {
      (async () => {
        try {
          setLoadingStats(true);
          const resp = await dashboardAPI.portariaStats();
          setPortariaStats(resp.data);
        } catch (e) {
          console.error('Erro ao carregar estatísticas da portaria:', e);
          setPortariaStats(null);
        } finally {
          setLoadingStats(false);
        }
      })();
    } else {
      setLoadingStats(false);
    }
  }, [user]);

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

  return (
    <>
      <div className="welcome-container">
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
                <ProtectedImage
                  src={condominioLogoUrl}
                  alt="Logo do Condomínio"
                  className="condo-logo"
                />
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
            <main className="dashboard-grid">
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
