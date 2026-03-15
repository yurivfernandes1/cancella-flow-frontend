import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import UserMenu from '../common/UserMenu';
import { FaBars } from 'react-icons/fa';
import logoHeader from '../../assets/logo_header.svg';
import '../../styles/SidebarLayout.css';

function SidebarLayout({ children }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen]   = useState(false);

  return (
    <div className={`sl-root${desktopOpen ? ' sl-root--sidebar-open' : ' sl-root--sidebar-collapsed'}`}>
      <Sidebar
        isOpen={desktopOpen}
        isMobileOpen={mobileOpen}
        onToggle={() => setDesktopOpen((v) => !v)}
        onClose={() => setMobileOpen(false)}
      />

      <div className="sl-main">
        <header className="sl-topbar">
          <button
            className="sl-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            <FaBars />
          </button>
          <Link to="/welcome" className="sl-topbar-logo">
            <img src={logoHeader} alt="Cancella Flow" />
          </Link>
          <div className="sl-topbar-right">
            <UserMenu />
          </div>
        </header>

        <main className="sl-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default SidebarLayout;
