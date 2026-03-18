import React from 'react';
import { Link } from 'react-router-dom';
import { FaBuilding, FaUserShield, FaClipboardList, FaBell, FaFileInvoiceDollar, FaGlassCheers, FaUsers, FaAddressCard, FaArrowRight, FaCheckCircle, FaCheck, FaStar, FaQuoteLeft, FaWhatsapp, FaCar } from 'react-icons/fa';
import logo from '../assets/logo_header.svg';
import '../styles/LandingPage.css';

function LandingPage() {

  return (
    <div className="landing-root">
      {/* Header público */}
      <header className="public-header">
        <div className="public-header-content">
          <Link to="/" className="brand">
            <img src={logo} alt="Cancella Flow" className="brand-logo-img" />
          </Link>
          <nav className="public-nav">
            <a className="nav-link" href="#features">Funcionalidades</a>
            <a className="nav-link" href="#testimonials">Depoimentos</a>
            <Link className="nav-link nav-login" to="/login">Entrar</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-tag">🏢 A melhor solução para síndicos e administradoras</div>
          <h1>Transforme a gestão do seu condomínio</h1>
          <p>
            Plataforma completa e intuitiva para administrar seu condomínio.
            Portaria, funcionários, encomendas, avisos, lista de convidados, gestão de áreas comuns e muito mais.
          </p>
          <div className="hero-ctas">
            <a
              className="cta-primary"
              href="https://wa.me/5531991153035?text=Ol%C3%A1%20gostaria%20de%20saber%20mais%20sobre%20o%20Cancella%20Flow."
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir WhatsApp"
            >
              Fale com o consultor <FaWhatsapp style={{ marginLeft: 8 }} />
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <strong>+150</strong> Condomínios
            </div>
            <div className="stat-item">
              <strong>+8k</strong> Moradores
            </div>
            <div className="stat-item">
              <strong>4.9/5</strong> Avaliação
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <div className="social-proof-content">
          <p className="social-proof-text">
            Confiado por <strong>síndicos e administradoras</strong> em todo o Brasil
          </p>
          <div className="trust-badges">
            <div className="trust-item">
              <FaCheckCircle className="trust-icon" />
              <span>Dados criptografados</span>
            </div>
            <div className="trust-item">
              <FaCheckCircle className="trust-icon" />
              <span>Suporte dedicado</span>
            </div>
            <div className="trust-item">
              <FaCheckCircle className="trust-icon" />
              <span>Atualizações constantes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="features" className="features">
        <div className="section-header">
          <h2>Tudo que você precisa, em um só lugar</h2>
          <p className="section-subtitle">
            O Cancella Flow centraliza as rotinas do seu condomínio com segurança e eficiência.
          </p>
        </div>
          <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FaCar /></div>
            <h3>Controle de Veículos</h3>
            <p>Cadastro de veículos, controle de autorizações e validação de placas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaUserShield /></div>
            <h3>Portaria Inteligente</h3>
            <p>Controle de acessos com registro em tempo real, QR codes e notificações automáticas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaUsers /></div>
            <h3>Gestão de Funcionários</h3>
            <p>Organize equipes, escalas, férias e controle de ponto de forma simples e eficiente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaClipboardList /></div>
            <h3>Controle de Encomendas</h3>
            <p>Registro automático, notificações por SMS/email e histórico completo de entregas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaBell /></div>
            <h3>Avisos e Comunicados</h3>
            <p>Envie avisos segmentados por blocos, unidades ou para todo o condomínio.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaClipboardList /></div>
            <h3>Lista de Convidados</h3>
            <p>Organize listas de convidados para eventos e autorizações temporárias com facilidade.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaGlassCheers /></div>
            <h3>Gestão de Áreas Comuns</h3>
            <p>Reservas e regras para áreas comuns, com calendário compartilhado e controle de acessos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaAddressCard /></div>
            <h3>Visitantes & Moradores</h3>
            <p>Cadastro completo, controle de autorizações e histórico de visitas detalhado.</p>
          </div>
        </div>
      </section>

      {/* Planos removidos por solicitação */}

      {/* Depoimentos */}
      <section id="testimonials" className="testimonials">
        <div className="section-header">
          <h2>O que nossos clientes dizem</h2>
          <p className="section-subtitle">
            Síndicos e administradoras que já transformaram a gestão dos seus condomínios.
          </p>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
            </div>
            <FaQuoteLeft className="quote-icon" />
            <p className="testimonial-text">
              "Antes gastávamos horas organizando planilhas e enviando avisos. Com o Cancella Flow, 
              tudo ficou automatizado. Economizamos tempo e os moradores estão muito mais satisfeitos."
            </p>
            <div className="testimonial-author">
              <strong>Maria Silva</strong>
              <span>Síndica - Condomínio Jardim Paulista</span>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
            </div>
            <FaQuoteLeft className="quote-icon" />
            <p className="testimonial-text">
              "Como administradora, precisávamos de uma solução que pudesse gerenciar múltiplos condomínios. 
              O Cancella Flow superou nossas expectativas. Interface moderna e suporte excelente!"
            </p>
            <div className="testimonial-author">
              <strong>João Santos</strong>
              <span>Diretor - Santos Administradora</span>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
            </div>
            <FaQuoteLeft className="quote-icon" />
            <p className="testimonial-text">
              "A funcionalidade de portaria com QR code revolucionou nosso condomínio. 
              Mais segurança, menos papel e moradores muito mais satisfeitos com a modernização."
            </p>
            <div className="testimonial-author">
              <strong>Ana Costa</strong>
              <span>Síndica - Residencial Vista Mar</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action final */}
      <section className="cta-final">
        <div className="cta-final-content">
          <h2>Pronto para transformar a gestão do seu condomínio?</h2>
          <p>Junte-se a centenas de síndicos e administradoras que já simplificaram sua rotina.</p>
          <div className="cta-final-buttons">
            <a
              className="cta-primary cta-large"
              href="https://wa.me/5531991153035?text=Ol%C3%A1%20gostaria%20de%20saber%20mais%20sobre%20o%20Cancella%20Flow."
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir WhatsApp"
            >
              Fale com o consultor <FaWhatsapp style={{ marginLeft: 8 }} />
            </a>
          </div>
          <p className="cta-note">✓ Sem cartão de crédito • ✓ 14 dias grátis • ✓ Cancele quando quiser</p>
        </div>
      </section>

      {/* Footer público */}
      <footer className="public-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={logo} alt="Cancella Flow" className="footer-logo-img" />
            </div>
            <p>A solução completa para gestão de condomínios.</p>
          </div>
          <div className="footer-column">
            <h4>Produto</h4>
            <a href="#features">Funcionalidades</a>
            <a href="#pricing">Planos</a>
            <a href="#testimonials">Depoimentos</a>
          </div>
          <div className="footer-column">
            <h4>Suporte</h4>
            <a href="mailto:contato@cancellaflow.com.br">Contato</a>
            <a href="#">Central de Ajuda</a>
            <a href="#">FAQ</a>
          </div>
          <div className="footer-column">
            <h4>Legal</h4>
            <a href="#">Termos de Uso</a>
            <a href="#">Política de Privacidade</a>
            <a href="#">LGPD</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Cancella Flow — Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
