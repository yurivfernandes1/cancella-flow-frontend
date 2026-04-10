import React, { useMemo } from 'react';
import {
  FaGlobe,
  FaInstagram,
  FaWhatsapp,
} from 'react-icons/fa';
import logo from '../assets/logo_header.svg';
import '../styles/SystemLinksPage.css';

function SystemLinksPage() {
  const systemUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/home';
    return `${window.location.origin}/home`;
  }, []);

  const whatsappUrl = useMemo(
    () => 'https://wa.me/5531987798823?text=Ola%2C%20quero%20falar%20com%20o%20consultor%20do%20Cancella%20Flow.',
    []
  );

  return (
    <div className="system-links-root">
      <main className="system-links-shell">
        <div className="system-links-avatar-wrap">
          <img src={logo} alt="Cancella Flow" className="system-links-logo" />
        </div>

        <h1>Cancella Flow</h1>

        <div className="system-links-actions">
          <a
            className="system-links-action-btn"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp />
            <span>Falar com o consultor</span>
          </a>

          <a
            className="system-links-action-btn"
            href="https://instagram.com/cancellaflow"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaInstagram />
            <span>Instagram</span>
          </a>

          <a className="system-links-action-btn" href={systemUrl}>
            <FaGlobe />
            <span>Abrir sistema</span>
          </a>
        </div>
      </main>
    </div>
  );
}

export default SystemLinksPage;