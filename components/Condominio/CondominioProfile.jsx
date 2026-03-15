import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { condominioAPI } from '../../services/api';
import ProtectedImage, { invalidateBlobCache } from '../common/ProtectedImage';
import { formatTelefone } from '../../utils/formatters';
import {
  FaCamera, FaSave, FaTimes, FaBuilding,
  FaPhone, FaMapMarkerAlt, FaIdCard, FaCheckCircle, FaBan, FaPencilAlt,
} from 'react-icons/fa';
import '../../styles/CondominioProfile.css';

const formatCNPJ = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length !== 14) return raw || '—';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
};

function CondominioProfile() {
  const { condominioData, condominioLogoUrl, refreshCondominioData, user } = useAuth();

  // ── Inline field edit ──────────────────────────────────────────
  const [editingField, setEditingField] = useState(null); // 'nome' | 'telefone'
  const [editValue, setEditValue]       = useState('');
  const [fieldSaving, setFieldSaving]   = useState(false);

  // ── Logo upload ────────────────────────────────────────────────
  const [logoFile, setLogoFile]       = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoSaving, setLogoSaving]   = useState(false);
  const fileInputRef = useRef(null);

  const condominioId = condominioData?.id || user?.condominio_id;

  // ── Handlers ───────────────────────────────────────────────────
  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(
      field === 'telefone'
        ? formatTelefone(condominioData?.telefone || '')
        : condominioData?.[field] || ''
    );
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async () => {
    if (!editingField || !condominioId) return;
    setFieldSaving(true);
    try {
      const raw = editingField === 'telefone'
        ? editValue.replace(/\D/g, '')
        : editValue;
      await condominioAPI.patch(condominioId, { [editingField]: raw });
      refreshCondominioData(condominioId);
      setEditingField(null);
      setEditValue('');
    } catch {
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setFieldSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveField();
    if (e.key === 'Escape') cancelEdit();
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const cancelLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const saveLogo = async () => {
    if (!logoFile || !condominioId) return;
    setLogoSaving(true);
    try {
      const fd = new FormData();
      fd.append('logo', logoFile);
      await condominioAPI.uploadLogoDb(condominioId, fd);
      // Invalida o blob cacheado para forçar re-fetch com a nova logo
      if (condominioData?.logo_url) invalidateBlobCache(condominioData.logo_url);
      refreshCondominioData(condominioId);
      setLogoFile(null);
      setLogoPreview(null);
    } catch {
      alert('Erro ao salvar foto. Tente novamente.');
    } finally {
      setLogoSaving(false);
    }
  };

  // ── Loading / Empty ────────────────────────────────────────────
  if (!condominioData) {
    return (
      <div className="cp-loading">
        <div className="cp-spinner" />
        <span>Carregando...</span>
      </div>
    );
  }

  // ── Derived display values ─────────────────────────────────────
  const logoSrc = logoPreview || condominioLogoUrl;
  const addressParts = [
    condominioData.logradouro,
    condominioData.numero,
    condominioData.complemento,
    condominioData.bairro,
    condominioData.cidade,
    condominioData.estado,
  ].filter(Boolean);
  const address = addressParts.length ? addressParts.join(', ') : null;

  return (
    <div className="cp-root">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="cp-hero">
        <div className="cp-logo-wrapper">
          {logoSrc ? (
            <ProtectedImage src={logoSrc} alt="Logo do condomínio" className="cp-logo" />
          ) : (
            <div className="cp-logo-placeholder"><FaBuilding /></div>
          )}

          {/* Botão câmera — sempre visível */}
          <button
            className="cp-logo-camera"
            onClick={() => fileInputRef.current?.click()}
            title="Trocar logo"
            disabled={logoSaving}
          >
            <FaCamera />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoChange}
          />
        </div>

        <div className="cp-hero-info">
          <h1 className="cp-hero-name">{condominioData.nome}</h1>
          <span className={`cp-badge ${condominioData.is_ativo ? 'cp-badge--active' : 'cp-badge--inactive'}`}>
            {condominioData.is_ativo
              ? <><FaCheckCircle /> Ativo</>
              : <><FaBan /> Inativo</>}
          </span>
        </div>
      </div>

      {/* ── Barra de confirmação de foto (fora do hero para evitar z-index/overflow) ── */}
      {logoFile && (
        <div className="cp-photo-confirm">
          <div className="cp-photo-confirm-preview">
            <img src={logoPreview} alt="Pré-visualização da nova logo" className="cp-photo-thumb" />
          </div>
          <span className="cp-photo-confirm-label">Nova foto selecionada — deseja salvar?</span>
          <div className="cp-photo-confirm-actions">
            <button className="cp-btn cp-btn--outline cp-btn--sm" onClick={cancelLogo} disabled={logoSaving}>
              <FaTimes /> Cancelar
            </button>
            <button className="cp-btn cp-btn--primary cp-btn--sm" onClick={saveLogo} disabled={logoSaving}>
              <FaSave /> {logoSaving ? 'Salvando…' : 'Salvar foto'}
            </button>
          </div>
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────── */}
      <div className="cp-cards">

        {/* Nome — editável */}
        <div className="cp-card cp-card--full">
          <FaBuilding className="cp-card-icon" />
          <div className="cp-card-body">
            <div className="cp-card-header">
              <span className="cp-card-label">Nome do Condomínio</span>
              {editingField !== 'nome' && (
                <button className="cp-inline-edit-btn" onClick={() => startEdit('nome')} title="Editar">
                  <FaPencilAlt />
                </button>
              )}
            </div>
            {editingField === 'nome' ? (
              <div className="cp-inline-input-row">
                <input
                  className="cp-inline-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  disabled={fieldSaving}
                />
                <button className="cp-inline-action cp-inline-action--save" onClick={saveField} disabled={fieldSaving} title="Salvar">
                  <FaSave />
                </button>
                <button className="cp-inline-action cp-inline-action--cancel" onClick={cancelEdit} disabled={fieldSaving} title="Cancelar">
                  <FaTimes />
                </button>
              </div>
            ) : (
              <span className="cp-card-value">{condominioData.nome || '—'}</span>
            )}
          </div>
        </div>

        {/* CNPJ — somente leitura */}
        <div className="cp-card">
          <FaIdCard className="cp-card-icon" />
          <div className="cp-card-body">
            <span className="cp-card-label">CNPJ</span>
            <span className="cp-card-value">{formatCNPJ(condominioData.cnpj)}</span>
          </div>
        </div>

        {/* Telefone — editável */}
        <div className="cp-card">
          <FaPhone className="cp-card-icon" />
          <div className="cp-card-body">
            <div className="cp-card-header">
              <span className="cp-card-label">Telefone</span>
              {editingField !== 'telefone' && (
                <button className="cp-inline-edit-btn" onClick={() => startEdit('telefone')} title="Editar">
                  <FaPencilAlt />
                </button>
              )}
            </div>
            {editingField === 'telefone' ? (
              <div className="cp-inline-input-row">
                <input
                  className="cp-inline-input"
                  value={editValue}
                  onChange={(e) => setEditValue(formatTelefone(e.target.value))}
                  onKeyDown={handleKeyDown}
                  placeholder="(00) 00000-0000"
                  autoFocus
                  disabled={fieldSaving}
                />
                <button className="cp-inline-action cp-inline-action--save" onClick={saveField} disabled={fieldSaving} title="Salvar">
                  <FaSave />
                </button>
                <button className="cp-inline-action cp-inline-action--cancel" onClick={cancelEdit} disabled={fieldSaving} title="Cancelar">
                  <FaTimes />
                </button>
              </div>
            ) : (
              <span className="cp-card-value">
                {condominioData.telefone ? formatTelefone(condominioData.telefone) : '—'}
              </span>
            )}
          </div>
        </div>

        {/* Endereço — somente leitura */}
        <div className="cp-card cp-card--full">
          <FaMapMarkerAlt className="cp-card-icon" />
          <div className="cp-card-body">
            <span className="cp-card-label">Endereço</span>
            <span className="cp-card-value">{address || '—'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default CondominioProfile;
