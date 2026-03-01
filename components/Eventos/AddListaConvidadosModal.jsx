import React, { useState } from 'react';
import { FaPlus, FaTimes, FaTrash, FaUsers } from 'react-icons/fa';
import { listaConvidadosAPI } from '../../services/api';
import '../../styles/Modal.css';

const formatarCpf = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const emptyRow = () => ({ cpf: '', nome: '', buscando: false, encontrado: false, erro: '' });

function AddListaConvidadosModal({ onClose, onSuccess }) {
  const [titulo, setTitulo] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [qtdAdicionar, setQtdAdicionar] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleCpfChange = async (idx, valor) => {
    const raw = valor.replace(/\D/g, '').slice(0, 11);
    const formatted = formatarCpf(raw);

    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], cpf: formatted, nome: '', encontrado: false, erro: '' };
      return next;
    });

    if (raw.length === 11) {
      setRows((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], buscando: true };
        return next;
      });
      try {
        const resp = await listaConvidadosAPI.buscarCpfSimples(raw);
        setRows((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            buscando: false,
            nome: resp.data.nome || '',
            encontrado: resp.data.encontrado,
          };
          return next;
        });
      } catch {
        setRows((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], buscando: false };
          return next;
        });
      }
    }
  };

  const handleNomeChange = (idx, valor) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], nome: valor };
      return next;
    });
  };

  const handleAddRows = () => {
    setRows((prev) => [...prev, ...Array.from({ length: qtdAdicionar }, emptyRow)]);
  };

  const handleRemoveRow = (idx) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      setErro('Informe o título da lista.');
      return;
    }

    const cpfIncompleto = rows.some(
      (r) => r.cpf.replace(/\D/g, '').length > 0 && r.cpf.replace(/\D/g, '').length < 11
    );
    if (cpfIncompleto) {
      setErro('Há CPFs incompletos. Complete ou remova as linhas inválidas.');
      return;
    }

    const cpfSemNome = rows.some(
      (r) => r.cpf.replace(/\D/g, '').length === 11 && !r.nome.trim()
    );
    if (cpfSemNome) {
      setErro('Informe o nome para todos os CPFs preenchidos.');
      return;
    }

    const convidados = rows
      .filter((r) => r.cpf.replace(/\D/g, '').length === 11 && r.nome.trim())
      .map((r) => ({ cpf: r.cpf.replace(/\D/g, ''), nome: r.nome.trim() }));

    setSalvando(true);
    setErro('');
    try {
      await listaConvidadosAPI.criarLista({
        titulo: titulo.trim(),
        data_evento: dataEvento || null,
        convidados,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao criar lista.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 660, width: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          className="modal-header"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaUsers style={{ color: '#2abb98' }} />
            Nova Lista de Convidados
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#6b7280' }}
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {/* Título + Data */}
          <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Título *</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Churrasco de aniversário"
                style={s.input}
                autoFocus
              />
            </div>
            <div style={{ width: 170 }}>
              <label style={s.label}>Data do evento</label>
              <input
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          {/* Linhas de convidados */}
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.6rem' }}>
              Convidados
            </p>

            {/* Cabeçalho das colunas */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 170 }}>
                <span style={s.label}>CPF</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={s.label}>Nome</span>
              </div>
              <div style={{ width: 34 }} />
            </div>

            {rows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                {/* CPF */}
                <div style={{ width: 170 }}>
                  <input
                    type="text"
                    value={row.cpf}
                    onChange={(e) => handleCpfChange(idx, e.target.value)}
                    placeholder="000.000.000-00"
                    style={{
                      ...s.input,
                      borderColor: row.encontrado
                        ? '#2abb98'
                        : row.cpf.replace(/\D/g, '').length === 11 && !row.encontrado && !row.buscando
                        ? '#f59e0b'
                        : '#d1d5db',
                    }}
                  />
                </div>

                {/* Nome */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={row.nome}
                    onChange={(e) => handleNomeChange(idx, e.target.value)}
                    placeholder={row.buscando ? 'Buscando nome...' : 'Nome do convidado'}
                    disabled={row.buscando}
                    style={{
                      ...s.input,
                      paddingRight: row.encontrado ? 28 : undefined,
                      color: row.encontrado ? '#059669' : '#111',
                      background: row.buscando ? '#f9fafb' : '#fff',
                    }}
                  />
                  {row.encontrado && (
                    <span
                      style={{
                        position: 'absolute', right: 9, top: '50%',
                        transform: 'translateY(-50%)', color: '#2abb98', fontSize: '0.8rem',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Remover */}
                <button
                  type="button"
                  onClick={() => handleRemoveRow(idx)}
                  disabled={rows.length === 1}
                  title="Remover linha"
                  style={{
                    ...s.iconBtn,
                    opacity: rows.length === 1 ? 0.25 : 1,
                    cursor: rows.length === 1 ? 'default' : 'pointer',
                  }}
                >
                  <FaTrash size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Adicionar mais */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: '0.5rem' }}>
            <input
              type="number"
              min="1"
              max="50"
              value={qtdAdicionar}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setQtdAdicionar(Number.isFinite(v) && v > 0 ? v : 1);
              }}
              style={{ ...s.input, width: 64, textAlign: 'center', paddingLeft: 8 }}
            />
            <button type="button" onClick={handleAddRows} style={s.btnSec}>
              <FaPlus size={11} style={{ marginRight: 5 }} />
              Adicionar {qtdAdicionar > 1 ? `${qtdAdicionar} linhas` : 'linha'}
            </button>
          </div>

          {erro && (
            <p style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: 10, marginBottom: 0 }}>
              {erro}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div
          className="modal-footer"
          style={{
            display: 'flex', gap: 8, justifyContent: 'flex-end',
            padding: '0.75rem 1.25rem', borderTop: '1px solid #e5e7eb',
          }}
        >
          <button onClick={onClose} style={s.btnCancel}>Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={salvando}
            style={{ ...s.btnPrim, opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? 'Criando...' : 'Criar Lista'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: '0.85rem',
    boxSizing: 'border-box',
    outline: 'none',
  },
  iconBtn: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '7px 8px',
    lineHeight: 0,
    color: '#9ca3af',
    flexShrink: 0,
  },
  btnSec: {
    padding: '7px 14px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.83rem',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  btnPrim: {
    padding: '7px 20px',
    background: '#2abb98',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  btnCancel: {
    padding: '7px 14px',
    background: '#f1f5f9',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
};

export default AddListaConvidadosModal;
