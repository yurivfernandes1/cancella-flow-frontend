import React, { useState } from 'react';
import { FaSave, FaTimes, FaPlus, FaUpload } from 'react-icons/fa';
import { condominioAPI } from '../../services/api';
import GenericDropdown from '../common/GenericDropdown';
import { validateCEP, formatCEP, fetchCEPData } from '../../utils/validators';

function AddCondominioDropdown({ onClose, onSuccess, triggerRef }) {
  
  const [formData, setFormData] = useState({
    nome: '',
    cep: '',
    numero: '',
    complemento: '',
    cnpj: '',
    telefone: '',
    is_ativo: true,
    logo: null
  });
  
  const [showDropdown, setShowDropdown] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [addressData, setAddressData] = useState(null);
  const [loadingCep, setLoadingCep] = useState(false);
  // Removemos a pré-visualização para simplificar o layout

  const buscarCep = async (cep) => {
    if (!validateCEP(cep)) {
      setAddressData(null);
      return;
    }

    setLoadingCep(true);
    const result = await fetchCEPData(cep);
    setLoadingCep(false);

    if (result.success) {
      setAddressData(result.data);
      setValidationErrors(prev => ({ ...prev, cep: 'valid' }));
    } else {
      setAddressData(null);
      setValidationErrors(prev => ({ ...prev, cep: 'invalid' }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validação em tempo real
    const errors = { ...validationErrors };
    
    if (field === 'cep') {
      const cepLimpo = value.replace(/\D/g, '');
      if (validateCEP(cepLimpo)) {
        buscarCep(cepLimpo);
      } else {
        setAddressData(null);
        if (cepLimpo.length > 0) {
          errors.cep = 'invalid';
        } else {
          delete errors.cep;
        }
      }
    }
    
    if (field === 'cnpj') {
      if (value && !validateCNPJ(value)) {
        errors.cnpj = 'invalid';
      } else if (value && validateCNPJ(value)) {
        errors.cnpj = 'valid';
      } else {
        delete errors.cnpj;
      }
    }
    
    if (field === 'telefone') {
      if (value && !validateTelefone(value)) {
        errors.telefone = 'invalid';
      } else if (value && validateTelefone(value)) {
        errors.telefone = 'valid';
      } else {
        delete errors.telefone;
      }
    }
    
    setValidationErrors(errors);
  };

  const formatCNPJ = (value) => {
    // Remove todos os caracteres não numéricos
    const cleanValue = value.replace(/\D/g, '');
    
    // Aplica a máscara de CNPJ: XX.XXX.XXX/XXXX-XX
    return cleanValue
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18); // Limita o tamanho
  };

  const validateCNPJ = (cnpj) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return false;
    
    // Validação básica de CNPJ
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    
    return true;
  };

  const formatTelefone = (value) => {
    // Remove todos os caracteres não numéricos
    const cleanValue = value.replace(/\D/g, '');
    
    // Aplica a máscara de telefone: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (cleanValue.length <= 10) {
      return cleanValue
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return cleanValue
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    }
  };

  const validateTelefone = (telefone) => {
    const cleanTelefone = telefone.replace(/\D/g, '');
    return cleanTelefone.length >= 10 && cleanTelefone.length <= 11;
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFormData(prev => ({ ...prev, logo: null }));
      return;
    }

    const validTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Formato inválido! Use PNG, JPG, JPEG ou SVG.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Arquivo muito grande! Máximo 2MB.');
      e.target.value = '';
      return;
    }

    // Simplificação: sem preview; validações mínimas (dimensão já garantida pelo backend)
    setFormData(prev => ({ ...prev, logo: file }));
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: null }));
    const fileInput = document.getElementById('logo-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validações básicas
      if (!formData.nome.trim()) {
        alert('Nome do condomínio é obrigatório');
        return;
      }

      if (!formData.cep.trim()) {
        alert('CEP é obrigatório');
        return;
      }

      const cepLimpo = formData.cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        alert('CEP inválido');
        return;
      }

      if (!formData.numero.trim()) {
        alert('Número do endereço é obrigatório');
        return;
      }

      // Validar CNPJ se preenchido
      if (formData.cnpj && !validateCNPJ(formData.cnpj)) {
        alert('CNPJ inválido');
        return;
      }

      // Validar telefone se preenchido
      if (formData.telefone && !validateTelefone(formData.telefone)) {
        alert('Telefone inválido');
        return;
      }

      // Preparar dados para envio usando FormData para suportar upload de arquivos
      const formDataToSend = new FormData();
      formDataToSend.append('nome', formData.nome.trim());
      formDataToSend.append('cep', cepLimpo);
      formDataToSend.append('numero', formData.numero.trim());
      formDataToSend.append('complemento', formData.complemento.trim());
      formDataToSend.append('cnpj', formData.cnpj ? formData.cnpj.replace(/\D/g, '') : '');
      formDataToSend.append('telefone', formData.telefone ? formData.telefone.replace(/\D/g, '') : '');
      formDataToSend.append('is_ativo', 'true');
      
      // Adicionar logo se houver
      if (formData.logo) {
        formDataToSend.append('logo', formData.logo);
      }

      console.log('Criando condomínio com logo');
      
      const response = await condominioAPI.create(formDataToSend);
      console.log('Condomínio criado:', response.data);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      handleClose();
      
    } catch (error) {
      console.error('Erro ao criar condomínio:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Erro ao criar condomínio';
      alert(errorMessage);
    }
  };

  const handleClose = () => {
    setShowDropdown(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <>
      {showDropdown && (
        <GenericDropdown
          title="Novo Condomínio"
          onClose={onClose}
          icon={<FaPlus size={18} />}
          className="add-user-dropdown"
          position="relative"
          triggerRef={triggerRef}
        >
          <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Digite o nome do condomínio"
                maxLength={200}
                required
              />
              <label>Nome do Condomínio*</label>
            </div>

            <div className="form-field">
              <input
                type="text"
                value={formData.cep}
                onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                placeholder="XXXXX-XXX"
                maxLength={9}
                className={validationErrors.cep === 'invalid' ? 'error' : validationErrors.cep === 'valid' ? 'valid' : ''}
                required
              />
              <label>CEP*</label>
            </div>
          </div>

          {loadingCep && (
            <div className="form-row">
              <div className="form-field">
                <p style={{ color: '#666', fontSize: '0.9em' }}>Buscando endereço...</p>
              </div>
            </div>
          )}

          {addressData && (
            <div className="form-row">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <p style={{ color: '#28a745', fontSize: '0.9em', margin: 0 }}>
                  📍 {addressData.logradouro}, {addressData.bairro} - {addressData.cidade}/{addressData.estado}
                </p>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                value={formData.numero}
                onChange={(e) => handleInputChange('numero', e.target.value)}
                placeholder="Digite o número"
                maxLength={10}
                required
              />
              <label>Número*</label>
            </div>

            <div className="form-field">
              <input
                type="text"
                value={formData.complemento}
                onChange={(e) => handleInputChange('complemento', e.target.value)}
                placeholder="Ex: Bloco A, Apto 101"
                maxLength={100}
              />
              <label>Complemento</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
                placeholder="XX.XXX.XXX/XXXX-XX"
                maxLength={18}
                className={validationErrors.cnpj === 'invalid' ? 'error' : validationErrors.cnpj === 'valid' ? 'valid' : ''}
              />
              <label>CNPJ</label>
            </div>

            <div className="form-field">
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', formatTelefone(e.target.value))}
                placeholder="(XX) XXXXX-XXXX"
                maxLength={15}
                className={validationErrors.telefone === 'invalid' ? 'error' : validationErrors.telefone === 'valid' ? 'valid' : ''}
              />
              <label>Telefone</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field" style={{ gridColumn: '1 / -1', marginBottom: '0.75rem' }}>
              <input
                type="file"
                id="logo-upload"
                accept="image/png,image/jpg,image/jpeg,image/svg+xml"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                <label
                  htmlFor="logo-upload"
                  title="Formatos: PNG, JPG, JPEG, SVG | Tamanho ideal: 250x250px (quadrada)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                >
                  <FaUpload /> Adicionar Logo
                </label>
                {formData.logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >Remover arquivo</button>
                )}
              </div>
            </div>
          </div>

            <div className="form-actions">
              <button type="button" className="button-secondary" onClick={handleClose}>
                <FaTimes /> Cancelar
              </button>
              <button type="submit" className="button-primary">
                <FaSave /> Criar Condomínio
              </button>
            </div>
          </form>
        </GenericDropdown>
      )}
    </>
  );
}

export default AddCondominioDropdown;