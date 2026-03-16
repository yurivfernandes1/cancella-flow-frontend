import React, { useState } from 'react';
import { FaSave, FaTimes, FaPlus, FaTrash, FaUserPlus, FaUserMinus, FaCopy } from 'react-icons/fa';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { generateStrongPassword } from '../../utils/passwordGenerator';
import { formatUsername } from '../../utils/stringUtils';
import { formatCPF, formatTelefone } from '../../utils/formatters';
import { validateCPF, validatePhone } from '../../utils/validators';
import '../../styles/Modal.css';

function AddUnidadeModal({ onClose, onSuccess }) {
  const { user: currentUser } = useAuth();
  const emptyMorador = () => ({ first_name: '', last_name: '', email: '', cpf: '', phone: '' });
  const [unidades, setUnidades] = useState([
    { numero: '', bloco: '', addMorador: false, moradorData: emptyMorador() }
  ]);
  const [loading, setLoading] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const handleRemoveRow = (index) => {
    if (unidades.length === 1) {
      alert('Deve haver pelo menos uma unidade.');
      return;
    }
    setUnidades(unidades.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const newUnidades = [...unidades];
    newUnidades[index] = { ...newUnidades[index], [field]: value };
    setUnidades(newUnidades);
  };

  const handleToggleMorador = (index) => {
    const newUnidades = [...unidades];
    newUnidades[index] = { ...newUnidades[index], addMorador: !newUnidades[index].addMorador };
    setUnidades(newUnidades);
  };

  const handleMoradorChange = (index, field, value) => {
    const newUnidades = [...unidades];
    newUnidades[index] = {
      ...newUnidades[index],
      moradorData: { ...newUnidades[index].moradorData, [field]: value },
    };
    setUnidades(newUnidades);
  };

  const createMoradorForUnidade = async (moradorData, unidadeId) => {
    const password = generateStrongPassword();
    const username = formatUsername(moradorData.first_name, moradorData.last_name);
    const userData = {
      username,
      password: password.trim(),
      first_name: moradorData.first_name.trim(),
      last_name: moradorData.last_name.trim(),
      full_name: `${moradorData.first_name} ${moradorData.last_name}`.trim(),
      email: moradorData.email.trim(),
      cpf: moradorData.cpf?.replace(/\D/g, '') || '',
      phone: moradorData.phone?.replace(/\D/g, '') || '',
      first_access: true,
      is_active: true,
      user_type: 'morador',
      unidade_id: unidadeId,
    };
    if (currentUser?.condominio_id) {
      userData.condominio_id = currentUser.condominio_id;
    }
    await api.post('/access/create/', userData);
    return { username, password: password.trim() };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const invalidas = unidades.filter(u => !u.numero?.trim());
    if (invalidas.length > 0) {
      alert('Todas as unidades devem ter um número informado.');
      return;
    }

    // Validate morador fields for rows with addMorador
    for (let i = 0; i < unidades.length; i++) {
      const u = unidades[i];
      if (!u.addMorador) continue;
      const m = u.moradorData;
      if (!m.first_name?.trim() || !m.last_name?.trim()) {
        alert(`Unidade ${u.numero}: informe nome e sobrenome do morador.`);
        return;
      }
      if (!m.email?.trim()) {
        alert(`Unidade ${u.numero}: informe o e-mail do morador.`);
        return;
      }
      const cpfDigits = (m.cpf || '').replace(/\D/g, '');
      if (cpfDigits && !validateCPF(cpfDigits)) {
        alert(`Unidade ${u.numero}: CPF do morador inválido.`);
        return;
      }
      const phoneDigits = (m.phone || '').replace(/\D/g, '');
      if (phoneDigits && !validatePhone(phoneDigits)) {
        alert(`Unidade ${u.numero}: telefone do morador inválido.`);
        return;
      }
    }

    setLoading(true);

    try {
      const unidadesData = unidades.map(u => ({
        numero: u.numero.trim(),
        bloco: u.bloco?.trim() || '',
      }));

      let createdUnidadeIds = [];

      if (unidadesData.length === 1) {
        const response = await api.post('/cadastros/unidades/create/', unidadesData[0]);
        createdUnidadeIds = [response.data.id];
      } else {
        const response = await api.post('/cadastros/unidades/create-bulk/', { unidades: unidadesData });
        createdUnidadeIds = (response.data.unidades || []).map(u => u.id);
      }

      // Create moradores for units that requested it
      const accounts = [];
      for (let i = 0; i < unidades.length; i++) {
        if (unidades[i].addMorador && createdUnidadeIds[i]) {
          const account = await createMoradorForUnidade(unidades[i].moradorData, createdUnidadeIds[i]);
          accounts.push({ ...account, unidade: unidades[i].numero });
        }
      }

      if (accounts.length > 0) {
        setCreatedAccounts(accounts);
        setShowCredentials(true);
      } else {
        const count = unidadesData.length;
        setSuccessCount(count);
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Erro ao cadastrar unidades:', error);
      alert('Erro ao cadastrar: ' + (error.response?.data?.error || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // If accounts were created, show credentials screen
  if (showCredentials) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Moradores Cadastrados</h2>
            <button className="modal-close" onClick={onClose}><FaTimes /></button>
          </div>
          <div className="modal-content">
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>
              Contas criadas com sucesso. Por segurança as senhas não são exibidas aqui.
            </p>
            <table className="unidades-form-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Usuário</th>
                  {/* Senha não exibida por segurança */}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {createdAccounts.map((acc, idx) => (
                  <tr key={idx}>
                    <td>{acc.unidade}</td>
                    <td>{acc.username}</td>
                    <td />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="button-primary"
              onClick={() => { onSuccess(); onClose(); }}
            >
              <FaSave /> Concluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Unidades Cadastradas</h2>
            <button className="modal-close" onClick={onClose}><FaTimes /></button>
          </div>
          <div className="modal-content">
            <p>{successCount} unidade{successCount > 1 ? 's' : ''} cadastrada{successCount > 1 ? 's' : ''} com sucesso!</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="button-primary" onClick={() => { onSuccess(); onClose(); }}>
              <FaSave /> OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cadastrar Unidades</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="unidades-table-container">
              <table className="unidades-form-table">
                <thead>
              <tr>
                <th>Número*</th>
                <th>Bloco</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((unidade, index) => (
                <React.Fragment key={index}>
                  <tr className="unidade-main-row">
                    <td>
                      <input
                        type="text"
                        value={unidade.numero}
                        onChange={(e) => handleChange(index, 'numero', e.target.value)}
                        placeholder="Ex: 101"
                        required
                        className="form-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={unidade.bloco}
                        onChange={(e) => handleChange(index, 'bloco', e.target.value)}
                        placeholder="Ex: A (opcional)"
                        className="form-input"
                      />
                    </td>
                    <td>
                      <div className="unidade-actions" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleMorador(index)}
                          className={`action-button ${unidade.addMorador ? 'save-button' : 'edit-button'}`}
                          title={unidade.addMorador ? 'Remover morador' : 'Adicionar morador'}
                        >
                          {unidade.addMorador ? <FaUserMinus /> : <FaUserPlus />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="action-button cancel-button"
                          title="Remover linha"
                          disabled={unidades.length === 1}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {unidade.addMorador && (
                    <tr className="unidade-morador-row">
                      <td className="unidade-morador-cell" colSpan={3} style={{ background: '#f8fafc', padding: '10px 16px 14px' }}>
                        <p style={{ fontSize: '0.78rem', color: '#2abb98', fontWeight: 600, marginBottom: 8, marginTop: 0 }}>
                          <FaUserPlus style={{ marginRight: 5 }} />
                          Morador para a unidade {unidade.numero || ''}
                        </p>
                        <div className="morador-grid">
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 3 }}>Nome*</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Nome"
                              value={unidade.moradorData.first_name}
                              onChange={(e) => handleMoradorChange(index, 'first_name', e.target.value)}
                              required={unidade.addMorador}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 3 }}>Sobrenome*</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Sobrenome"
                              value={unidade.moradorData.last_name}
                              onChange={(e) => handleMoradorChange(index, 'last_name', e.target.value)}
                              required={unidade.addMorador}
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 3 }}>E-mail*</label>
                            <input
                              type="email"
                              className="form-input"
                              placeholder="email@exemplo.com"
                              value={unidade.moradorData.email}
                              onChange={(e) => handleMoradorChange(index, 'email', e.target.value)}
                              required={unidade.addMorador}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 3 }}>CPF</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="000.000.000-00"
                              value={formatCPF(String(unidade.moradorData.cpf || '').replace(/\D/g, '').slice(0, 11))}
                              onChange={(e) => handleMoradorChange(index, 'cpf', e.target.value.replace(/\D/g, '').slice(0, 11))}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: 3 }}>Telefone</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="(00) 00000-0000"
                              value={formatTelefone(String(unidade.moradorData.phone || '').replace(/\D/g, '').slice(0, 11))}
                              onChange={(e) => handleMoradorChange(index, 'phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
                </tbody>
              </table>
            </div>

            <div className="add-row-section" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="add-row-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={1}
                  placeholder="Qtd. de linhas"
                  id="bulk-add-count"
                  className="add-row-count"
                  style={{ width: 110, padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '1rem' }}
                />
                <button
                  type="button"
                  className="add-row-button"
                  onClick={() => {
                    const input = document.getElementById('bulk-add-count');
                    const qtd = Math.max(1, Math.min(200, parseInt(input?.value || '1', 10)));
                    if (!qtd || Number.isNaN(qtd)) return;
                    const last = unidades[unidades.length - 1] || { bloco: '' };
                    const novas = Array.from({ length: qtd }, () => ({
                      numero: '', bloco: last.bloco || '', addMorador: false, moradorData: emptyMorador()
                    }));
                    setUnidades([...unidades, ...novas]);
                    input.value = '1';
                  }}
                >
                  <FaPlus /> Adicionar Linhas
                </button>
              </div>
              <span className="helper-text">
                As novas linhas copiarão o bloco da última linha
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="button-secondary" onClick={onClose}>
              <FaTimes /> Cancelar
            </button>
            <button type="submit" className="button-primary" disabled={loading}>
              <FaSave /> {loading ? 'Salvando...' : `Cadastrar ${unidades.length} Unidade${unidades.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUnidadeModal;
