import React, { useState } from 'react';
import '../../styles/CalendarioReservas.css';

export default function CalendarioReservas({ 
  datasOcupadas = [], 
  onDateSelect, 
  selectedDate 
}) {
  const [viewDate, setViewDate] = useState(new Date());

  // Calcular limites: hoje até 1 ano em meses fechados
  const getDataLimites = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const umAnoFrente = new Date(hoje);
    umAnoFrente.setFullYear(umAnoFrente.getFullYear() + 1);
    
    // Ajustar para o último dia do mês
    const ultimoDiaMes = new Date(
      umAnoFrente.getFullYear(), 
      umAnoFrente.getMonth() + 1, 
      0
    );
    
    return { min: hoje, max: ultimoDiaMes };
  };

  const limites = getDataLimites();

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior (para preencher a grade)
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true });
    }
    
    return days;
  };

  const isDateOccupied = (day) => {
    if (!day) return false;
    const checkDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day
    );
    const dateStr = checkDate.toISOString().split('T')[0];
    return datasOcupadas.includes(dateStr);
  };

  const isDateDisabled = (day) => {
    if (!day) return true;
    const checkDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day
    );
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < limites.min || checkDate > limites.max;
  };

  const isDateSelected = (day) => {
    if (!day || !selectedDate) return false;
    const checkDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day
    );
    const selected = new Date(selectedDate);
    return checkDate.toDateString() === selected.toDateString();
  };

  const handleDateClick = (day) => {
    if (!day) return;
    
    const clickedDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day
    );
    
    if (isDateDisabled(day) || isDateOccupied(day)) {
      return;
    }
    
    onDateSelect?.(clickedDate);
  };

  const handlePrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const days = getDaysInMonth(viewDate);

  return (
    <div className="calendario-reservas">
      <div className="calendario-header">
        <button 
          type="button" 
          className="nav-button" 
          onClick={handlePrevMonth}
          disabled={viewDate.getMonth() === limites.min.getMonth() && viewDate.getFullYear() === limites.min.getFullYear()}
        >
          ‹
        </button>
        <h3 className="mes-ano">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h3>
        <button 
          type="button" 
          className="nav-button" 
          onClick={handleNextMonth}
          disabled={viewDate.getMonth() === limites.max.getMonth() && viewDate.getFullYear() === limites.max.getFullYear()}
        >
          ›
        </button>
      </div>

      <div className="calendario-grid">
        {dayNames.map(name => (
          <div key={name} className="dia-semana">{name}</div>
        ))}
        
        {days.map((item, index) => {
          const { day, isCurrentMonth } = item;
          const occupied = isDateOccupied(day);
          const disabled = isDateDisabled(day);
          const selected = isDateSelected(day);
          
          return (
            <div
              key={index}
              className={`dia-celula ${!isCurrentMonth ? 'outro-mes' : ''} ${
                occupied ? 'ocupado' : ''
              } ${disabled ? 'desabilitado' : ''} ${selected ? 'selecionado' : ''}`}
              onClick={() => handleDateClick(day)}
              title={
                occupied ? 'Data já reservada' :
                disabled ? 'Data indisponível' :
                'Clique para reservar'
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="legenda-calendario">
        <div className="legenda-item">
          <div className="legenda-cor disponivel"></div>
          <span>Disponível</span>
        </div>
        <div className="legenda-item">
          <div className="legenda-cor ocupado"></div>
          <span>Ocupado</span>
        </div>
        <div className="legenda-item">
          <div className="legenda-cor desabilitado"></div>
          <span>Indisponível</span>
        </div>
      </div>
    </div>
  );
}
