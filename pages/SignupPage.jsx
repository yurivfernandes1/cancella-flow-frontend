import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';
import '../styles/SignupPage.css';
import logo from '../assets/logo_login.svg';
import { signupAPI } from '../services/api';
import PasswordResetModal from '../components/Users/PasswordResetModal';
import { formatCPF, formatTelefone } from '../utils/formatters';
import { validateCPF } from '../utils/validators';

function SignupPage() {
  useEffect(() => {
    document.title = 'Cancella Flow | Cadastro de Morador';
  }, []);

  const navigate = useNavigate();
  const { slug } = useParams();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    cpf: '',
    phone: '',
    unidade_ids: [],
  });
  const [fotoFile, setFotoFile] = useState(null);
  const [condominioInfo, setCondominioInfo] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState({ show: false, username: '', password: '' });
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const [cpfStatus, setCpfStatus] = useState({ checking: false, valid: null, available: null, message: '' });

  useEffect(() => {
    let active = true;

    const loadInviteInfo = async () => {
      if (!slug) {
        setInviteError('Link de cadastro inválido. Solicite um novo convite ao síndico.');
        setInviteLoading(false);
        return;
      }

      try {
        setInviteLoading(true);
        const response = await signupAPI.getCondominioInfo(slug);
        if (!active) return;
        setCondominioInfo(response.data);
      } catch (err) {
        if (!active) return;
        setInviteError(err.response?.data?.error || 'Não foi possível validar o convite.');
      } finally {
        if (active) setInviteLoading(false);
      }
    };

    loadInviteInfo();
    return () => { active = false; };
  }, [slug]);

  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  useEffect(() => {
    const username = String(formData.username || '').trim().toLowerCase();
    if (!username) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setUsernameStatus((prev) => ({ ...prev, checking: true }));
        const response = await signupAPI.checkUsername(username);
        setUsernameStatus({
          checking: false,
          available: Boolean(response.data?.available),
          message: response.data?.message || '',
        });
      } catch {
        setUsernameStatus({ checking: false, available: false, message: 'Erro ao validar nome de usuário.' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.username]);

  useEffect(() => {
    const cpfDigits = String(formData.cpf || '').replace(/\D/g, '');
    if (!cpfDigits) {
      setCpfStatus({ checking: false, valid: null, available: null, message: '' });
      return;
    }

    if (cpfDigits.length < 11) {
      setCpfStatus({ checking: false, valid: false, available: null, message: 'CPF incompleto.' });
      return;
    }

    if (!validateCPF(cpfDigits)) {
      setCpfStatus({ checking: false, valid: false, available: null, message: 'CPF inválido.' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCpfStatus((prev) => ({ ...prev, checking: true }));
        const response = await signupAPI.checkCpf(cpfDigits);
        setCpfStatus({
          checking: false,
          valid: Boolean(response.data?.valid),
          available: Boolean(response.data?.available),
          message: response.data?.message || '',
        });
      } catch {
        setCpfStatus({ checking: false, valid: false, available: false, message: 'Erro ao validar CPF.' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.cpf]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'username') {
      const normalized = value.toLowerCase().replace(/\s/g, '');
      setFormData(prev => ({ ...prev, username: normalized }));
    } else if (name === 'cpf') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, cpf: digits }));
    } else if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, phone: digits }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const unidadeOptions = (condominioInfo?.unidades || []).map((u) => ({
    value: String(u.id),
    label: u.identificacao_completa,
  }));

  const selectedUnidade = unidadeOptions.find((opt) => opt.value === formData.unidade_ids[0]) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!condominioInfo?.condominio?.slug) {
      setError('Convite inválido. Solicite um novo link ao síndico.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (!usernameStatus.available) {
      setError(usernameStatus.message || 'Nome de usuário indisponível.');
      return;
    }

    if (!cpfStatus.valid || !cpfStatus.available) {
      setError(cpfStatus.message || 'CPF inválido ou já cadastrado.');
      return;
    }

    if (!formData.unidade_ids.length) {
      setError('Selecione ao menos uma unidade.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('first_name', formData.first_name.trim());
      payload.append('last_name', formData.last_name.trim());
      payload.append('full_name', `${formData.first_name} ${formData.last_name}`.trim());
      payload.append('username', formData.username.trim().toLowerCase());
      payload.append('email', formData.email.trim().toLowerCase());
      payload.append('cpf', formData.cpf);
      payload.append('phone', formData.phone);
      payload.append('invite_slug', condominioInfo.condominio.slug);
      payload.append('unidade_ids', formData.unidade_ids.join(','));
      if (fotoFile) {
        payload.append('foto', fotoFile);
      }

      const response = await signupAPI.signupMorador(payload);

      if (response.status === 201 || response.status === 200) {
        setResetPassword({
          show: true, 
          username: response.data.username,
          password: response.data.temporary_password || ''
        });
      } else {
        setError(response.data.error || 'Erro ao criar cadastro');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      // Extrair a mensagem de erro da resposta da API
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          'Erro ao criar cadastro. Verifique os dados e tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setResetPassword({ show: false, username: '', password: '' });
    navigate('/login');
  };

  if (inviteLoading) {
    return (
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <img src={logo} alt="Logo" height="40" />
            <h2>Validando convite...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <img src={logo} alt="Logo" height="40" />
            <h2>Link inválido</h2>
          </div>
          <div className="error-balloon">{inviteError}</div>
          <div className="login-link">
            Solicite um novo link ao síndico.
          </div>
        </div>
      </div>
    );
  }

  const emailIsValid = formData.email ? validateEmail(formData.email) : null;

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flexDirection: 'column' }}>
            {condominioInfo?.condominio?.logo_url && (
              <div className="condominio-logo-wrap">
                <img
                  src={condominioInfo.condominio.logo_url}
                  alt={`Logo ${condominioInfo?.condominio?.nome || 'Condomínio'}`}
                  className="condominio-logo"
                />
              </div>
            )}
          </div>
          <h2>Cadastro de Morador</h2>
          <p style={{ color: '#475569', marginTop: 8 }}>
            Condomínio: <strong>{condominioInfo?.condominio?.nome}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                id="first_name"
                name="first_name"
                placeholder=" "
                value={formData.first_name}
                onChange={handleChange}
                required
                maxLength={30}
              />
              <label htmlFor="first_name" className="signup-label">Primeiro Nome</label>
            </div>

            <div className="form-group">
              <input
                type="text"
                id="last_name"
                name="last_name"
                placeholder=" "
                value={formData.last_name}
                onChange={handleChange}
                required
                maxLength={30}
              />
              <label htmlFor="last_name" className="signup-label">Último Nome</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                id="username"
                name="username"
                placeholder=" "
                value={formData.username}
                onChange={handleChange}
                required
                maxLength={30}
                className={`${usernameStatus.available === false ? 'input-error' : ''} ${usernameStatus.available === true ? 'input-valid' : ''}`}
              />
              <label htmlFor="username" className="signup-label">Nome de Usuário</label>
              {usernameStatus.message && (
                <small className="field-hint field-hint-error">{usernameStatus.message}</small>
              )}
            </div>

            <div className="form-group">
              <input
                type="email"
                id="email"
                name="email"
                placeholder=" "
                value={formData.email}
                onChange={handleChange}
                required
                className={`${emailIsValid === false ? 'input-error' : ''} ${emailIsValid === true ? 'input-valid' : ''}`}
              />
              <label htmlFor="email" className="signup-label">E-mail</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                id="cpf"
                name="cpf"
                placeholder=" "
                value={formatCPF(formData.cpf)}
                onChange={handleChange}
                required
                className={`${cpfStatus.valid === false || cpfStatus.available === false ? 'input-error' : ''} ${cpfStatus.valid && cpfStatus.available ? 'input-valid' : ''}`}
              />
              <label htmlFor="cpf" className="signup-label">CPF</label>
              {cpfStatus.message && (
                <small className="field-hint field-hint-error">{cpfStatus.message}</small>
              )}
            </div>

            <div className="form-group">
              <input
                type="text"
                id="phone"
                name="phone"
                placeholder=" "
                value={formatTelefone(formData.phone)}
                onChange={handleChange}
                required
              />
              <label htmlFor="phone" className="signup-label">Telefone</label>
            </div>
          </div>

          <div className="form-row form-row-single compact-row">
            <div className="form-group form-group-full unidade-field">
              <label className="signup-label" htmlFor="unidade-select">Unidade</label>
              <Select
                inputId="unidade-select"
                classNamePrefix="unidade-select"
                options={unidadeOptions}
                value={unidadeOptions.filter(o => formData.unidade_ids.includes(o.value))}
                onChange={(opts) => {
                  const items = Array.isArray(opts) ? opts : opts ? [opts] : [];
                  setFormData((prev) => ({
                    ...prev,
                    unidade_ids: items.map(i => String(i.value)),
                  }));
                }}
                isMulti
                placeholder="Pesquise e selecione a unidade"
                isClearable
                noOptionsMessage={() => 'Nenhuma unidade encontrada'}
              />
            </div>
          </div>

          <div className="form-row form-row-single">
            <div className="form-group form-group-full">
              <label className="signup-label inline-static">Foto de Perfil (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
                className="file-input"
              />
            </div>
          </div>

          {error && <div className="error-balloon">{error}</div>}

          <button 
            type="submit" 
            className="signup-button" 
            disabled={loading || 
                     usernameStatus.checking ||
                     !usernameStatus.available ||
                     cpfStatus.checking ||
                     !cpfStatus.valid ||
                     !cpfStatus.available ||
                     emailIsValid === false || 
                     !formData.email ||
                     !formData.unidade_ids.length}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
          
          <div className="login-link">
            Já possui cadastro? <Link to="/login">Faça login aqui</Link>
          </div>
        </form>
        <div className="signup-footer">
          <Link to="/">
            <img src={logo} alt="Logo Cancella Flow" className="system-logo" />
          </Link>
        </div>
      </div>


      {resetPassword.show && (
        <PasswordResetModal
          title="Cadastro Realizado com Sucesso"
          subtitle={`Seu usuário: ${resetPassword.username}`}
          message="Cadastro enviado para aprovação do síndico. Aguarde o e-mail com a confirmação do seu usuário e senha."
          password={resetPassword.password}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default SignupPage;
