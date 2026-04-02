import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaAddressCard,
  FaBell,
  FaCar,
  FaCheckCircle,
  FaClipboardList,
  FaGlassCheers,
  FaInstagram,
  FaQrcode,
  FaQuoteLeft,
  FaStar,
  FaUserShield,
  FaUsers,
  FaWhatsapp,
} from 'react-icons/fa';
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
            <a className="nav-link" href="#cerimonial-suite">Cerimonial</a>
            <a className="nav-link" href="#testimonials">Depoimentos</a>
            <a
              className="nav-link"
              href="https://instagram.com/cancellaflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              @cancellaflow
            </a>
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
            Portaria, controle de acessos, equipe de recepção, listas de convidados,
            módulo de cerimonial, reservas e comunicação em um só painel.
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
            <div className="stat-item">
              <FaInstagram style={{ color: '#2abb98' }} /> @cancellaflow
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
            <a
              className="trust-item trust-item-link"
              href="https://instagram.com/cancellaflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram className="trust-icon" />
              <span>Siga @cancellaflow</span>
            </a>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="features" className="features">
        <div className="section-header">
          <h2>Tudo que você precisa, em um só lugar</h2>
          <p className="section-subtitle">
            O Cancella Flow centraliza as rotinas do condomínio e dos eventos com segurança e eficiência.
          </p>
        </div>
          <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><FaCar /></div>
            <h3>Controle de Veículos</h3>
            <p>Cadastro de veículos, controle de autorizações e validação de placas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaQrcode /></div>
            <h3>Controle de Acessos</h3>
            <p>Liberação por QR Code, registros em tempo real e rastreabilidade de entradas e saídas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaUsers /></div>
            <h3>Funcionários e Equipes</h3>
            <p>Cadastro da equipe operacional, funções por evento e histórico de atuação por colaborador.</p>
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
            <h3>Listas de Convidados</h3>
            <p>Listas por evento, convidados VIP, validação por nome e QR, com status de entrada em tempo real.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaUserShield /></div>
            <h3>Portaria Inteligente</h3>
            <p>Fluxo moderno para portaria com notificações automáticas e integração com moradores.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><FaQrcode /></div>
            <h3>Módulo Cerimonial</h3>
            <p>Eventos, convites, equipe de recepção e operação do evento com check-in, checkout e ponto.</p>
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

      <section id="cerimonial-suite" className="event-suite">
        <div className="section-header">
          <h2>Cerimonial e recepção com operação completa</h2>
          <p className="section-subtitle">
            Planeje, monte equipe, valide convidados e acompanhe o evento com controle total de acessos.
          </p>
        </div>

        <div className="event-suite-grid">
          <article className="event-suite-card">
            <h3>1. Planejamento do evento</h3>
            <ul>
              <li>Cadastro de evento com data, local e capacidade</li>
              <li>Vinculação de organizadores e equipe de recepção</li>
              <li>Contato rápido com o cerimonial durante a operação</li>
            </ul>
          </article>

          <article className="event-suite-card">
            <h3>2. Lista e confirmação de convidados</h3>
            <ul>
              <li>Lista única por evento com histórico para eventos futuros</li>
              <li>RSVP por link e QR Code por convidado</li>
              <li>Entrada validada por QR ou nome completo</li>
            </ul>
          </article>

          <article className="event-suite-card">
            <h3>3. Operação da recepção</h3>
            <ul>
              <li>Check-in e checkout da equipe para controle de horas</li>
              <li>Um evento ativo por vez para reduzir falhas operacionais</li>
              <li>Consulta da lista apenas durante o evento, com CPF mascarado</li>
            </ul>
          </article>
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
            <a href="#cerimonial-suite">Módulo Cerimonial</a>
            <a href="#testimonials">Depoimentos</a>
          </div>
          <div className="footer-column">
            <h4>Suporte</h4>
            <a href="mailto:contato@cancellaflow.com.br">Contato</a>
            <a href="https://instagram.com/cancellaflow" target="_blank" rel="noopener noreferrer">Instagram @cancellaflow</a>
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
