import React, { useState } from 'react';
import { FaCar } from 'react-icons/fa';
import api from '../../services/api';
import { validatePlaca, formatPlaca, normalizePlaca, maskPlaca } from '../../utils/placaValidator';
import GenericDropdown from '../common/GenericDropdown';
import '../../styles/GenericDropdown.css';

function AddVeiculoDropdown({ onClose, onSuccess, triggerRef }) {
  
  const [formData, setFormData] = useState({
    placa: '',
    marca_modelo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'placa') {
      // Aplicar máscara na placa
      const masked = maskPlaca(value);
      setFormData(prev => ({
        ...prev,
        [name]: masked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.placa || !formData.marca_modelo) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // DEBUG: log placa e validação
    console.log('[DEBUG] Placa antes validação:', JSON.stringify(formData.placa));
    console.log('[DEBUG] validatePlaca result:', validatePlaca(formData.placa));

    // Validar placa
    if (!validatePlaca(formData.placa)) {
      setError('Placa inválida. Use o formato ABC-1234 (antigo) ou ABC1D23 (Mercosul).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        placa: normalizePlaca(formData.placa),
        marca_modelo: formData.marca_modelo
      };

      await api.post('/cadastros/veiculos/create/', payload);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar veículo:', error);
      setError(error.response?.data?.error || 'Erro ao criar veículo');
    } finally {
      setLoading(false);
    }
  };

  const isPlacaValid = formData.placa ? validatePlaca(formData.placa) : null;

  return (
    <GenericDropdown
      isOpen={true}
      onClose={onClose}
      title="Adicionar Veículo"
      icon={<FaCar size={18} />}
      size="medium"
  position="center"
      triggerRef={triggerRef}
    >
      {error && <div className="error-message" style={{ marginBottom: '1rem', color: '#dc2626', fontSize: '0.9rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Placa do Veículo *</label>
          <input
            type="text"
            name="placa"
            value={formData.placa}
            onChange={handleChange}
            placeholder="ABC-1234 ou ABC1D23"
            maxLength={8}
            required
            style={{
              borderColor: isPlacaValid === null ? '#ccc' : isPlacaValid ? '#2abb98' : '#dc2626',
              borderWidth: isPlacaValid !== null ? '2px' : '1px'
            }}
          />
          {isPlacaValid === false && (
            <small style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Formato inválido. Use ABC-1234 ou ABC1D23
            </small>
          )}
          {isPlacaValid === true && (
            <small style={{ color: '#2abb98', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              ✓ Placa válida: {formatPlaca(formData.placa)}
            </small>
          )}
        </div>

        <div className="form-field">
          <label>Marca e Modelo *</label>
          <input
            type="text"
            name="marca_modelo"
            value={formData.marca_modelo}
            onChange={handleChange}
            placeholder="Ex: Toyota Corolla"
            required
          />
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

export default AddVeiculoDropdown;
