import React, { useRef, useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import '../../styles/GenericDropdown.css';

function GenericDropdown({ 
  isOpen = true, 
  onClose, 
  icon, 
  title, 
  children, 
  className = '', 
  closeOnClickOutside = true,
  showCloseButton = true,
  size = 'medium',
  position = 'center',
  triggerRef = null
}) {
  const dropdownRef = useRef(null);
  
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [rendered, setRendered] = useState(false);

  // Função para calcular e definir a posição do dropdown
  const setDropdownPosition = () => {
    if (!dropdownRef.current || !isOpen) return;
    
    // Se tivermos uma referência ao elemento acionador e a posição for 'relative'
    if (position === 'relative' && triggerRef?.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      
      // Posicionar diretamente abaixo do botão que acionou
      let top = triggerRect.bottom + 10; // 10px de margem
      
      // Alinhar à esquerda do botão
      const dropdownWidth = dropdownRef.current.offsetWidth;
      let left = triggerRect.left;
      
      // Verificar limites da tela
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      if (left + dropdownWidth > windowWidth - 20) {
        left = windowWidth - dropdownWidth - 20;
      }
      
      if (left < 20) {
        left = 20;
      }

      // Limitar altura disponível para o dropdown com base na viewport
      // Se faltar espaço abaixo, ajusta o topo para caber (abre "para cima" quando necessário)
      const approximateDropdownHeight = dropdownRef.current.offsetHeight || 400;
      if (top + approximateDropdownHeight > windowHeight - 10) {
        const newTop = windowHeight - approximateDropdownHeight - 10;
        top = Math.max(10, newTop);
      }

      // Aplicar posição fixa (sem limitar altura, deixa a página rolar naturalmente)
      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: 'none',
        zIndex: 200101
      });
    } else if (position === 'top') {
      // Não aplicar inline style - deixar o CSS controlar
      setDropdownStyle({});
    } else {
      // Posição centralizada (padrão) - deixar o CSS controlar completamente
      setDropdownStyle({});
    }
    
    setRendered(true);
  };

  // Configurar posição quando o componente é montado ou quando a janela é redimensionada/rolada
  useEffect(() => {
    if (isOpen) {
      // Pequeno timeout para garantir que o DOM foi atualizado
      const positionTimeout = setTimeout(() => {
        setDropdownPosition();
      }, 10);

      // Adicionar listener para redimensionamento da janela e scroll
      window.addEventListener('resize', setDropdownPosition);
      window.addEventListener('scroll', setDropdownPosition, true); // true = capture phase para pegar scroll em qualquer elemento

      // NÃO bloquear scroll do body - permitir que a página role normalmente

      return () => {
        clearTimeout(positionTimeout);
        window.removeEventListener('resize', setDropdownPosition);
        window.removeEventListener('scroll', setDropdownPosition, true);
      };
    }
  }, [isOpen, position, triggerRef]);

  // Manipulador de cliques fora do dropdown
  useEffect(() => {
    if (closeOnClickOutside && isOpen) {
      const handleClickOutside = (event) => {
        // Ignorar cliques em elementos Select ou seus componentes
        const reactSelectElements = document.querySelectorAll(
          '.react-select__menu, .react-select__menu-list, .react-select__option, .react-select__control, .react-select__indicators'
        );
        
        let clickedInsideSelect = false;
        reactSelectElements.forEach(element => {
          if (element && element.contains(event.target)) {
            clickedInsideSelect = true;
          }
        });
        
        if (clickedInsideSelect) {
          return;
        }
        
        // Verificar se clicou fora do dropdown e do elemento trigger
        if (dropdownRef.current && 
            !dropdownRef.current.contains(event.target) &&
            (!triggerRef?.current || !triggerRef.current.contains(event.target))) {
          onClose();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [onClose, closeOnClickOutside, isOpen, triggerRef]);

  if (!isOpen) return null;

  const dropdownSizeClass = `dropdown-${size}`;
  const dropdownPositionClass = `dropdown-position-${position}`;
  const hasSetPositionClass = rendered ? 'position-set' : '';

  return (
    <>
      {position !== 'relative' && (
        <div
          className="dropdown-overlay"
          onClick={closeOnClickOutside ? onClose : undefined}
        />
      )}
        
      <div 
        className={`generic-dropdown ${className} ${dropdownSizeClass} ${dropdownPositionClass} ${hasSetPositionClass}`}
        ref={dropdownRef}
        style={dropdownStyle}
      >
        <div className="dropdown-header">
          <div className="header-title">
            {icon && <span className="header-icon">{icon}</span>}
            <h2>{title}</h2>
          </div>
          {showCloseButton && (
            <button className="close-button" onClick={onClose}>
              <FaTimes />
            </button>
          )}
        </div>
        <div className="dropdown-content">
          {children}
        </div>
      </div>
    </>
  );
}

export default GenericDropdown;
