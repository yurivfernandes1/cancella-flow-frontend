import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import icon from '../../assets/favicon.svg';
import ProtectedImage from '../common/ProtectedImage';
import {
  FaHome, FaBuilding, FaBox, FaCalendarAlt, FaClipboardList,
  FaBell, FaIdCard, FaUserFriends, FaChevronLeft,
  FaChevronRight, FaChevronDown, FaCouch, FaCar, FaUser, FaTimes, FaUsers,
  FaExclamationTriangle,
} from 'react-icons/fa';

/* ─── Menu definitions ───────────────────────────────────────── */

const SINDICO_MENU = [
  {
    group: 'Configurações',
    items: [
      { label: 'Meu Condomínio',        icon: FaBuilding, path: '/gestao-usuarios', tab: 'meu_condominio' },
      { label: 'Unidades e Moradores',  icon: FaUsers,    path: '/gestao-usuarios', tab: 'unidades_moradores' },
      { label: 'Cadastro de Porteiros', icon: FaIdCard,   path: '/gestao-usuarios', tab: 'portaria' },
      { label: 'Cadastro de Espaços',   icon: FaCouch,    path: '/gestao-usuarios', tab: 'espacos' },
    ],
  },
  {
    group: 'Portaria',
    items: [
      { label: 'Eventos',             icon: FaCalendarAlt,   path: '/gestao-usuarios', tab: 'eventos' },
      { label: 'Visitantes',          icon: FaUser,          path: '/portaria',        tab: 'visitantes' },
      { label: 'Reservas',            icon: FaCalendarAlt,   path: '/gestao-usuarios', tab: 'reservas' },
      { label: 'Lista de Convidados', icon: FaClipboardList, path: '/gestao-usuarios', tab: 'lista_convidados' },
      { label: 'Minhas Reservas',     icon: FaCalendarAlt,   path: '/minha-area',      tab: 'reservas' },
    ],
  },
  {
    group: 'Administração',
    items: [
      { label: 'Ocorrências', icon: FaExclamationTriangle, path: '/gestao-usuarios', tab: 'ocorrencias' },
      { label: 'Avisos',      icon: FaBell,                path: '/gestao-usuarios', tab: 'avisos' },
      { label: 'Encomendas',  icon: FaBox,                 path: '/gestao-usuarios', tab: 'encomendas' },
    ],
  },
];

const PORTARIA_MENU = [
  {
    group: 'Condomínio',
    items: [
      { label: 'Unidades e Moradores',  icon: FaUsers,               path: '/portaria', tab: 'unidades_moradores' },
      { label: 'Ocorrências',           icon: FaExclamationTriangle,  path: '/portaria', tab: 'ocorrencias' },
      { label: 'Veículos Cadastrados',  icon: FaCar,                  path: '/portaria', tab: 'veiculos' },
      { label: 'Visitantes',            icon: FaUser,                 path: '/portaria', tab: 'visitantes' },
      { label: 'Encomendas',            icon: FaBox,                  path: '/portaria', tab: 'encomendas' },
      { label: 'Avisos',                icon: FaBell,                 path: '/portaria', tab: 'avisos' },
    ],
  },
  {
    group: 'Eventos',
    items: [
      { label: 'Eventos do Condomínio', icon: FaCalendarAlt,   path: '/portaria', tab: 'eventos' },
      { label: 'Reservas de Espaços',   icon: FaCalendarAlt,   path: '/portaria', tab: 'reservas' },
      { label: 'Lista de Convidados',   icon: FaClipboardList, path: '/portaria', tab: 'lista_convidados' },
    ],
  },
];

const MORADOR_MENU = [
  {
    group: 'Condomínio',
    items: [
      { label: 'Reservas',    icon: FaCalendarAlt,         path: '/minha-area', tab: 'reservas' },
      { label: 'Eventos',     icon: FaCalendarAlt,         path: '/minha-area', tab: 'eventos' },
      { label: 'Avisos',      icon: FaBell,                path: '/minha-area', tab: 'avisos' },
      { label: 'Ocorrências', icon: FaExclamationTriangle, path: '/minha-area', tab: 'ocorrencias' },
    ],
  },
  {
    group: 'Serviços de Portaria',
    items: [
      { label: 'Veículos',            icon: FaCar,           path: '/minha-area', tab: 'veiculos' },
      { label: 'Visitantes',          icon: FaUser,          path: '/minha-area', tab: 'visitantes' },
      { label: 'Encomendas',          icon: FaBox,           path: '/minha-area', tab: 'encomendas' },
      { label: 'Lista de Convidados', icon: FaClipboardList, path: '/minha-area', tab: 'lista_convidados' },
    ],
  },
];

