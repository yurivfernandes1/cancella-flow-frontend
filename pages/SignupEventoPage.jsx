import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo_login.svg';
import { eventoCerimonialInviteAPI } from '../services/api';
import '../styles/SignupPage.css';

function SignupEventoPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loadingInfo, setLoadingInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    cpf: '',
    phone: '',
  });

  useEffect(() => {
    document.title = 'Cancella Flow | Cadastro por Convite';
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) {
        setError('Convite inválido.');
        setLoadingInfo(false);
        return;
      }
      try {
        setLoadingInfo(true);
        const resp = await eventoCerimonialInviteAPI.getInfo(token);
        if (!active) return;
        setInvite(resp.data);
      } catch (e) {
        if (!active) return;
        setError(e.response?.data?.error || 'Não foi possível validar o convite.');
      } finally {
        if (active) setLoadingInfo(false);
      }
    };
    load();
    return () => { active = false; };
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'username') next = value.toLowerCase().replace(/\s/g, '');
    if (name === 'cpf') next = value.replace(/\D/g, '').slice(0, 11);
    if (name === 'phone') next = value.replace(/\D/g, '').slice(0, 11);
    setFormData((prev) => ({ ...prev, [name]: next }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const resp = await eventoCerimonialInviteAPI.register(token, formData);
      setResult(resp.data);
    } catch (e2) {
      setError(e2.response?.data?.error || 'Erro ao criar cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInfo) {
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

  if (error && !invite && !result) {
    return (
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <img src={logo} alt="Logo" height="40" />
            <h2>Convite inválido</h2>
          </div>
          <div className="error-balloon">{error}</div>
          <div className="login-link">
            <Link to="/login">Ir para login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <img src={logo} alt="Logo" height="40" />
            <h2>Cadastro concluído</h2>
            <p style={{ color: '#475569' }}>Usuário criado com sucesso para o evento.</p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13 }}><strong>Usuário:</strong> {result.username}</p>
            <p style={{ margin: 0, fontSize: 13 }}><strong>Senha temporária:</strong> {result.temporary_password}</p>
          </div>

          <button className="signup-button" type="button" onClick={() => navigate('/login')}>
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <img src={logo} alt="Logo" height="40" />
          <h2>Cadastro por Convite</h2>
          <p style={{ color: '#475569', marginTop: 8 }}>
            Evento: <strong>{invite?.evento?.nome}</strong><br />
            Perfil: <strong>{invite?.tipo_label}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <input type="text" id="full_name" name="full_name" placeholder=" " value={formData.full_name} onChange={handleChange} required />
            <label htmlFor="full_name" className="signup-label">Nome completo</label>
          </div>

          <div className="form-group">
            <input type="text" id="username" name="username" placeholder=" " value={formData.username} onChange={handleChange} required />
            <label htmlFor="username" className="signup-label">Usuário</label>
          </div>

          <div className="form-group">
            <input type="email" id="email" name="email" placeholder=" " value={formData.email} onChange={handleChange} required />
            <label htmlFor="email" className="signup-label">E-mail</label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <input type="text" id="cpf" name="cpf" placeholder=" " value={formData.cpf} onChange={handleChange} required />
              <label htmlFor="cpf" className="signup-label">CPF</label>
            </div>
            <div className="form-group">
              <input type="text" id="phone" name="phone" placeholder=" " value={formData.phone} onChange={handleChange} required />
              <label htmlFor="phone" className="signup-label">Telefone</label>
            </div>
          </div>

          {error && <div className="error-balloon">{error}</div>}

          <button className="signup-button" type="submit" disabled={submitting}>
            {submitting ? 'Criando...' : 'Criar Cadastro'}
          </button>

          <div className="login-link">
            <Link to="/login">Voltar para login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignupEventoPage;
