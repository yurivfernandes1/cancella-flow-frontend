import React, { useState } from 'react';
import { FaUsers, FaTimes, FaSave } from 'react-icons/fa';
import api from '../../services/api';
import GenericDropdown from '../common/GenericDropdown';

function AddGroupDropdown({ onClose, onSuccess, triggerRef }) {
  
  const [formData, setFormData] = useState({
    nome: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome) {
      setError('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await api.post('/access/groups/', formData);
      onSuccess('grupos');
      onClose();
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      let errorMessage = 'Erro ao criar grupo';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GenericDropdown
      title="Adicionar Novo Grupo"
      onClose={onClose}
      icon={<FaUsers />}
      className="add-group-dropdown"
      position="relative"
      size="medium"
      triggerRef={triggerRef}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Digite o nome do grupo"
            required
            autoFocus
          />
          <label htmlFor="nome">Nome do Grupo*</label>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            <FaTimes /> Cancelar
          </button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : <><FaSave /> Salvar</>}
          </button>
        </div>
      </form>
    </GenericDropdown>
  );
}

export default AddGroupDropdown;