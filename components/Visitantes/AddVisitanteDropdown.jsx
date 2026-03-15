import React, { useState } from 'react';
import { FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { validatePlaca, formatPlaca, normalizePlaca, maskPlaca } from '../../utils/placaValidator';
import GenericDropdown from '../common/GenericDropdown';
import '../../styles/GenericDropdown.css';

function AddVisitanteDropdown({ onClose, onSuccess, triggerRef }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    documento: '',
    email: '',
    data_entrada: '',
    placa_veiculo: '',
    is_permanente: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'placa_veiculo') {
      // Aplicar máscara na placa
      const masked = maskPlaca(value);
      setFormData(prev => ({
        ...prev,
        [name]: masked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.documento || !formData.data_entrada) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar placa se foi preenchida
    if (formData.placa_veiculo && !validatePlaca(formData.placa_veiculo)) {
      setError('Placa inválida. Use o formato ABC-1234 (antigo) ou ABC1D23 (Mercosul).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // morador_id será o próprio usuário (morador) ou pode ser especificado por admin
      const payload = {
        ...formData,
        placa_veiculo: formData.placa_veiculo ? normalizePlaca(formData.placa_veiculo) : null,
        morador_id: user.id,
        data_entrada: new Date(formData.data_entrada).toISOString()
      };

      await api.post('/cadastros/visitantes/create/', payload);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar visitante:', error);
      setError(error.response?.data?.error || 'Erro ao criar visitante');
    } finally {
      setLoading(false);
    }
  };

  const isPlacaValid = formData.placa_veiculo ? validatePlaca(formData.placa_veiculo) : null;

  return (
    <GenericDropdown
      isOpen={true}
      onClose={onClose}
      title="Adicionar Visitante"
      icon={<FaUserPlus size={18} />}
      size="medium"
  position="center"
      triggerRef={triggerRef}
    >
      {error && <div className="error-message" style={{ marginBottom: '1rem', color: '#dc2626', fontSize: '0.9rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Nome do Visitante *</label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Nome completo"
            required
          />
        </div>

        <div className="form-field">
          <label>Documento (CPF/RG) *</label>
          <input
            type="text"
            name="documento"
            value={formData.documento}
            onChange={handleChange}
            placeholder="CPF, RG ou outro documento"
            required
          />
        </div>

        <div className="form-field">
          <label>E-mail (Opcional)</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Para envio do QR Code"
          />
        </div>

        <div className="form-field">
          <label>Placa do Veículo (Opcional)</label>
          <input
            type="text"
            name="placa_veiculo"
            value={formData.placa_veiculo}
            onChange={handleChange}
            placeholder="ABC-1234 ou ABC1D23"
            maxLength={8}
            style={{
              borderColor: isPlacaValid === null ? '#ccc' : isPlacaValid ? '#2abb98' : '#dc2626',
              borderWidth: isPlacaValid !== null ? '2px' : '1px'
            }}
          />
          {isPlacaValid === false && (
            <small style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
              Formato inválido. Use ABC-1234 ou ABC1D23
            </small>
          )}
          {isPlacaValid === true && (
            <small style={{ color: '#2abb98', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
              ✓ Placa válida: {formatPlaca(formData.placa_veiculo)}
            </small>
          )}
        </div>

        <div className="form-field">
          <label>Data/Hora de Entrada *</label>
          <input
            type="datetime-local"
            name="data_entrada"
            value={formData.data_entrada}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-field" style={{ marginBottom: '0.5rem' }}>
          <label style={{ position: 'relative', top: 'auto', left: 'auto', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_permanente"
              checked={formData.is_permanente}
              onChange={handleChange}
              style={{ width: 'auto', height: 'auto', margin: 0 }}
            />
            <span>Visitante Permanente</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="button-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="button-primary">
            {loading ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </form>
    </GenericDropdown>
  );
}

export default AddVisitanteDropdown;
