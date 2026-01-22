import React, { useState } from 'react';
import { FaUserCog, FaTimes, FaSave } from 'react-icons/fa';
import api from '../../services/api';
import GenericDropdown from '../common/GenericDropdown';

function AddProfileDropdown({ onClose, onSuccess, triggerRef }) {
  
  const [formData, setFormData] = useState({
    nome: '',
    is_ativo: true // Mantemos como true por padrão, mas não exibimos mais a opção
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
      // Garantir que is_ativo sempre seja true ao criar
      await api.post('/access/profiles/create/', {
        ...formData,
        is_ativo: true
      });
      onSuccess('profiles');
      onClose();
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      let errorMessage = 'Erro ao criar perfil';
      
      if (error.response?.data?.detail) {
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
      title="Adicionar Novo Perfil"
      onClose={onClose}
      icon={<FaUserCog />}
      className="add-profile-dropdown"
  position="center"
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
            placeholder="Digite o nome do perfil"
            required
            autoFocus
          />
          <label htmlFor="nome">Nome do Perfil*</label>
        </div>
        
        {/* Removemos o checkbox de ativo */}
        
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

export default AddProfileDropdown;
