import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaSave, FaTimes, FaUser, FaKey } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import { signupAPI } from '../services/api';
import ProtectedImage, { invalidateBlobCache } from '../components/common/ProtectedImage';
import { formatCPF, formatTelefone } from '../utils/formatters';
import { validateCPF } from '../utils/validators';
import '../styles/ProfilePage.css';
import '../styles/CondominioProfile.css';

function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    username: '',
    email: '',
    cpf: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });
  const [cpfStatus, setCpfStatus] = useState({ checking: false, valid: null, available: null, message: '' });
  const [emailStatus, setEmailStatus] = useState({ checking: false, valid: null, available: null, message: '' });
  

  useEffect(() => {
    document.title = 'Cancella Flow | Meu Perfil';
  }, []);

  const isPorteiro = user?.groups?.some(g => g.name === 'Portaria');

  useEffect(() => {
    if (!user) return;
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      full_name: user.full_name || '',
      username: user.username || '',
      email: user.email || '',
      cpf: (user.cpf || '').replace(/\D/g, ''),
      phone: (user.phone || '').replace(/\D/g, ''),
    });
    
  }, [user]);

  

  // Username live check
  useEffect(() => {
    const username = String(formData.username || '').trim().toLowerCase();
    if (!username) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    // if unchanged from current user, it's available
    if (user && user.username && user.username.toLowerCase() === username) {
      setUsernameStatus({ checking: false, available: true, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setUsernameStatus((s) => ({ ...s, checking: true }));
        const res = await signupAPI.checkUsername(username);
        setUsernameStatus({ checking: false, available: Boolean(res.data?.available), message: res.data?.message || '' });
      } catch (err) {
        setUsernameStatus({ checking: false, available: false, message: 'Erro ao validar usuário.' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.username, user]);

  // CPF live check and validation
  useEffect(() => {
    const cpfDigits = String(formData.cpf || '').replace(/\D/g, '');
    if (!cpfDigits) {
      setCpfStatus({ checking: false, valid: null, available: null, message: '' });
      return;
    }

    // validate digits
    if (cpfDigits.length < 11) {
      setCpfStatus({ checking: false, valid: false, available: null, message: 'CPF incompleto.' });
      return;
    }

    if (!validateCPF(cpfDigits)) {
      setCpfStatus({ checking: false, valid: false, available: null, message: 'CPF inválido.' });
      return;
    }

    // If unchanged, it's available
    const userCpf = (user?.cpf || '').replace(/\D/g, '');
    if (userCpf && userCpf === cpfDigits) {
      setCpfStatus({ checking: false, valid: true, available: true, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCpfStatus((s) => ({ ...s, checking: true }));
        const res = await signupAPI.checkCpf(cpfDigits);
        setCpfStatus({ checking: false, valid: true, available: Boolean(res.data?.available), message: res.data?.message || '' });
      } catch (err) {
        setCpfStatus({ checking: false, valid: true, available: false, message: 'Erro ao validar CPF.' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.cpf, user]);

  // Email live check and validation
  useEffect(() => {
    const email = String(formData.email || '').trim().toLowerCase();
    if (!email) {
      setEmailStatus({ checking: false, valid: null, available: null, message: '' });
      return;
    }

    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(String(email).toLowerCase())) {
      setEmailStatus({ checking: false, valid: false, available: null, message: 'E-mail inválido.' });
      return;
    }

    if (user && user.email && user.email.toLowerCase() === email) {
      setEmailStatus({ checking: false, valid: true, available: true, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEmailStatus((s) => ({ ...s, checking: true }));
        const res = await signupAPI.checkEmail(email);
        setEmailStatus({ checking: false, valid: true, available: Boolean(res.data?.available), message: res.data?.message || '' });
      } catch (err) {
        setEmailStatus({ checking: false, valid: true, available: false, message: 'Erro ao validar e-mail.' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.email, user]);

  const avatarSrc = useMemo(() => {
    if (photoPreview) return photoPreview;
    return user?.foto_url || user?.foto || user?.avatar || null;
  }, [photoPreview, user]);

  const handleChange = (name, value) => {
    if (name === 'username') {
      setFormData((prev) => ({ ...prev, username: value.toLowerCase().replace(/\s/g, '') }));
      return;
    }
    if (name === 'cpf') {
      setFormData((prev) => ({ ...prev, cpf: value.replace(/\D/g, '').slice(0, 11) }));
      return;
    }
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 11) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!validateCPF(formData.cpf)) {
      setMessage({ type: 'error', text: 'CPF inválido.' });
      return;
    }

    try {
      setSaving(true);
      await profileAPI.update({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: formData.full_name.trim() || `${formData.first_name} ${formData.last_name}`.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        cpf: formData.cpf,
        phone: formData.phone,
      });
      await refreshUser();
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao atualizar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  const onPhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onPhotoCancel = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const onPhotoSave = async () => {
    if (!photoFile) return;
    try {
      setPhotoSaving(true);
      const fd = new FormData();
      fd.append('foto', photoFile);
      await profileAPI.uploadPhoto(fd);
      if (user?.foto_url) invalidateBlobCache(user.foto_url);
      await refreshUser();
      setPhotoFile(null);
      setPhotoPreview(null);
      setMessage({ type: 'success', text: 'Foto atualizada com sucesso.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar foto.' });
    } finally {
      setPhotoSaving(false);
    }
  };

  return (
    <div className="cp-root">

      <div className="cp-hero">
        <div className="cp-logo-wrapper">
          {avatarSrc ? (
            <ProtectedImage src={avatarSrc} alt="Foto de perfil" className="cp-logo" />
          ) : (
            <div className="cp-logo-placeholder"><FaUser /></div>
          )}

            <button
              className="cp-logo-camera"
              onClick={() => fileInputRef.current?.click()}
              title="Trocar foto"
              disabled={photoSaving}
            >
              <FaCamera />
            </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onPhotoSelected}
          />
        </div>

        <div className="cp-hero-info">
          <h1 className="cp-hero-name">{formData.full_name || `${formData.first_name} ${formData.last_name}`.trim() || 'Meu Perfil'}</h1>
          <div className="cp-unit-badges">
            {(user?.unidades || []).map((u) => (
              <span key={u.id} className="cp-unit-badge">{u.identificacao_completa}</span>
            ))}
          </div>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <button className="profile-password-btn" type="button" onClick={() => navigate('/perfil/senha')}>
            <FaKey /> Alterar Senha
          </button>
        </div>
      </div>

      {photoFile && (
        <div className="cp-photo-confirm">
          <div className="cp-photo-confirm-preview">
            <img src={photoPreview} alt="Pré-visualização" className="cp-photo-thumb" />
          </div>
          <span className="cp-photo-confirm-label">Nova foto selecionada — deseja salvar?</span>
              <div className="cp-photo-confirm-actions">
                <button className="cp-btn cp-btn--outline cp-btn--sm" onClick={onPhotoCancel} disabled={photoSaving}><FaTimes /> Cancelar</button>
                <button className="cp-btn cp-btn--primary cp-btn--sm" onClick={onPhotoSave} disabled={photoSaving}><FaSave /> {photoSaving ? 'Salvando…' : 'Salvar foto'}</button>
              </div>
        </div>
      )}

      <div className="cp-cards">
        <div className="cp-card cp-card--full">
          <div className="cp-card-body">
            <form className="profile-form" onSubmit={onSave}>
              <div className="profile-grid">
                <label>
                  Primeiro nome
                  <input value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} disabled={isPorteiro} />
                </label>
                <label>
                  Sobrenome
                  <input value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} disabled={isPorteiro} />
                </label>
                <label>
                  Nome completo
                  <input value={formData.full_name} onChange={(e) => handleChange('full_name', e.target.value)} disabled={isPorteiro} />
                </label>
                <label>
                  Usuário
                  <input
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className={`${usernameStatus.available === false ? 'input-error' : ''} ${usernameStatus.available === true ? 'input-valid' : ''}`}
                    disabled={isPorteiro}
                  />
                  {usernameStatus.message && (
                    <small className={`field-hint ${usernameStatus.available === false ? 'field-hint-error' : ''}`}>
                      {usernameStatus.message}
                    </small>
                  )}
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`${emailStatus.valid === false || emailStatus.available === false ? 'input-error' : ''} ${emailStatus.valid && emailStatus.available ? 'input-valid' : ''}`}
                    disabled={isPorteiro}
                  />
                  {emailStatus.message && (
                    <small className={`field-hint ${emailStatus.valid === false || emailStatus.available === false ? 'field-hint-error' : ''}`}>
                      {emailStatus.message}
                    </small>
                  )}
                </label>
                <label>
                  CPF
                  <input
                    value={formatCPF(formData.cpf)}
                    onChange={(e) => handleChange('cpf', e.target.value)}
                    className={`${cpfStatus.valid === false || cpfStatus.available === false ? 'input-error' : ''} ${cpfStatus.valid && cpfStatus.available ? 'input-valid' : ''}`}
                    disabled={isPorteiro}
                  />
                  {cpfStatus.message && (
                    <small className={`field-hint ${cpfStatus.valid === false || cpfStatus.available === false ? 'field-hint-error' : ''}`}>
                      {cpfStatus.message}
                    </small>
                  )}
                </label>
                <label>
                  Telefone
                  <input value={formatTelefone(formData.phone)} onChange={(e) => handleChange('phone', e.target.value)} disabled={isPorteiro} />
                </label>
                
              </div>

              



              {message.text && <div className={`profile-message ${message.type}`}>{message.text}</div>}

              {!isPorteiro && (
                <div className="profile-actions">
                  <button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
