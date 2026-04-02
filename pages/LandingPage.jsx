import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaAddressCard,
  FaBell,
  FaCar,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
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
  const featureItems = [
    {
      id: 'veiculos',
      icon: <FaCar />,
      title: 'Controle de Veiculos',
      description: 'Cadastro de veiculos, controle de autorizacoes e validacao de placas.',
    },
    {
      id: 'acessos',
      icon: <FaQrcode />,
      title: 'Controle de Acessos',
      description: 'Liberacao por QR Code, registros em tempo real e rastreabilidade de entradas e saidas.',
    },
    {
      id: 'equipes',
      icon: <FaUsers />,
      title: 'Funcionarios e Equipes',
      description: 'Cadastro da equipe operacional, funcoes por evento e historico de atuacao por colaborador.',
    },
    {
      id: 'encomendas',
      icon: <FaClipboardList />,
      title: 'Controle de Encomendas',
      description: 'Registro automatico, notificacoes por SMS/email e historico completo de entregas.',
    },
    {
      id: 'avisos',
      icon: <FaBell />,
      title: 'Avisos e Comunicados',
      description: 'Envie avisos segmentados por blocos, unidades ou para todo o condominio.',
    },
    {
      id: 'listas',
      icon: <FaClipboardList />,
      title: 'Listas de Convidados',
      description: 'Listas por evento, convidados VIP, validacao por nome e QR, com status de entrada em tempo real.',
    },
    {
      id: 'portaria',
      icon: <FaUserShield />,
      title: 'Portaria Inteligente',
      description: 'Fluxo moderno para portaria com notificacoes automaticas e integracao com moradores.',
    },
    {
      id: 'cerimonial',
      icon: <FaQrcode />,
      title: 'Modulo Cerimonial',
      description: 'Eventos, convites, equipe de recepcao e operacao do evento com check-in, checkout e ponto.',
    },
    {
      id: 'areas-comuns',
      icon: <FaGlassCheers />,
      title: 'Gestao de Areas Comuns',
      description: 'Reservas e regras para areas comuns, com calendario compartilhado e controle de acessos.',
    },
    {
      id: 'visitantes',
      icon: <FaAddressCard />,
      title: 'Visitantes e Moradores',
      description: 'Cadastro completo, controle de autorizacoes e historico de visitas detalhado.',
    },
  ];

  const [cardsPerView, setCardsPerView] = useState(3);
  const [featureIndex, setFeatureIndex] = useState(0);

  const getCardsPerView = (viewportWidth) => {
    if (viewportWidth <= 768) return 1;
    return 3;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setCardsPerView(getCardsPerView(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalFeaturePositions = Math.max(1, featureItems.length - cardsPerView + 1);

  useEffect(() => {
    setFeatureIndex((prev) => Math.min(prev, totalFeaturePositions - 1));
  }, [totalFeaturePositions]);

  const goToPrevFeature = () => {
    setFeatureIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToNextFeature = () => {
    setFeatureIndex((prev) => Math.min(prev + 1, totalFeaturePositions - 1));
  };

  return (
    <div className="landing-root">
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
              aria-label="Instagram Cancella Flow"
              title="Instagram Cancella Flow"
            >
              <FaInstagram />
            </a>
            <Link className="nav-link nav-login" to="/login">Entrar</Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-tag">🏢 A melhor solucao para sindicos e administradoras</div>
          <h1>Transforme a gestao do seu condominio</h1>
          <p>
            Plataforma completa e intuitiva para administrar seu condominio.
            Portaria, controle de acessos, equipe de recepcao, listas de convidados,
            modulo de cerimonial, reservas e comunicacao em um so painel.
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
              <strong>+150</strong> Condominios
            </div>
            <div className="stat-item">
              <strong>+8k</strong> Moradores
            </div>
            <div className="stat-item">
              <strong>4.9/5</strong> Avaliacao
            </div>
            <div className="stat-item">
              <FaInstagram style={{ color: '#2abb98' }} /> cancellaflow
            </div>
          </div>
        </div>
      </section>

      <section className="social-proof">
        <div className="social-proof-content">
          <p className="social-proof-text">
            Confiado por <strong>sindicos e administradoras</strong> em todo o Brasil
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
              <span>Atualizacoes constantes</span>
            </div>
            <a
              className="trust-item trust-item-link"
              href="https://instagram.com/cancellaflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram className="trust-icon" />
              <span>Siga cancellaflow</span>
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="section-header">
          <h2>Tudo que voce precisa, em um so lugar</h2>
          <p className="section-subtitle">
            O Cancella Flow centraliza as rotinas do condominio e dos eventos com seguranca e eficiencia.
          </p>
        </div>

        <div className="features-slider-shell" aria-label="Controles do slider de funcionalidades">
          <button
            type="button"
            className={`slider-arrow slider-arrow-side slider-arrow-left ${featureIndex === 0 ? 'is-disabled' : ''}`}
            onClick={goToPrevFeature}
            disabled={featureIndex === 0}
            aria-label="Card anterior"
          >
            <FaChevronLeft />
          </button>

          <div className="features-slider">
            <div className="features-slider-viewport">
              <div
                className="features-slider-track"
                style={{
                  width: `${(featureItems.length / cardsPerView) * 100}%`,
                  transform: `translateX(-${(featureIndex * 100) / featureItems.length}%)`,
                }}
              >
                {featureItems.map((feature) => (
                  <div
                    className="feature-slide"
                    key={feature.id}
                    style={{ width: `${100 / featureItems.length}%` }}
                  >
                    <div className="feature-card">
                      <div className="feature-icon">{feature.icon}</div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="features-dots" role="tablist" aria-label="Posicoes do slider de funcionalidades">
              {Array.from({ length: totalFeaturePositions }, (_, index) => (
                <button
                  key={`feature-position-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={featureIndex === index}
                  aria-label={`Ir para posicao ${index + 1}`}
                  className={`features-dot ${featureIndex === index ? 'is-active' : ''}`}
                  onClick={() => setFeatureIndex(index)}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`slider-arrow slider-arrow-side slider-arrow-right ${featureIndex === totalFeaturePositions - 1 ? 'is-disabled' : ''}`}
            onClick={goToNextFeature}
            disabled={featureIndex === totalFeaturePositions - 1}
            aria-label="Proximo card"
          >
            <FaChevronRight />
          </button>
        </div>
      </section>

      <section id="cerimonial-suite" className="event-suite">
        <div className="section-header">
          <h2>Cerimonial e recepcao com operacao completa</h2>
          <p className="section-subtitle">
            Planeje, monte equipe, valide convidados e acompanhe o evento com controle total de acessos.
          </p>
        </div>

        <div className="event-suite-grid">
          <article className="event-suite-card">
            <h3>1. Planejamento do evento</h3>
            <ul>
              <li>Cadastro de evento com data, local e capacidade</li>
              <li>Vinculacao de organizadores e equipe de recepcao</li>
              <li>Contato rapido com o cerimonial durante a operacao</li>
            </ul>
          </article>

          <article className="event-suite-card">
            <h3>2. Lista e confirmacao de convidados</h3>
            <ul>
              <li>Lista unica por evento com historico para eventos futuros</li>
              <li>RSVP por link e QR Code por convidado</li>
              <li>Entrada validada por QR ou nome completo</li>
            </ul>
          </article>

          <article className="event-suite-card">
            <h3>3. Operacao da recepcao</h3>
            <ul>
              <li>Check-in e checkout da equipe para controle de horas</li>
              <li>Um evento ativo por vez para reduzir falhas operacionais</li>
              <li>Consulta da lista apenas durante o evento, com CPF mascarado</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="testimonials" className="testimonials">
        <div className="section-header">
          <h2>O que nossos clientes dizem</h2>
          <p className="section-subtitle">
            Sindicos e administradoras que ja transformaram a gestao dos seus condominios.
          </p>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
            </div>
            <FaQuoteLeft className="quote-icon" />
            <p className="testimonial-text">
              "Antes gastavamos horas organizando planilhas e enviando avisos. Com o Cancella Flow,
              tudo ficou automatizado. Economizamos tempo e os moradores estao muito mais satisfeitos."
            </p>
            <div className="testimonial-author">
              <strong>Maria Silva</strong>
              <span>Sindica - Condominio Jardim Paulista</span>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
            </div>
            <FaQuoteLeft className="quote-icon" />
            <p className="testimonial-text">
              "Como administradora, precisavamos de uma solucao que pudesse gerenciar multiplos condominios.
              O Cancella Flow superou nossas expectativas. Interface moderna e suporte excelente!"
            </p>
            <div className="testimonial-author">
              <strong>Joao Santos</strong>
              <span>Diretor - Santos Administradora</span>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">
              <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
            </div>
            <FaQuoteLeft className="quote-icon" />
            <p className="testimonial-text">
              "A funcionalidade de portaria com QR code revolucionou nosso condominio.
              Mais seguranca, menos papel e moradores muito mais satisfeitos com a modernizacao."
            </p>
            <div className="testimonial-author">
              <strong>Ana Costa</strong>
              <span>Sindica - Residencial Vista Mar</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-final">
        <div className="cta-final-content">
          <h2>Pronto para transformar a gestao do seu condominio?</h2>
          <p>Junte-se a centenas de sindicos e administradoras que ja simplificaram sua rotina.</p>
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
          <p className="cta-note">✓ Sem cartao de credito • ✓ 14 dias gratis • ✓ Cancele quando quiser</p>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={logo} alt="Cancella Flow" className="footer-logo-img" />
            </div>
            <p>A solucao completa para gestao de condominios.</p>
          </div>
          <div className="footer-column">
            <h4>Produto</h4>
            <a href="#features">Funcionalidades</a>
            <a href="#cerimonial-suite">Modulo Cerimonial</a>
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
            <a href="#">Politica de Privacidade</a>
            <a href="#">LGPD</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Cancella Flow - Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
