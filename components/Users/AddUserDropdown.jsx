import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import api, { condominioAPI } from '../../services/api';
import Select from 'react-select';
import { generateStrongPassword } from '../../utils/passwordGenerator';
import { formatUsername } from '../../utils/stringUtils';
import { formatCPF, formatTelefone } from '../../utils/formatters';
import { validateCPF, validatePhone } from '../../utils/validators';
import PasswordResetModal from './PasswordResetModal';
import GenericDropdown from '../common/GenericDropdown';

function AddUserDropdown({ onClose, onSuccess, triggerRef, userType = 'funcionario' }) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    full_name: '',
    email: '',
    cpf: '',
    phone: '',
    team_id: '',
    condominio_id: '',
    unidade_id: '',
    is_active: true,
  });
  const [isMoradorToo, setIsMoradorToo] = useState(false);
  const [resetPassword, setResetPassword] = useState({ show: false, username: '', password: '' });
  const [emailIsValid, setEmailIsValid] = useState(null);
  const [cpfIsValid, setCpfIsValid] = useState(null);
  const [phoneIsValid, setPhoneIsValid] = useState(null);
  const [showDropdown, setShowDropdown] = useState(true);
  // Funcionários, síndicos e moradores têm os mesmos campos.
  // Removemos toda a lógica de Equipes.
  const [condominios, setCondominios] = useState([]);
  const [loadingCondominios, setLoadingCondominios] = useState(true);
  const [unidades, setUnidades] = useState([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);

  // Removido: carregamento de equipes

  useEffect(() => {
    const fetchCondominios = async () => {
      if (userType === 'sindico') {
        try {
          setLoadingCondominios(true);
          const response = await condominioAPI.options();
          setCondominios(response.data);
        } catch (error) {
          console.error('Erro ao carregar condomínios:', error);
        } finally {
          setLoadingCondominios(false);
        }
      } else {
        setLoadingCondominios(false);
      }
    };

    fetchCondominios();
  }, [userType]);

  // Carregar unidades para moradores ou síndicos que também são moradores
  useEffect(() => {
    const fetchUnidades = async () => {
      if (userType === 'morador' || (userType === 'sindico' && isMoradorToo)) {
        try {
          setLoadingUnidades(true);
          const response = await api.get('/cadastros/unidades/?page_size=1000');
          const unidadesList = response.data.results || response.data || [];
          setUnidades(unidadesList);
        } catch (error) {
          console.error('Erro ao carregar unidades:', error);
        } finally {
          setLoadingUnidades(false);
        }
      }
    };

    fetchUnidades();
  }, [userType, isMoradorToo]);

  // Removido: estilização de select de equipes

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({...prev, email: value}));
    
    if (value) {
      setEmailIsValid(validateEmail(value));
    } else {
      setEmailIsValid(null);
    }
  };

  const handleCpfChange = (e) => {
    const raw = e.target.value || '';
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, cpf: digits }));
    if (!digits) {
      setCpfIsValid(null);
    } else {
      setCpfIsValid(validateCPF(digits));
    }
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value || '';
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, phone: digits }));
    if (!digits) {
      setPhoneIsValid(null);
    } else {
      setPhoneIsValid(validatePhone(digits));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (userType === 'sindico' && !formData.condominio_id) {
      alert('Por favor, selecione um condomínio para o síndico');
      return;
    }

    if (!validateEmail(formData.email)) {
      setEmailIsValid(false);
      alert('Por favor, insira um e-mail válido.');
      return;
    }

    // Validar CPF e Telefone
    const cpfDigits = (formData.cpf || '').replace(/\D/g, '');
    const phoneDigits = (formData.phone || '').replace(/\D/g, '');
    const cpfOk = cpfDigits.length === 0 || validateCPF(cpfDigits);
    const phoneOk = phoneDigits.length === 0 || validatePhone(phoneDigits);
    setCpfIsValid(cpfOk);
    setPhoneIsValid(phoneOk);
    if (!cpfOk) {
      alert('CPF inválido.');
      return;
    }
    if (!phoneOk) {
      alert('Telefone inválido.');
      return;
    }
    
    try {
      const password = generateStrongPassword();
      const username = formatUsername(formData.first_name, formData.last_name);
      
      // Definir user_type: se síndico também é morador, enviar 'sindico_morador'
      const finalUserType = (userType === 'sindico' && isMoradorToo) ? 'sindico_morador' : userType;

      const userData = {
        username,
        password: password.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email.trim(),
        cpf: formData.cpf?.replace(/\D/g, '') || '',
        phone: formData.phone?.replace(/\D/g, '') || '',
        first_access: true,
        is_active: true,
        user_type: finalUserType
      };

      if (formData.team_id) {
        userData.team_id = formData.team_id;
      }

      if (formData.unidade_id) {
        userData.unidade_id = formData.unidade_id;
      }

      // Para síndicos, usar o condomínio selecionado
      // Para funcionários e moradores, usar o condomínio do usuário logado
      if (userType === 'sindico') {
        if (formData.condominio_id) {
          userData.condominio_id = formData.condominio_id;
        }
      } else {
        // Usar condomínio do usuário logado
        if (currentUser?.condominio_id) {
          userData.condominio_id = currentUser.condominio_id;
        }
      }

      await api.post('/access/create/', userData);
      
      setShowDropdown(false);
      
      setResetPassword({ 
        show: true, 
        username: username.toLowerCase(),
        password: password.trim() 
      });
      
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário: ' + (error.response?.data?.error || 'Erro desconhecido'));
    }
  };

  const handleModalClose = () => {
    setResetPassword({ show: false, username: '', password: '' });
    onClose();
    onSuccess();
  };

  return (
    <>
      {showDropdown && (
        <GenericDropdown
          title={`Novo ${userType === 'sindico' ? 'Síndico' : userType === 'funcionario' ? 'Funcionário' : 'Morador'}`}
          onClose={onClose}
          icon={<FaUserPlus size={18} />}
          className="add-user-dropdown"
          position="relative"
          triggerRef={triggerRef}
          isOpen={true}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-field">
                <input
                  required
                  maxLength={30}
                  value={formData.first_name}
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  placeholder="Digite o primeiro nome"
                />
                <label>Primeiro Nome*</label>
              </div>
              <div className="form-field">
                <input
                  required
                  maxLength={30}
                  value={formData.last_name}
                  onChange={e => setFormData({...formData, last_name: e.target.value})}
                  placeholder="Digite o último nome"
                />
                <label>Último Nome*</label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field email-field">
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  placeholder="exemplo@email.com"
                  className={`${emailIsValid === false ? 'input-error' : ''} ${emailIsValid === true ? 'input-valid' : ''}`}
                />
                <label>E-mail*</label>
              </div>

              <div className="form-field">
                <input
                  type="text"
                  value={formatTelefone(formData.phone || '')}
                  onChange={handlePhoneChange}
                  placeholder="Somente números"
                  className={`${phoneIsValid === false ? 'input-error' : ''} ${phoneIsValid === true ? 'input-valid' : ''}`}
                />
                <label>Telefone</label>
              </div>
            </div>

            {/* Linha de CPF e Unidade (para morador) ou CPF e Condomínio (para síndico) */}
            <div className="form-row">
              <div className="form-field">
                <input
                  type="text"
                  value={formatCPF(formData.cpf || '')}
                  onChange={handleCpfChange}
                  placeholder="Somente números"
                  className={`${cpfIsValid === false ? 'input-error' : ''} ${cpfIsValid === true ? 'input-valid' : ''}`}
                />
                <label>CPF</label>
              </div>

              {userType === 'morador' ? (
                <div className="form-field">
                  <label>Unidade (Opcional)</label>
                  {loadingUnidades ? (
                    <div style={{ padding: '10px', fontSize: '0.85rem' }}>Carregando...</div>
                  ) : (
                    <Select
                      options={unidades.map(unidade => ({
                        value: unidade.id,
                        label: unidade.identificacao_completa
                      }))}
                      value={unidades.find(u => u.id === formData.unidade_id) ? {
                        value: formData.unidade_id,
                        label: unidades.find(u => u.id === formData.unidade_id).identificacao_completa
                      } : null}
                      onChange={(selectedOption) => setFormData(prev => ({
                        ...prev,
                        unidade_id: selectedOption?.value || ''
                      }))}
                      placeholder="Selecione uma unidade"
                      isClearable
                      className="unidade-select react-select-container"
                      classNamePrefix="react-select"
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      styles={{ menuPortal: base => ({ ...base, zIndex: 300000 }) }}
                    />
                  )}
                </div>
              ) : userType === 'sindico' ? (
                <div className="form-field">
                  <label>Condomínio*</label>
                  {loadingCondominios ? (
                    <div style={{ padding: '10px', fontSize: '0.85rem' }}>Carregando...</div>
                  ) : (
                    <Select
                      options={condominios.map(cond => ({
                        value: cond.id,
                        label: cond.nome
                      }))}
                      value={condominios.find(cond => cond.id === formData.condominio_id) ? {
                        value: formData.condominio_id,
                        label: condominios.find(cond => cond.id === formData.condominio_id).nome
                      } : null}
                      onChange={(selectedOption) => setFormData(prev => ({
                        ...prev,
                        condominio_id: selectedOption?.value || ''
                      }))}
                      placeholder="Selecione um condomínio"
                      isClearable
                      className="condominio-select"
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      styles={{ menuPortal: base => ({ ...base, zIndex: 300000 }) }}
                    />
                  )}
                </div>
              ) : null}
            </div>

            {/* Checkbox para síndico também ser morador */}
            {userType === 'sindico' && (
              <div className="form-row">
                <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="tambem-morador"
                    checked={isMoradorToo}
                    onChange={(e) => {
                      setIsMoradorToo(e.target.checked);
                      if (!e.target.checked) {
                        setFormData(prev => ({ ...prev, unidade_id: '' }));
                      }
                    }}
                    style={{ width: 'auto', height: 'auto' }}
                  />
                  <label htmlFor="tambem-morador" style={{ position: 'static', margin: 0, background: 'none', padding: 0 }}>
                    Também é morador
                  </label>
                </div>
              </div>
            )}

            {/* Campo de unidade para síndico que também é morador */}
            {userType === 'sindico' && isMoradorToo && (
              <div className="form-row">
                <div className="form-field">
                  <label>Unidade (Opcional)</label>
                  {loadingUnidades ? (
                    <div style={{ padding: '10px', fontSize: '0.85rem' }}>Carregando...</div>
                  ) : (
                    <Select
                      options={unidades.map(unidade => ({
                        value: unidade.id,
                        label: unidade.identificacao_completa
                      }))}
                      value={unidades.find(u => u.id === formData.unidade_id) ? {
                        value: formData.unidade_id,
                        label: unidades.find(u => u.id === formData.unidade_id).identificacao_completa
                      } : null}
                      onChange={(selectedOption) => setFormData(prev => ({
                        ...prev,
                        unidade_id: selectedOption?.value || ''
                      }))}
                      placeholder="Selecione uma unidade"
                      isClearable
                      className="unidade-select react-select-container"
                      classNamePrefix="react-select"
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                      menuPosition="fixed"
                      styles={{ menuPortal: base => ({ ...base, zIndex: 300000 }) }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Funcionário e morador não exibem condomínio: herdado do usuário logado */}

            <div className="form-actions">
              <button type="button" className="button-secondary" onClick={onClose}>
                <FaTimes /> Cancelar
              </button>
              <button 
                type="submit" 
                className="button-primary"
                disabled={emailIsValid === false || cpfIsValid === false || phoneIsValid === false}
              >
                <FaSave /> Criar {userType === 'sindico' ? 'Síndico' : userType === 'funcionario' ? 'Funcionário' : 'Morador'}
              </button>
            </div>
          </form>
        </GenericDropdown>
      )}

      {resetPassword.show && (
        <PasswordResetModal
          title="Usuário Criado com Sucesso"
          subtitle={`Username: ${resetPassword.username}`}
          message="Por favor, aguarde a liberação do acesso ao sistema."
          password={resetPassword.password}
          onClose={handleModalClose}
        />
      )}
      
    </>
  );
}

export default AddUserDropdown;
