import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaBox,
  FaBuilding,
  FaCalendarCheck,
  FaCheckCircle,
  FaClipboardList,
  FaIdBadge,
  FaIdCard,
  FaMobileAlt,
  FaQrcode,
  FaShieldAlt,
  FaUsers,
  FaCar,
} from 'react-icons/fa';
import logo from '../assets/logo_header.svg';
import '../styles/FlowIntroPage.css';

const STEP_DURATION_MS = 2350;

const FEATURE_STEPS = [
  {
    id: 'condominio',
    icon: FaBuilding,
    title: 'Gestao completa do condominio',
    subtitle: 'Cadastro de condominio, unidades e moradores em um unico fluxo.',
    bullets: ['Meu Condominio', 'Unidades e Moradores', 'Perfis por grupo'],
  },
  {
    id: 'gestao-usuarios',
    icon: FaUsers,
    title: 'Gestao de usuarios e grupos',
    subtitle: 'Permissoes por papel para sindico, portaria, admin e equipes.',
    bullets: ['Grupos e papeis', 'Controle de acesso', 'Operacao segura'],
  },
  {
    id: 'visitantes',
    icon: FaIdCard,
    title: 'Portaria inteligente para visitantes',
    subtitle: 'Cadastro, autorizacao e historico detalhado de entradas e saidas.',
    bullets: ['Visitantes', 'Moradores', 'Rastreabilidade'],
  },
  {
    id: 'veiculos',
    icon: FaCar,
    title: 'Controle de veiculos e placas',
    subtitle: 'Valida veiculos cadastrados e reforca seguranca na rotina de acesso.',
    bullets: ['Veiculos cadastrados', 'Placas validadas', 'Consulta rapida'],
  },
  {
    id: 'encomendas',
    icon: FaBox,
    title: 'Recebimento e entrega de encomendas',
    subtitle: 'Registro da chegada, status de retirada e historico por unidade.',
    bullets: ['Entrada de pacote', 'Historico completo', 'Notificacao ao morador'],
  },
  {
    id: 'eventos-reservas',
    icon: FaCalendarCheck,
    title: 'Eventos e reservas de espacos',
    subtitle: 'Organiza agenda do condominio e evita conflitos de reservas.',
    bullets: ['Eventos', 'Reservas', 'Minhas Reservas'],
  },
  {
    id: 'lista-convidados',
    icon: FaClipboardList,
    title: 'Lista de convidados em tempo real',
    subtitle: 'Operacao de lista por evento com check-in e status ao vivo.',
    bullets: ['Lista por evento', 'Confirmacao de entrada', 'Suporte operacional'],
  },
  {
    id: 'qr',
    icon: FaQrcode,
    title: 'Acesso por QR Code',
    subtitle: 'Validacao agil para moradores, convidados e operacao de evento.',
    bullets: ['QR individual', 'Leitura imediata', 'Mais velocidade na portaria'],
  },
  {
    id: 'avisos-ocorrencias',
    icon: FaBell,
    title: 'Avisos e ocorrencias centralizados',
    subtitle: 'Comunicacao interna e registro administrativo em um painel unificado.',
    bullets: ['Avisos segmentados', 'Ocorrencias', 'Acompanhamento'],
  },
  {
    id: 'cerimonial',
    icon: FaIdBadge,
    title: 'Suite de cerimonial e recepcao',
    subtitle: 'Organizador, cerimonialista e recepcao no mesmo ecossistema de evento.',
    bullets: ['Organizadores', 'Funcionarios e funcoes', 'Recepcao operacional'],
  },
  {
    id: 'seguranca',
    icon: FaShieldAlt,
    title: 'Fluxos seguros e confiaveis',
    subtitle: 'Controle de sessao, papeis de acesso e trilha de operacao diaria.',
    bullets: ['Acesso autenticado', 'Permissoes por contexto', 'Registros operacionais'],
  },
  {
    id: 'mobile',
    icon: FaMobileAlt,
    title: 'Experiencia moderna em qualquer dispositivo',
    subtitle: 'Interface responsiva para portaria, administracao e uso no dia a dia.',
    bullets: ['Desktop e tablet', 'Mobile otimizado', 'Fluxo continuo'],
  },
];

function FlowIntroPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const totalSteps = FEATURE_STEPS.length;

  const resolveDestination = () => {
    if (typeof window === 'undefined') return '/home';
    return window.matchMedia('(max-width: 767px)').matches ? '/links' : '/home';
  };

  const goNext = () => {
    navigate(resolveDestination(), { replace: true });
  };

  useEffect(() => {
    if (activeStep >= totalSteps - 1) {
      const redirectTimer = window.setTimeout(() => {
        goNext();
      }, 1100);
      return () => window.clearTimeout(redirectTimer);
    }

    const timer = window.setTimeout(() => {
      setActiveStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }, STEP_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeStep, totalSteps]);

  const currentStep = FEATURE_STEPS[activeStep];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="flow-intro-root">
      <main className="flow-intro-shell" aria-live="polite">
        <header className="flow-intro-header">
          <img src={logo} alt="Cancella Flow" className="flow-intro-logo" />
        </header>

        <section className="flow-intro-stage">

          <div className="flow-intro-card" key={currentStep.id}>
            <div className="flow-intro-card-icon" aria-hidden="true">
              <CurrentIcon />
            </div>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.subtitle}</p>

            <ul className="flow-intro-bullets">
              {currentStep.bullets.map((item) => (
                <li key={item}>
                  <FaCheckCircle />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

export default FlowIntroPage;