const ADMIN_MENU = [
  {
    group: 'Gestão do Sistema',
    items: [
      { label: 'Condomínios e Síndicos', icon: FaBuilding,    path: '/gestao-usuarios', tab: 'condominios' },
      { label: 'Grupos',                 icon: FaUserFriends, path: '/gestao-usuarios', tab: 'grupos' },
    ],
  },
];

/* ─── Component ──────────────────────────────────────────────── */

function Sidebar({ isOpen, isMobileOpen, onToggle, onClose }) {
  const { user, condominioLogoUrl: condominioLogo } = useAuth();
  const location = useLocation();

  const hasGroup = (name) => user?.groups?.some((g) => g.name === name);

  const isAdmin    = user?.is_staff || hasGroup('admin');
  const isSindico  = hasGroup('Síndicos');
  const isMorador  = hasGroup('Moradores');
  const isPortaria = hasGroup('Portaria');

  let menu = [];
  if (isAdmin)         menu = ADMIN_MENU;
  else if (isSindico)  menu = SINDICO_MENU;
  else if (isPortaria) menu = PORTARIA_MENU;
  else if (isMorador)  menu = MORADOR_MENU;

  // Grupos expandidos: todos fechados por padrão
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    menu.forEach((s) => { initial[s.group] = false; });
    return initial;
  });

  const toggleGroup = (group) =>
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const currentTab = new URLSearchParams(location.search).get('tab');
  const isItemActive = (item) =>
    location.pathname === item.path && currentTab === item.tab;

  const condominioName =
    user?.condominio?.nome || user?.condominio_nome || user?.nome_condominio || null;

  // collapsed = desktop sidebar recolhida (não se aplica ao mobile)
  const collapsed = !isOpen && !isMobileOpen;

  return (
    <>
      {isMobileOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={[
        'sidebar',
        !isOpen        ? 'sidebar--collapsed'    : '',
        isMobileOpen   ? 'sidebar--mobile-open'  : '',
      ].filter(Boolean).join(' ')}>

        {/* ── Header: logo do condomínio + nome + botões ── */}
        <div className="sidebar-header">
          {collapsed ? (
            /* Recolhida: só favicon */
            <Link to="/welcome" className="sidebar-logo-icon" onClick={onClose} title="Home">
              <img src={icon} alt="Ícone" />
            </Link>
          ) : (
            /* Expandida — logo do condomínio + nome */
            <Link to="/welcome" className="sidebar-logo-expanded" onClick={onClose}>
              {condominioLogo ? (
                <div className="sidebar-condo-logo-wrap">
                  <ProtectedImage
                    src={condominioLogo}
                    alt="Logo do condomínio"
                    className="sidebar-condo-logo"
                  />
                </div>
              ) : null}
              <span className="sidebar-condo-name">
                {condominioName || 'Cancella Flow'}
              </span>
            </Link>
          )}

          {/* Fechar — só mobile */}
          <button
            className="sidebar-close-btn sidebar-close-mobile"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <FaTimes />
          </button>

          {/* Colapsar — só desktop */}
          <button
            className="sidebar-toggle-btn sidebar-toggle-desktop"
            onClick={onToggle}
            aria-label="Recolher menu"
          >
            {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>

        {/* ── Navegação ── */}
        <nav className="sidebar-nav">
          <Link
            to="/welcome"
            className={`sidebar-item${location.pathname === '/welcome' ? ' sidebar-item--active' : ''}`}
            onClick={onClose}
            title="Home"
          >
            <FaHome className="sidebar-item-icon" />
            {!collapsed && <span className="sidebar-item-label">Home</span>}
          </Link>

          {menu.map((section) => (
            <div key={section.group} className="sidebar-group">
              {collapsed ? (
                <div className="sidebar-group-divider" />
              ) : (
                <button
                  className="sidebar-group-header"
                  onClick={() => toggleGroup(section.group)}
                  aria-expanded={expandedGroups[section.group]}
                >
                  <span className="sidebar-group-label">{section.group}</span>
                  <FaChevronDown
                    className={`sidebar-group-chevron${expandedGroups[section.group] ? '' : ' sidebar-group-chevron--closed'}`}
                  />
                </button>
              )}

              {/* Itens: sempre visíveis quando collapsed (ícones), toggleáveis quando expandido */}
              {(collapsed || expandedGroups[section.group]) &&
                section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={`${item.path}-${item.tab}`}
                      to={`${item.path}?tab=${item.tab}`}
                      className={`sidebar-item${isItemActive(item) ? ' sidebar-item--active' : ''}`}
                      onClick={onClose}
                      title={item.label}
                    >
                      <Icon className="sidebar-item-icon" />
                      {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                    </Link>
                  );
                })
              }
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
