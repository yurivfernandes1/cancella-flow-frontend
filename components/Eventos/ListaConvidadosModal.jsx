import React, { useCallback, useState } from 'react';
import { FaCheck, FaPencilAlt, FaPlus, FaTimes, FaTrash, FaUsers } from 'react-icons/fa';
import { listaConvidadosAPI } from '../../services/api';

/**
 * ListaConvidadosModal
 * Props:
 *   lista     — objeto da lista { id, titulo, data_evento, morador_nome, convidados, ... }
 *   onClose   — função para fechar o modal
 *   readOnly  — true = apenas visualização (portaria / síndico), false = edição (morador)
 *   onUpdate  — callback chamado após salvar/excluir para recarregar a tabela pai
 */
function ListaConvidadosModal({ lista: listaInicial, onClose, readOnly = false, onUpdate }) {
  const [lista, setLista] = useState(listaInicial);
  const [erro, setErro] = useState('');

  // Estado de edição inline por convidado: { [id]: { cpf, nome, buscando, encontrado, salvando, erro } }
  const [editStates, setEditStates] = useState({});

  // Formulário multi-linha para adicionar convidados
  const [novasLinhas, setNovasLinhas] = useState([{ cpf: '', nome: '', buscando: false, encontrado: false }]);
  const [qtdNovas, setQtdNovas] = useState(1);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [erroLote, setErroLote] = useState('');

  // Edição do cabeçalho (título / data)
  const [editandoCabecalho, setEditandoCabecalho] = useState(false);
  const [tituloEdit, setTituloEdit] = useState(listaInicial.titulo || '');
  const [dataEdit, setDataEdit] = useState(listaInicial.data_evento || '');
  const [salvandoCabecalho, setSalvandoCabecalho] = useState(false);
  const [erroCabecalho, setErroCabecalho] = useState('');

  const formatarCpf = (valor) => {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatarData = (d) => {
    if (!d) return '—';
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSalvarCabecalho = async () => {
    if (!tituloEdit.trim()) { setErroCabecalho('Título é obrigatório.'); return; }
    setSalvandoCabecalho(true);
    setErroCabecalho('');
    try {
      const resp = await listaConvidadosAPI.atualizarLista(lista.id, {
        titulo: tituloEdit.trim(),
        data_evento: dataEdit || null,
      });
      setLista(resp.data);
      setEditandoCabecalho(false);
      onUpdate?.();
    } catch {
      setErroCabecalho('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvandoCabecalho(false);
    }
  };

  const recarregarLista = useCallback(async () => {
    try {
      const resp = await listaConvidadosAPI.getLista(lista.id);
      setLista(resp.data);
      setEditStates({});
    } catch {
      setErro('Erro ao recarregar lista.');
    }
  }, [lista.id]);

  // ── Edição inline de convidado existente ──────────────────────────────────

  const startEdit = (convidado) => {
    setEditStates((prev) => ({
      ...prev,
      [convidado.id]: {
        cpf: formatarCpf(convidado.cpf),
        nome: convidado.nome,
        buscando: false,
        encontrado: false,
        salvando: false,
        erro: '',
      },
    }));
  };

  const cancelEdit = (id) => {
    setEditStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleEditCpfChange = async (id, valor) => {
    const raw = valor.replace(/\D/g, '').slice(0, 11);
    const formatted = formatarCpf(raw);
    setEditStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], cpf: formatted, nome: '', encontrado: false, erro: '' },
    }));
    if (raw.length === 11) {
      setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], buscando: true } }));
      try {
        const resp = await listaConvidadosAPI.buscarCpfSimples(raw);
        setEditStates((prev) => ({
          ...prev,
          [id]: { ...prev[id], buscando: false, nome: resp.data.nome || '', encontrado: resp.data.encontrado },
        }));
      } catch {
        setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], buscando: false } }));
      }
    }
  };

  const handleEditNomeChange = (id, valor) => {
    setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], nome: valor } }));
  };

  const handleSaveEdit = async (id) => {
    const es = editStates[id];
    const cpfRaw = es.cpf.replace(/\D/g, '');
    if (cpfRaw.length !== 11) {
      setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], erro: 'CPF inválido.' } }));
      return;
    }
    if (!es.nome.trim()) {
      setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], erro: 'Informe o nome.' } }));
      return;
    }
    setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], salvando: true, erro: '' } }));
    try {
      await listaConvidadosAPI.atualizarConvidado(lista.id, id, { cpf: cpfRaw, nome: es.nome.trim() });
      await recarregarLista();
      onUpdate?.();
    } catch (e) {
      const msg = e.response?.data?.error || 'Erro ao salvar.';
      setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], salvando: false, erro: msg } }));
    }
  };

  const handleRemoverConvidado = async (convidadoId) => {
    if (!window.confirm('Remover este convidado da lista?')) return;
    try {
      await listaConvidadosAPI.removerConvidado(lista.id, convidadoId);
      await recarregarLista();
      onUpdate?.();
    } catch {
      alert('Erro ao remover convidado.');
    }
  };

  // ── Adicionar múltiplos convidados ───────────────────────────────────────

  const handleNovaLinhaCpfChange = async (idx, valor) => {
    const raw = valor.replace(/\D/g, '').slice(0, 11);
    const fmt = formatarCpf(raw);
    setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, cpf: fmt, nome: '', buscando: false, encontrado: false } : l));
    if (raw.length === 11) {
      setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, buscando: true } : l));
      try {
        const resp = await listaConvidadosAPI.buscarCpfSimples(raw);
        setNovasLinhas((prev) => prev.map((l, i) =>
          i === idx ? { ...l, buscando: false, nome: resp.data.nome || '', encontrado: resp.data.encontrado } : l
        ));
      } catch {
        setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, buscando: false } : l));
      }
    }
  };

  const handleNovaLinhaNomeChange = (idx, valor) => {
    setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, nome: valor } : l));
  };

  const handleNovaLinhaRemove = (idx) => {
    setNovasLinhas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddLinhas = () => {
    setNovasLinhas((prev) => [
      ...prev,
      ...Array.from({ length: qtdNovas }, () => ({ cpf: '', nome: '', buscando: false, encontrado: false })),
    ]);
  };

  const handleSalvarLote = async () => {
    const validas = novasLinhas.filter((l) => l.cpf.replace(/\D/g, '').length === 11 && l.nome.trim());
    if (!validas.length) { setErroLote('Preencha CPF e nome de ao menos um convidado.'); return; }
    setSalvandoLote(true);
    setErroLote('');
    const erros = [];
    let sucessos = 0;
    for (const l of validas) {
      try {
        await listaConvidadosAPI.adicionarConvidado(lista.id, l.cpf.replace(/\D/g, ''), l.nome.trim());
        sucessos++;
      } catch (e) {
        erros.push(e.response?.data?.error || `Erro ao adicionar ${l.nome}`);
      }
    }
    setSalvandoLote(false);
    if (erros.length) setErroLote(erros.join(' | '));
    if (sucessos > 0) {
      setNovasLinhas([{ cpf: '', nome: '', buscando: false, encontrado: false }]);
      await recarregarLista();
      onUpdate?.();
    }
  };

  const convidados = lista?.convidados || [];

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
          {editandoCabecalho ? (
            <div style={{ flex: 1, marginRight: 12 }}>
              <input
                value={tituloEdit}
                onChange={(e) => setTituloEdit(e.target.value)}
                placeholder="Título da lista"
                disabled={salvandoCabecalho}
                style={{
                  width: '100%', padding: '5px 8px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: '0.95rem', fontWeight: 600,
                  boxSizing: 'border-box', marginBottom: 4, outline: 'none',
                }}
              />
              <input
                type="date"
                value={dataEdit}
                onChange={(e) => setDataEdit(e.target.value)}
                disabled={salvandoCabecalho}
                style={{
                  padding: '4px 8px', border: '1px solid #d1d5db',
                  borderRadius: 6, fontSize: '0.8rem', marginBottom: 4, outline: 'none',
                }}
              />
              {erroCabecalho && <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '0 0 4px' }}>{erroCabecalho}</p>}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleSalvarCabecalho}
                  disabled={salvandoCabecalho}
                  style={{ background: '#2abb98', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, opacity: salvandoCabecalho ? 0.6 : 1 }}
                >
                  <FaCheck size={10} /> {salvandoCabecalho ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => { setEditandoCabecalho(false); setErroCabecalho(''); }}
                  style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaUsers style={{ color: '#2abb98' }} />
                {lista.titulo}
                {!readOnly && (
                  <button
                    onClick={() => { setTituloEdit(lista.titulo || ''); setDataEdit(lista.data_evento || ''); setEditandoCabecalho(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, lineHeight: 0 }}
                    title="Editar título e data"
                  >
                    <FaPencilAlt size={11} />
                  </button>
                )}
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                {lista.data_evento ? `Data do evento: ${formatarData(lista.data_evento)}` : 'Sem data definida'}
                {lista.morador_nome && readOnly ? ` • ${lista.morador_nome}` : ''}
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#6b7280' }}
          >
            <FaTimes />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1rem 1.25rem' }}>
          {erro && <p style={{ color: '#dc2626', textAlign: 'center', fontSize: '0.85rem' }}>{erro}</p>}

          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
            {convidados.length} convidado{convidados.length !== 1 ? 's' : ''}
          </p>

          {/* Tabela de convidados */}
          {convidados.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem', padding: '1rem 0' }}>
              {readOnly ? 'Nenhum convidado nesta lista.' : 'Adicione convidados abaixo.'}
            </p>
          ) : (
            <div
              style={{
                maxHeight: 340,
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: '1.25rem',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={th}>Nome</th>
                    <th style={th}>CPF</th>
                    {!readOnly && <th style={{ ...th, width: 84 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {convidados.map((c) => {
                    const es = editStates[c.id];
                    const editing = Boolean(es);
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {editing ? (
                          <>
                            {/* Nome editável */}
                            <td style={td}>
                              <input
                                type="text"
                                value={es.nome}
                                onChange={(e) => handleEditNomeChange(c.id, e.target.value)}
                                disabled={es.buscando || es.salvando}
                                placeholder="Nome"
                                style={{
                                  ...inlineInput,
                                  color: es.encontrado ? '#059669' : '#111',
                                  background: es.buscando ? '#f9fafb' : '#fff',
                                }}
                              />
                              {es.erro && (
                                <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: '2px 0 0' }}>
                                  {es.erro}
                                </p>
                              )}
                            </td>
                            {/* CPF editável */}
                            <td style={td}>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="text"
                                  value={es.cpf}
                                  onChange={(e) => handleEditCpfChange(c.id, e.target.value)}
                                  disabled={es.salvando}
                                  placeholder="000.000.000-00"
                                  style={{
                                    ...inlineInput,
                                    paddingRight: 26,
                                    borderColor: es.encontrado ? '#2abb98' : '#d1d5db',
                                  }}
                                />
                                {es.encontrado && (
                                  <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#2abb98', fontSize: '0.75rem' }}>✓</span>
                                )}
                                {es.buscando && (
                                  <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.72rem' }}>...</span>
                                )}
                              </div>
                            </td>
                            {/* Salvar / Cancelar */}
                            <td style={{ ...td, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleSaveEdit(c.id)}
                                  disabled={es.salvando || es.buscando}
                                  title="Salvar"
                                  style={{
                                    ...iconBtn,
                                    color: '#2abb98',
                                    borderColor: '#86efac',
                                    opacity: es.salvando || es.buscando ? 0.5 : 1,
                                  }}
                                >
                                  <FaCheck size={11} />
                                </button>
                                <button onClick={() => cancelEdit(c.id)} title="Cancelar" style={iconBtn}>
                                  <FaTimes size={11} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={td}>{c.nome}</td>
                            <td style={{ ...td, color: '#6b7280' }}>{c.cpf_formatado || c.cpf}</td>
                            {!readOnly && (
                              <td style={{ ...td, textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => startEdit(c)}
                                    title="Editar"
                                    style={{ ...iconBtn, color: '#6b7280' }}
                                  >
                                    <FaPencilAlt size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleRemoverConvidado(c.id)}
                                    title="Remover"
                                    style={{ ...iconBtn, color: '#dc2626', borderColor: '#fca5a5' }}
                                  >
                                    <FaTrash size={11} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Formulário multi-linha — somente morador */}
          {!readOnly && (
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              {/* Cabeçalho: título + controle de adicionar linhas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', margin: 0 }}>
                  <FaPlus size={10} style={{ marginRight: 5 }} />Adicionar convidados
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={qtdNovas}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setQtdNovas(Number.isFinite(v) && v > 0 ? v : 1);
                    }}
                    style={{ width: 52, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: '0.82rem', textAlign: 'center', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddLinhas}
                    style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <FaPlus size={9} /> {qtdNovas > 1 ? `${qtdNovas} linhas` : 'linha'}
                  </button>
                </div>
              </div>

              {/* Linhas de CPF + Nome */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 210, overflowY: 'auto', marginBottom: 8, paddingRight: 2 }}>
                {novasLinhas.map((l, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '0 0 158px' }}>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={l.cpf}
                        onChange={(e) => handleNovaLinhaCpfChange(idx, e.target.value)}
                        style={{
                          width: '100%', padding: '6px 26px 6px 8px',
                          border: `1px solid ${l.encontrado ? '#2abb98' : '#d1d5db'}`,
                          borderRadius: 5, fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none',
                        }}
                      />
                      {l.buscando && (
                        <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: '#9ca3af' }}>...</span>
                      )}
                      {!l.buscando && l.encontrado && (
                        <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#2abb98' }}>✓</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Nome do convidado"
                      value={l.nome}
                      onChange={(e) => handleNovaLinhaNomeChange(idx, e.target.value)}
                      style={{
                        flex: 1, padding: '6px 8px', border: '1px solid #d1d5db',
                        borderRadius: 5, fontSize: '0.83rem', outline: 'none',
                        color: l.encontrado ? '#059669' : '#111',
                      }}
                    />
                    {novasLinhas.length > 1 && (
                      <button
                        onClick={() => handleNovaLinhaRemove(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px', lineHeight: 0 }}
                        title="Remover linha"
                      >
                        <FaTimes size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {erroLote && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginBottom: 6 }}>{erroLote}</p>}

              <button
                onClick={handleSalvarLote}
                disabled={salvandoLote}
                style={{
                  background: '#2abb98', color: '#fff', border: 'none', borderRadius: 6,
                  padding: '7px 18px', cursor: 'pointer', fontSize: '0.85rem',
                  opacity: salvandoLote ? 0.6 : 1,
                }}
              >
                {salvandoLote ? 'Salvando...' : 'Salvar convidados'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const th = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '0.8rem' };
const td = { padding: '8px 12px', verticalAlign: 'middle' };
const inlineInput = {
  width: '100%', padding: '4px 8px', border: '1px solid #d1d5db',
  borderRadius: 5, fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none',
};
const iconBtn = {
  background: 'none', border: '1px solid #e5e7eb', borderRadius: 5,
  cursor: 'pointer', padding: '4px 6px', lineHeight: 0, color: '#6b7280',
};

export default ListaConvidadosModal;
