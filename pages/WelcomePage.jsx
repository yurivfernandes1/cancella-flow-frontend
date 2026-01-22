import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header/Header';
import '../styles/WelcomePage.css';
import ProtectedImage from '../components/common/ProtectedImage';
import AvisoBanner from '../components/Avisos/AvisoBanner';
import { avisoAPI, dashboardAPI } from '../services/api';
import { condominioAPI } from '../services/api';
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
  FaExclamationTriangle
} from 'react-icons/fa';


function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avisosHome, setAvisosHome] = useState([]);
  const [moradorStats, setMoradorStats] = useState(null);
  const [sindicoStats, setSindicoStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

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

  // Carregar estatísticas do morador e síndico
  useEffect(() => {
    const isMorador = user?.groups?.some(group => group.name === 'Moradores');
    const isSindico = user?.groups?.some(group => group.name === 'Síndicos');
    
    if (isMorador) {
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
    } else if (isSindico) {
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
    } else {
      setLoadingStats(false);
    }
  }, [user]);

  // Dashboard dinâmico para síndico
  const sindicoDashboardStats = loadingStats ? [] : [
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
    {
      title: 'Visitantes (Mês)',
      value: sindicoStats?.visitantes_mes?.total?.toString() || '0',
      icon: <FaUserShield size={32} />,
      color: '#2abb98',
      description: 'Visitantes registrados este mês'
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
      })()
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
      color: '#19294a',
      description: 'Avisos publicados atualmente'
    },
    {
      title: 'Reservas (Próximos 7 dias)',
      value: sindicoStats?.reservas_proximas?.total?.toString() || '0',
      icon: <FaCalendarCheck size={32} />,
      color: '#2abb98',
      description: 'Reservas de espaços confirmadas'
    },
    {
      title: 'Pendências',
      value: sindicoStats?.pendencias?.total?.toString() || '0',
      icon: <FaExclamationTriangle size={32} />,
      color: '#ef4444',
      description: 'Itens que requerem atenção'
    }
  ];

  // Dados mockados para o dashboard administrativo
  const dashboardStats = [
    {
      title: 'Total de Usuários',
      value: '124',
      icon: <FaUsers size={32} />,
      color: '#2abb98',
      description: 'Usuários cadastrados no sistema'
    },
    {
      title: 'Usuários Ativos',
      value: '98',
      icon: <FaCheckCircle size={32} />,
      color: '#10b981',
      description: '79% dos usuários estão ativos'
    },
    {
      title: 'Condomínios',
      value: '15',
      icon: <FaBuilding size={32} />,
      color: '#19294a',
      description: 'Condomínios cadastrados'
    },
    {
      title: 'Condomínios Ativos',
      value: '12',
      icon: <FaHome size={32} />,
      color: '#2abb98',
      description: '80% dos condomínios ativos'
    },
    {
      title: 'Funções Cadastradas',
      value: '8',
      icon: <FaUserShield size={32} />,
      color: '#19294a',
      description: 'Perfis e grupos no sistema'
    },
    {
      title: 'Acessos no Sistema',
      value: '1.247',
      icon: <FaChartLine size={32} />,
      color: '#2abb98',
      description: 'Total de acessos registrados'
    },
    {
      title: 'Usuários Logados',
      value: '23',
      icon: <FaUserCog size={32} />,
      color: '#10b981',
      description: 'Usuários atualmente online'
    },
    {
      title: 'Tempo de Resposta',
      value: '142ms',
      icon: <FaServer size={32} />,
      color: '#19294a',
      description: 'Tempo médio de resposta do servidor'
    }
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

  const [condominioName, setCondominioName] = useState(null);
  const [condominioLogo, setCondominioLogo] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Tentar extrair nome do condomínio direto do objeto user
    const nameFromUser = user.condominio_nome || user.condominio?.nome || user.condominio?.name || user.condominio_name || null;
    if (nameFromUser) {
      setCondominioName(nameFromUser);
    }

    // Buscar dados completos do condomínio se tivermos o id
    const condominioId = user.condominio_id || user.condominio?.id || null;
    if (condominioId) {
      (async () => {
        try {
          const resp = await condominioAPI.get(condominioId);
          const nome = resp?.data?.nome || resp?.data?.name || null;
          const logoUrl = resp?.data?.logo_url || null;
          if (nome) setCondominioName(nome);
          if (logoUrl) setCondominioLogo(logoUrl);
          console.log('Condominio logo URL fetched:', logoUrl);
        } catch (err) {
          // silencioso — não quebrar a tela principal
          console.error('Failed to fetch condominio data for welcome page:', err);
        }
      })();
    }
  }, [user]);

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

  // Dashboard da Portaria
  const portariaDashboardStats = [
    {
      title: 'Encomendas Pendentes',
      value: '8',
      icon: <FaBox size={32} />,
      color: '#f59e0b',
      description: 'Aguardando retirada',
      link: '/portaria?tab=encomendas'
    },
    {
      title: 'Encomendas Hoje',
      value: '3',
      icon: <FaBox size={32} />,
      color: '#2abb98',
      description: 'Cadastradas hoje',
      link: '/portaria?tab=encomendas'
    },
    {
      title: 'Visitantes no Condomínio',
      value: '5',
      icon: <FaUserShield size={32} />,
      color: '#19294a',
      description: 'Presentes no momento',
      link: '/portaria?tab=visitantes'
    },
    {
      title: 'Visitantes Hoje',
      value: '12',
      icon: <FaUserShield size={32} />,
      color: '#3b82f6',
      description: 'Registrados hoje',
      link: '/portaria?tab=visitantes'
    },
    {
      title: 'Reservas do Dia',
      value: '3',
      icon: <FaCalendarCheck size={32} />,
      color: '#10b981',
      description: 'Espaços reservados hoje',
      link: '/portaria?tab=reservas'
    }
  ];

  return (
    <>
      <Header />
      <div className="welcome-container">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <header className="welcome-header">
          <div className="welcome-header-inner">
            {/* Logo do Condomínio à esquerda para Síndicos, Moradores e Porteiros */}
            {(isSindico || isMorador || isPortaria) && condominioLogo && (
              <div className="condo-logo-wrapper condo-logo-left">
                <ProtectedImage
                  src={condominioLogo}
                  alt="Logo do Condomínio"
                  className="condo-logo"
                  onError={(e) => {
                    console.error('Erro ao carregar logo do condomínio:', condominioLogo);
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="Arial" font-size="20">Logo indisponível</text></svg>';
                    e.currentTarget.style.objectFit = 'contain';
                  }}
                />
              </div>
            )}

            <div className="welcome-text">
              <h1>Bem-vindo ao Cancella Flow{user?.first_name ? `, ${user.first_name}` : ''}!</h1>
              {isAdmin ? (
                <p className="welcome-subtitle">
                  Dashboard Administrativo - Visão geral do sistema
                </p>
              ) : isSindico ? (
                <p className="welcome-subtitle">
                  Dashboard do Síndico - Visão geral do condomínio{condominioName ? `: ${condominioName}` : ''}
                </p>
              ) : isPortaria ? (
                <p className="welcome-subtitle">
                  Dashboard da Portaria - Gestão de encomendas e visitantes{condominioName ? ` - ${condominioName}` : ''}
                </p>
              ) : isMorador ? (
                <p className="welcome-subtitle">
                  Minha Área - Acompanhe suas encomendas e visitantes{condominioName ? ` - ${condominioName}` : ''}
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
          <main className="dashboard-grid">
            {(isAdmin ? dashboardStats : isSindico ? sindicoDashboardStats : isPortaria ? portariaDashboardStats : moradorDashboardStats).map((stat, index) => (
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
    </>
  );
}

export default WelcomePage;
