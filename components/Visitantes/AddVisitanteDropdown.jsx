import React, { useState } from 'react';
import { FaCar, FaClock, FaEnvelope, FaIdCard, FaQrcode, FaUser, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { visitanteAPI } from '../../services/api';
import { validatePlaca, normalizePlaca, maskPlaca, formatPlaca } from '../../utils/placaValidator';
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
    is_permanente: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'placa_veiculo') {
      setFormData(prev => ({ ...prev, [name]: maskPlaca(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.documento || !formData.data_entrada) {
      setError('Preencha os campos obrigatórios: Nome, Documento e Data de Entrada.');
      return;
    }
    if (formData.placa_veiculo && !validatePlaca(formData.placa_veiculo)) {
      setError('Placa inválida. Use o formato ABC-1234 ou ABC1D23.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const resp = await visitanteAPI.create({
        ...formData,
        placa_veiculo: formData.placa_veiculo ? normalizePlaca(formData.placa_veiculo) : null,
        morador_id: user.id,
        data_entrada: new Date(formData.data_entrada).toISOString(),
      });
      // Enviar QR por e-mail automaticamente se e-mail foi informado
      if (formData.email && resp?.data?.id) {
        visitanteAPI.enviarQrCode(resp.data.id).catch(() => {});
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar visitante. Tente novamente.');
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
      icon={<FaUserPlus size={16} />}
      size="medium"
      position="center"
      triggerRef={triggerRef}
    >
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
          borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Nome */}
        <div className="form-field">
          <label><FaUser size={10} style={{ marginRight: 4 }} />Nome do Visitante *</label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Nome completo"
            required
            autoFocus
          />
        </div>

        {/* Documento + E-mail */}
        <div className="form-row">
          <div className="form-field">
            <label><FaIdCard size={10} style={{ marginRight: 4 }} />Documento *</label>
            <input
              type="text"
              name="documento"
              value={formData.documento}
              onChange={handleChange}
              placeholder="CPF, RG ou outro"
              required
            />
          </div>
          <div className="form-field">
            <label><FaEnvelope size={10} style={{ marginRight: 4 }} />E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="visitante@email.com"
            />
          </div>
        </div>

        {/* Hint QR */}
        {formData.email && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 7, padding: '7px 12px', marginTop: -12, marginBottom: '1.1rem',
            fontSize: '0.78rem', color: '#15803d',
          }}>
            <FaQrcode size={13} />
            O QR Code de acesso será enviado automaticamente para este e-mail.
          </div>
        )}

        {/* Data de Entrada */}
        <div className="form-field">
          <label><FaClock size={10} style={{ marginRight: 4 }} />Data/Hora de Entrada *</label>
          <input
            type="datetime-local"
            name="data_entrada"
            value={formData.data_entrada}
            onChange={handleChange}
            required
          />
        </div>

        {/* Placa */}
        <div className="form-field">
          <label><FaCar size={10} style={{ marginRight: 4 }} />Placa do Veículo</label>
          <input
            type="text"
            name="placa_veiculo"
            value={formData.placa_veiculo}
            onChange={handleChange}
            placeholder="ABC-1234 ou ABC1D23 (opcional)"
            maxLength={8}
            style={{
              borderColor: isPlacaValid === false ? '#dc2626' : isPlacaValid === true ? '#2abb98' : undefined,
              borderWidth: isPlacaValid !== null ? 2 : undefined,
            }}
          />
          {isPlacaValid === false && (
            <small style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 3, display: 'block' }}>
              Formato inválido. Use ABC-1234 ou ABC1D23
            </small>
          )}
          {isPlacaValid === true && (
            <small style={{ color: '#2abb98', fontSize: '0.78rem', marginTop: 3, display: 'block' }}>
              ✓ {formatPlaca(formData.placa_veiculo)}
            </small>
          )}
        </div>

        {/* Permanente */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f8fafc', border: '1px solid #e5e7eb',
          borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#19294a' }}>Visitante Permanente</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
              {formData.is_permanente
                ? 'QR Code será válido em múltiplas entradas'
                : 'QR Code expira após a primeira entrada'}
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="is_permanente"
              checked={formData.is_permanente}
              onChange={handleChange}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              display: 'inline-block', width: 40, height: 22,
              background: formData.is_permanente ? '#2abb98' : '#d1d5db',
              borderRadius: 999, transition: 'background 0.2s', position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: 3, left: formData.is_permanente ? 21 : 3,
                width: 16, height: 16, background: '#fff', borderRadius: '50%',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="button-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="button-primary">
            {loading ? 'Cadastrando...' : 'Cadastrar Visitante'}
          </button>
        </div>
      </form>
    </GenericDropdown>
  );
}

export default AddVisitanteDropdown;
