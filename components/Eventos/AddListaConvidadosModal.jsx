import React, { useEffect, useState } from 'react';
import { FaPlus, FaTimes, FaTrash, FaUsers } from 'react-icons/fa';
import { espacoAPI, listaConvidadosAPI } from '../../services/api';
import '../../styles/Modal.css';

const formatarCpf = (valor) => {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const emptyRow = () => ({ cpf: '', nome: '', email: '', buscando: false, encontrado: false, erro: '' });

function AddListaConvidadosModal({ onClose, onSuccess, moradorUnidadeId }) {
  const [titulo, setTitulo] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [localTipo, setLocalTipo] = useState('');
  const [espacoId, setEspacoId] = useState('');
  const [espacos, setEspacos] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [qtdAdicionar, setQtdAdicionar] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Importar de listas anteriores
  const [showImportar, setShowImportar] = useState(false);
  const [buscaAnterior, setBuscaAnterior] = useState('');
  const [resultadosAnteriores, setResultadosAnteriores] = useState([]);
  const [buscandoAnteriores, setBuscandoAnteriores] = useState(false);

  useEffect(() => {
    espacoAPI.list().then(r => {
      const lista = Array.isArray(r.data) ? r.data : (r.data.results || []);
      setEspacos(lista);
    }).catch(() => {});
  }, []);

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
            email: (resp.data.email && !next[idx].email) ? resp.data.email : next[idx].email,
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

  const handleEmailChange = (idx, valor) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], email: valor };
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

  const handleBuscarAnterior = async (valor) => {
    setBuscaAnterior(valor);
    if (!valor.trim()) { setResultadosAnteriores([]); return; }
    setBuscandoAnteriores(true);
    try {
      const resp = await listaConvidadosAPI.buscarConvidadosAnteriores(valor.trim());
      setResultadosAnteriores(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setResultadosAnteriores([]);
    } finally {
      setBuscandoAnteriores(false);
    }
  };

  const handleImportarConvidado = (c) => {
    const emptyIdx = rows.findIndex(r => !r.cpf && !r.nome);
    const nova = { cpf: c.cpf_formatado, nome: c.nome, email: c.email || '', buscando: false, encontrado: true, erro: '' };
    if (emptyIdx >= 0) {
      setRows(prev => { const next = [...prev]; next[emptyIdx] = nova; return next; });
    } else {
      setRows(prev => [...prev, nova]);
    }
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      setErro('Informe o título da lista.');
      return;
    }

    if (!dataEvento) {
      setErro('Informe a data do evento.');
      return;
    }

    if (localTipo === 'espaco' && !espacoId) {
      setErro('Selecione o espaço do condomínio.');
      return;
    }
    if (localTipo === 'unidade' && !moradorUnidadeId) {
      setErro('Sua conta não possui unidade cadastrada.');
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
      .map((r) => ({ cpf: r.cpf.replace(/\D/g, ''), nome: r.nome.trim(), email: r.email.trim() }));

    const payload = {
      titulo: titulo.trim(),
      data_evento: dataEvento || null,
      convidados,
    };
    if (localTipo) {
      payload.local_tipo = localTipo;
      if (localTipo === 'espaco') payload.espaco = espacoId || null;
      if (localTipo === 'unidade') payload.unidade_evento = moradorUnidadeId || null;
    }

    setSalvando(true);
    setErro('');
    try {
      await listaConvidadosAPI.criarLista(payload);
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
        style={{ maxWidth: 700, width: '95vw' }}
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
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
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
              <label style={s.label}>Data do evento *</label>
              <input
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          {/* Local do evento */}
          <div style={{ marginBottom: '1rem', background: '#f9fafb', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid #e5e7eb' }}>
            <label style={{ ...s.label, marginBottom: 8 }}>Local do Evento</label>
            <div style={{ display: 'flex', gap: 16, marginBottom: localTipo ? 8 : 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="local_tipo"
                  value="espaco"
                  checked={localTipo === 'espaco'}
                  onChange={() => { setLocalTipo('espaco'); setEspacoId(''); }}
                  style={{ accentColor: '#2abb98' }}
                />
                Espaço do Condomínio
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="local_tipo"
                  value="unidade"
                  checked={localTipo === 'unidade'}
                  onChange={() => setLocalTipo('unidade')}
                  style={{ accentColor: '#2abb98' }}
                />
                Minha Unidade
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="local_tipo"
                  value=""
                  checked={localTipo === ''}
                  onChange={() => setLocalTipo('')}
                  style={{ accentColor: '#2abb98' }}
                />
                Não informar
              </label>
            </div>
            {localTipo === 'espaco' && (
              <select
                value={espacoId}
                onChange={(e) => setEspacoId(e.target.value)}
                style={{ ...s.input, marginTop: 4 }}
              >
                <option value="">Selecione o espaço...</option>
                {espacos.map(esp => (
                  <option key={esp.id} value={esp.id}>{esp.nome}</option>
                ))}
              </select>
            )}
            {localTipo === 'unidade' && (
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '4px 0 0' }}>
                Será usada a sua unidade cadastrada no sistema.
              </p>
            )}
          </div>

          {/* Linhas de convidados */}
          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.6rem' }}>
              Convidados
            </p>

            {/* Cabeçalho das colunas */}
            <div className="convidado-col-header">
              <div className="col-cpf">
                <span style={s.label}>CPF</span>
              </div>
              <div className="col-nome">
                <span style={s.label}>Nome</span>
              </div>
              <div className="col-email">
                <span style={s.label}>E-mail (opcional)</span>
              </div>
              <div className="col-acao" />
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="convidado-row">
                {/* CPF */}
                <div className="col-cpf">
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
                <div className="col-nome">
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

                {/* E-mail */}
                <div className="col-email">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => handleEmailChange(idx, e.target.value)}
                    placeholder="E-mail (opcional)"
                    style={s.input}
                  />
                </div>

                {/* Remover */}
                <div className="col-acao">
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
              </div>
            ))}
          </div>

          {/* Importar de listas anteriores */}
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => { setShowImportar(v => !v); setBuscaAnterior(''); setResultadosAnteriores([]); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
            >
              📋 {showImportar ? 'Fechar busca de listas anteriores' : 'Importar convidado de lista anterior'}
            </button>
            {showImportar && (
              <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF..."
                  value={buscaAnterior}
                  onChange={(e) => handleBuscarAnterior(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none', marginBottom: 6 }}
                  autoFocus
                />
                {buscandoAnteriores && (
                  <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Buscando...</p>
                )}
                {!buscandoAnteriores && buscaAnterior && resultadosAnteriores.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Nenhum convidado encontrado.</p>
                )}
                {!buscaAnterior && (
                  <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Digite o nome ou CPF para buscar.</p>
                )}
                {resultadosAnteriores.map(c => (
                  <div key={c.cpf} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 4 }}>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                      <div style={{ fontSize: '0.73rem', color: '#6b7280' }}>{c.cpf_formatado}{c.email ? ` • ${c.email}` : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImportarConvidado(c)}
                      style={{ background: '#2abb98', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0, marginLeft: 8 }}
                    >
                      + Adicionar
                    </button>
                  </div>
                ))}
              </div>
            )}
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
