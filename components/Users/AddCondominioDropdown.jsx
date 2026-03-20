import React, { useEffect, useState } from 'react';
import { FaSave, FaTimes, FaPlus, FaUpload, FaChevronDown } from 'react-icons/fa';
import api, { condominioAPI } from '../../services/api';
import GenericDropdown from '../common/GenericDropdown';
import PasswordResetModal from './PasswordResetModal';
import { validateCEP, formatCEP, fetchCEPData } from '../../utils/validators';
import { generateStrongPassword } from '../../utils/passwordGenerator';
import { formatUsername } from '../../utils/stringUtils';

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
  
  const [sindicoData, setSindicoData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cpf: ''
  });
  const [showSindicoSection, setShowSindicoSection] = useState(false);
  const [sindicoCreated, setSindicoCreated] = useState(null);

  const [showDropdown, setShowDropdown] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});
  const [addressData, setAddressData] = useState(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

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

  const formatCPF = (value) => {
    const clean = value.replace(/\D/g, '').substring(0, 11);
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
      .substring(0, 14);
  };

  const validateCPF = (cpf) => {
    const str = (cpf || '').replace(/\D/g, '');
    if (str.length !== 11) return false;
    if (/^(\d)\1+$/.test(str)) return false;

    const calc = (t) => {
      let s = 0;
      for (let i = 0; i < t; i++) s += parseInt(str.charAt(i)) * (t + 1 - i);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };

    const v1 = calc(9);
    const v2 = calc(10);
    return v1 === parseInt(str.charAt(9)) && v2 === parseInt(str.charAt(10));
  };

  const validateTelefone = (telefone) => {
    const cleanTelefone = telefone.replace(/\D/g, '');
    return cleanTelefone.length >= 10 && cleanTelefone.length <= 11;
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
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

    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, logo: file }));
  };

  const handleRemoveLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
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

      // Após criar o condomínio, tratar criação opcional do síndico em um segundo passo
      if (showSindicoSection && sindicoData.first_name.trim() && sindicoData.email.trim()) {
        // perguntar ao usuário se deseja criar o síndico agora
        const wantCreate = window.confirm('Condomínio criado. Deseja adicionar o síndico agora?');
        if (wantCreate) {
          // validar CPF antes de criar
          if (!sindicoData.cpf || !validateCPF(sindicoData.cpf)) {
            alert('CPF do síndico é obrigatório e deve ser válido. Síndico NÃO foi criado.');
            if (onSuccess) onSuccess(response.data);
            handleClose();
            return;
          }

          const password = generateStrongPassword();
          const username = formatUsername(sindicoData.first_name, sindicoData.last_name);
          try {
            await api.post('/access/create/', {
              user_type: 'sindico',
              condominio_id: response.data.id,
              first_name: sindicoData.first_name.trim(),
              last_name: sindicoData.last_name.trim(),
              full_name: `${sindicoData.first_name.trim()} ${sindicoData.last_name.trim()}`,
              email: sindicoData.email.trim(),
              cpf: sindicoData.cpf.replace(/\D/g, ''),
              username,
              password,
            });
            setShowDropdown(false);
            setSindicoCreated({ username, password, condominioData: response.data });
            return; // mostra PasswordResetModal e onSuccess será chamado ao fechar
          } catch (sindicoError) {
            console.error('Erro ao criar síndico:', sindicoError);
            const msg = sindicoError.response?.data?.error || sindicoError.response?.data?.message || 'Condomínio criado, mas houve um erro ao criar o síndico.';
            alert(msg);
            if (onSuccess) onSuccess(response.data);
            handleClose();
            return;
          }
        }
      }

      if (onSuccess) {
        onSuccess(response.data);
      }

      handleClose();
      
    } catch (error) {
      console.error('Erro ao criar condomínio:', error);
      let errorMessage = 'Erro ao criar condomínio';
      const respData = error.response?.data;
      if (respData) {
        if (typeof respData === 'string') {
          errorMessage = respData;
        } else if (respData.error) {
          errorMessage = respData.error;
        } else if (respData.message) {
          errorMessage = respData.message;
        } else {
          try { errorMessage = JSON.stringify(respData); } catch (e) { /* fallback */ }
        }
      } else if (error.userMessage) {
        errorMessage = error.userMessage;
      }
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                <label
                  htmlFor="logo-upload"
                  title="Formatos: PNG, JPG, JPEG, SVG"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #19294a 0%, #2abb98 100%)',
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
                {logoPreview && (
                  <div
                    style={{
                      width: '160px',
                      height: '160px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={logoPreview}
                      alt="Pré-visualização da logo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  </div>
                )}
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

          {/* ── Síndico Responsável (opcional) ── */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setShowSindicoSection((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#374151',
                fontWeight: 500,
                fontSize: '0.9rem',
                padding: 0,
                marginBottom: showSindicoSection ? '0.75rem' : 0,
              }}
            >
              <FaChevronDown
                style={{
                  transition: 'transform 0.2s',
                  transform: showSindicoSection ? 'rotate(0deg)' : 'rotate(-90deg)',
                  fontSize: '0.75rem',
                }}
              />
              Síndico Responsável <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#6b7280' }}>(opcional)</span>
            </button>

            {showSindicoSection && (
              <div className="sindico-section">
                <div className="form-row">
                  <div className="form-field">
                    <input
                      type="text"
                      value={sindicoData.first_name}
                      onChange={(e) => setSindicoData((p) => ({ ...p, first_name: e.target.value }))}
                      placeholder="Nome"
                      maxLength={150}
                    />
                    <label>Nome</label>
                  </div>
                  <div className="form-field">
                    <input
                      type="text"
                      value={sindicoData.last_name}
                      onChange={(e) => setSindicoData((p) => ({ ...p, last_name: e.target.value }))}
                      placeholder="Sobrenome"
                      maxLength={150}
                    />
                    <label>Sobrenome</label>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <input
                      type="email"
                      value={sindicoData.email}
                      onChange={(e) => setSindicoData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                      maxLength={254}
                    />
                    <label>E-mail</label>
                  </div>

                  <div className="form-field">
                    <input
                      type="text"
                      value={sindicoData.cpf}
                      onChange={(e) => {
                        const val = formatCPF(e.target.value);
                        setSindicoData((p) => ({ ...p, cpf: val }));
                        setValidationErrors((prev) => {
                          const copy = { ...prev };
                          if (val.replace(/\D/g, '').length === 11) {
                            copy.sindico_cpf = validateCPF(val) ? 'valid' : 'invalid';
                          } else {
                            delete copy.sindico_cpf;
                          }
                          return copy;
                        });
                      }}
                      placeholder="XXX.XXX.XXX-XX"
                      maxLength={14}
                      className={validationErrors.sindico_cpf === 'invalid' ? 'error' : validationErrors.sindico_cpf === 'valid' ? 'valid' : ''}
                    />
                    <label>CPF</label>
                    {validationErrors.sindico_cpf === 'invalid' && <span className="error-message">CPF inválido</span>}
                  </div>
                </div>
              </div>
            )}
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
      {sindicoCreated && (
        <PasswordResetModal
          title="Síndico Criado"
          subtitle={`Usuário: ${sindicoCreated.username}`}
          password={sindicoCreated.password}
          onClose={() => {
            const data = sindicoCreated.condominioData;
            setSindicoCreated(null);
            if (onSuccess) onSuccess(data);
            if (typeof onClose === 'function') onClose();
          }}
        />
      )}
    </>
  );
}

export default AddCondominioDropdown;