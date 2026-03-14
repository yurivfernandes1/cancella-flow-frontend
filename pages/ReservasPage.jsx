import React, { useState, useEffect } from 'react';
import { FaPlus, FaCalendar, FaTrash } from 'react-icons/fa';
import { espacoReservaAPI } from '../services/api';
import Header from '../components/Header/Header';
import GenericTable from '../components/GenericTable';
import ReservaModal from '../components/Reservas/ReservaModal';
import '../styles/ReservasPage.css';

export default function ReservasPage() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    carregarReservas();
  }, [currentPage]);

  const carregarReservas = async () => {
    try {
      setLoading(true);
      const resp = await espacoReservaAPI.list({ page: currentPage });
      const items = resp.data.results || resp.data || [];
      setReservas(items);
      setTotalPages(resp.data.num_pages || 1);
      setCurrentPage(resp.data.current_page || 1);
    } catch (err) {
      console.error('Erro ao carregar reservas:', err);
      setReservas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja cancelar esta reserva?')) return;
    try {
      await espacoReservaAPI.delete(id);
      alert('Reserva cancelada com sucesso!');
      carregarReservas();
    } catch (err) {
      console.error('Erro ao cancelar reserva:', err);
      alert('Erro ao cancelar reserva.');
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const colunas = [
    { 
      key: 'espaco_nome', 
      header: 'Espaço',
      width: '30%'
    },
    { 
      key: 'data_reserva', 
      header: 'Data',
      width: '25%',
      render: (value) => {
        const date = new Date(value + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { 
          weekday: 'short',
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    },
    { 
      key: 'valor_cobrado', 
      header: 'Valor',
      width: '15%',
      render: (value) => `R$ ${parseFloat(value || 0).toFixed(2)}`
    },
    {
      key: 'created_on',
      header: 'Criado em',
      width: '20%',
      render: (value) => formatDateTime(value)
    },
    { 
      key: 'status', 
      header: 'Status',
      width: '10%',
      render: (value) => (
        <span style={{
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: value === 'confirmada' ? '#dcfce7' : '#fee2e2',
          color: value === 'confirmada' ? '#15803d' : '#dc2626',
          display: 'inline-block'
        }}>
          {value === 'confirmada' ? 'Confirmada' : value === 'pendente' ? 'Pendente' : 'Cancelada'}
        </span>
      )
    },
    { 
      key: 'actions', 
      header: 'Ações',
      width: '10%',
      render: (value, row) => (
        <button
          type="button"
          onClick={() => handleDelete(row.id)}
          className="cancel-button"
          title="Cancelar reserva"
          style={{ padding: '6px 12px' }}
        >
          <FaTrash />
        </button>
      )
    }
  ];

  return (
    <div className="page-container">
      <Header />
      
      <div className="content-wrapper">
        <div className="page-header">
          <div>
            <h1><FaCalendar /> Minhas Reservas</h1>
            <p className="page-subtitle">Gerencie suas reservas de espaços do condomínio</p>
          </div>
          <button 
            className="button-primary" 
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Nova Reserva
          </button>
        </div>

        <div className="table-card">
          <GenericTable
            columns={colunas}
            data={reservas}
            loading={loading}
            totalPages={totalPages}
            currentPage={currentPage}
            onPageChange={(page) => setCurrentPage(page)}
            className="full-width-table allow-horizontal-scroll"
          />
        </div>
      </div>

      {showModal && (
        <ReservaModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            carregarReservas();
          }}
        />
      )}
    </div>
  );
}
