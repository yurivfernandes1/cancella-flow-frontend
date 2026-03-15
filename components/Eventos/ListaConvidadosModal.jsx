import React, { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaCheckCircle, FaClock, FaCopy, FaEnvelope, FaPencilAlt, FaPlus, FaTimes, FaTrash, FaUsers } from 'react-icons/fa';
import { espacoAPI, listaConvidadosAPI } from '../../services/api';

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
  const [novasLinhas, setNovasLinhas] = useState([{ cpf: '', nome: '', email: '', buscando: false, encontrado: false }]);
  const [qtdNovas, setQtdNovas] = useState(1);
  const [salvandoLote, setSalvandoLote] = useState(false);
  const [erroLote, setErroLote] = useState('');

  // Importar de listas anteriores
  const [showImportar, setShowImportar] = useState(false);
  const [buscaAnterior, setBuscaAnterior] = useState('');
  const [resultadosAnteriores, setResultadosAnteriores] = useState([]);
  const [buscandoAnteriores, setBuscandoAnteriores] = useState(false);

  // Estado de confirmação de entrada por convidado: { [id]: boolean }
  const [confirmandoId, setConfirmandoId] = useState(null);

  // Estado de envio de QR por convidado: { [id]: 'idle' | 'sending' | 'ok' | 'error' }
  const [qrStatus, setQrStatus] = useState({});
  const [qrErro, setQrErro] = useState({});
  const [qrCopyStatus, setQrCopyStatus] = useState({});

  // Edição do cabeçalho (título / data)
  const [editandoCabecalho, setEditandoCabecalho] = useState(false);
  const [tituloEdit, setTituloEdit] = useState(listaInicial.titulo || '');
  const [dataEdit, setDataEdit] = useState(listaInicial.data_evento || '');
  const [localTipoEdit, setLocalTipoEdit] = useState(listaInicial.local_tipo || '');
  const [espacoEdit, setEspacoEdit] = useState(listaInicial.espaco ? String(listaInicial.espaco) : '');
  const [espacos, setEspacos] = useState([]);
  const [salvandoCabecalho, setSalvandoCabecalho] = useState(false);
  const [erroCabecalho, setErroCabecalho] = useState('');

  useEffect(() => {
    if (!readOnly) {
      espacoAPI.list().then(r => {
        const lista = Array.isArray(r.data) ? r.data : (r.data.results || []);
        setEspacos(lista);
      }).catch(() => {});
    }
  }, [readOnly]);

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
    if (localTipoEdit === 'espaco' && !espacoEdit) { setErroCabecalho('Selecione o espaço do condomínio.'); return; }
    setSalvandoCabecalho(true);
    setErroCabecalho('');
    try {
      const payload = {
        titulo: tituloEdit.trim(),
        data_evento: dataEdit || null,
        local_tipo: localTipoEdit,
        espaco: localTipoEdit === 'espaco' ? (espacoEdit || null) : null,
        unidade_evento: localTipoEdit === 'unidade' ? (lista.unidade_evento || null) : null,
      };
      const resp = await listaConvidadosAPI.atualizarLista(lista.id, payload);
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
        email: convidado.email || '',
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

  const handleEditEmailChange = (id, valor) => {
    setEditStates((prev) => ({ ...prev, [id]: { ...prev[id], email: valor } }));
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
      await listaConvidadosAPI.atualizarConvidado(lista.id, id, { cpf: cpfRaw, nome: es.nome.trim(), email: es.email.trim() });
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

  const handleConfirmarEntrada = async (convidadoId) => {
    setConfirmandoId(convidadoId);
    try {
      const resp = await listaConvidadosAPI.confirmarEntrada(lista.id, convidadoId);
      setLista(prev => ({
        ...prev,
        convidados: prev.convidados.map(c =>
          c.id === convidadoId ? { ...c, ...resp.data } : c
        ),
      }));
    } catch {
      alert('Erro ao confirmar entrada.');
    } finally {
      setConfirmandoId(null);
    }
  };

  const handleEnviarQrCode = async (convidadoId) => {
    setQrStatus(prev => ({ ...prev, [convidadoId]: 'sending' }));
    setQrErro(prev => ({ ...prev, [convidadoId]: '' }));
    try {
      await listaConvidadosAPI.enviarQrCode(lista.id, convidadoId);
      setQrStatus(prev => ({ ...prev, [convidadoId]: 'ok' }));
      setTimeout(() => setQrStatus(prev => ({ ...prev, [convidadoId]: 'idle' })), 3000);
    } catch (e) {
      setQrStatus(prev => ({ ...prev, [convidadoId]: 'error' }));
      setQrErro(prev => ({ ...prev, [convidadoId]: e.response?.data?.error || 'Erro ao enviar.' }));
    }
  };

  const handleCopyQr = async (convidadoId, qrToken) => {
    if (!qrToken) return;
    try {
      await navigator.clipboard.writeText(String(qrToken));
      setQrCopyStatus(prev => ({ ...prev, [convidadoId]: 'copied' }));
      setTimeout(() => setQrCopyStatus(prev => ({ ...prev, [convidadoId]: 'idle' })), 2000);
    } catch {
      setQrCopyStatus(prev => ({ ...prev, [convidadoId]: 'error' }));
      setTimeout(() => setQrCopyStatus(prev => ({ ...prev, [convidadoId]: 'idle' })), 2500);
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
          i === idx ? {
            ...l,
            buscando: false,
            nome: resp.data.nome || '',
            email: (resp.data.email && !l.email) ? resp.data.email : l.email,
            encontrado: resp.data.encontrado,
          } : l
        ));
      } catch {
        setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, buscando: false } : l));
      }
    }
  };

  const handleNovaLinhaNomeChange = (idx, valor) => {
    setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, nome: valor } : l));
  };

  const handleNovaLinhaEmailChange = (idx, valor) => {
    setNovasLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, email: valor } : l));
  };

  const handleNovaLinhaRemove = (idx) => {
    setNovasLinhas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddLinhas = () => {
    setNovasLinhas((prev) => [
      ...prev,
      ...Array.from({ length: qtdNovas }, () => ({ cpf: '', nome: '', email: '', buscando: false, encontrado: false })),
    ]);
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

  const handleImportarNovaLinha = (c) => {
    const emptyIdx = novasLinhas.findIndex(l => !l.cpf && !l.nome);
    const nova = { cpf: c.cpf_formatado, nome: c.nome, email: c.email || '', buscando: false, encontrado: true };
    if (emptyIdx >= 0) {
      setNovasLinhas(prev => prev.map((l, i) => i === emptyIdx ? nova : l));
    } else {
      setNovasLinhas(prev => [...prev, nova]);
    }
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
        await listaConvidadosAPI.adicionarConvidado(lista.id, l.cpf.replace(/\D/g, ''), l.nome.trim(), l.email || '');
        sucessos++;
      } catch (e) {
        erros.push(e.response?.data?.error || `Erro ao adicionar ${l.nome}`);
      }
    }
    setSalvandoLote(false);
    if (erros.length) setErroLote(erros.join(' | '));
    if (sucessos > 0) {
      setNovasLinhas([{ cpf: '', nome: '', email: '', buscando: false, encontrado: false }]);
      await recarregarLista();
      onUpdate?.();
    }
  };

  const formatarDataHora = (dt) => {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const convidados = lista?.convidados || [];
  const [filtro, setFiltro] = useState('');

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
              {/* Local do evento */}
              <div style={{ margin: '4px 0', background: '#f9fafb', borderRadius: 6, padding: '7px 10px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Local do Evento</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: localTipoEdit ? 6 : 0 }}>
                  {[{ v: 'espaco', l: 'Espaço do Cond.' }, { v: 'unidade', l: 'Minha Unidade' }, { v: '', l: 'Não informar' }].map(({ v, l }) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="localTipoEdit"
                        value={v}
                        checked={localTipoEdit === v}
                        onChange={() => { setLocalTipoEdit(v); if (v !== 'espaco') setEspacoEdit(''); }}
                        disabled={salvandoCabecalho}
                        style={{ accentColor: '#2abb98' }}
                      />
                      {l}
                    </label>
                  ))}
                </div>
                {localTipoEdit === 'espaco' && (
                  <select
                    value={espacoEdit}
                    onChange={(e) => setEspacoEdit(e.target.value)}
                    disabled={salvandoCabecalho}
                    style={{ width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8rem', outline: 'none' }}
                  >
                    <option value="">Selecione o espaço...</option>
                    {espacos.map(esp => <option key={esp.id} value={String(esp.id)}>{esp.nome}</option>)}
                  </select>
                )}
                {localTipoEdit === 'unidade' && (
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0' }}>Será usada a unidade cadastrada no sistema.</p>
                )}
              </div>
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
                    onClick={() => { setTituloEdit(lista.titulo || ''); setDataEdit(lista.data_evento || ''); setLocalTipoEdit(lista.local_tipo || ''); setEspacoEdit(lista.espaco ? String(lista.espaco) : ''); setEditandoCabecalho(true); }}
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
              {lista.local_descricao && lista.local_descricao !== 'Local não informado' && (
                <p style={{ margin: '1px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                  📍 {lista.local_descricao}
                </p>
              )}
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

          {/* Busca por nome ou CPF */}
          {convidados.length > 0 && (
            <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                style={{
                  width: '100%', padding: '7px 32px 7px 10px',
                  border: '1px solid #d1d5db', borderRadius: 7,
                  fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none',
                }}
              />
              {filtro && (
                <button
                  onClick={() => setFiltro('')}
                  style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', padding: 0, lineHeight: 0,
                  }}
                >
                  <FaTimes size={12} />
                </button>
              )}
            </div>
          )}

          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 500 }}>
            {convidados.length} convidado{convidados.length !== 1 ? 's' : ''}
          </p>

          {/* Lista de convidados */}
          {convidados.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.85rem', padding: '1rem 0' }}>
              {readOnly ? 'Nenhum convidado nesta lista.' : 'Adicione convidados abaixo.'}
            </p>
          ) : (
            <div className="lista-convidados-wrapper">
              {convidados
                .filter((c) => {
                  if (!filtro) return true;
                  const q = filtro.toLowerCase();
                  return (
                    c.nome?.toLowerCase().includes(q) ||
                    (c.cpf || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
                    (c.cpf_formatado || '').includes(q)
                  );
                })
                .map((c) => {
                  const es = editStates[c.id];
                  const editing = Boolean(es);
                  return (
                    <div key={c.id} className="convidado-card" style={editing ? { background: '#f0fdf9', borderColor: '#2abb98', borderWidth: 1.5 } : {}}>
                      {editing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, paddingBottom: 8, borderBottom: '1px solid #d1fae5' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2abb98', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Editando convidado
                            </span>
                          </div>
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
                          <input
                            type="email"
                            value={es.email}
                            onChange={(e) => handleEditEmailChange(c.id, e.target.value)}
                            disabled={es.salvando}
                            placeholder="E-mail (opcional)"
                            style={inlineInput}
                          />
                          {es.erro && (
                            <p style={{ fontSize: '0.72rem', color: '#dc2626', margin: 0 }}>{es.erro}</p>
                          )}
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleSaveEdit(c.id)}
                              disabled={es.salvando || es.buscando}
                              title="Salvar"
                              style={{ ...iconBtn, color: '#2abb98', borderColor: '#86efac', opacity: es.salvando || es.buscando ? 0.5 : 1 }}
                            >
                              <FaCheck size={11} />
                            </button>
                            <button onClick={() => cancelEdit(c.id)} title="Cancelar" style={iconBtn}>
                              <FaTimes size={11} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="convidado-card-top">
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center', flex: 1, minWidth: 0 }}>
                              {!readOnly && (
                                c.entrada_confirmada
                                  ? <FaCheckCircle size={13} color="#059669" title="Entrada confirmada" />
                                  : <FaClock size={13} color="#9ca3af" title="Aguardando entrada" />
                              )}
                              <span className="convidado-card-name">{c.nome}</span>
                            </div>
                            <div className="convidado-card-actions">
                              {readOnly ? (
                                <>
                                  {c.entrada_confirmada ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                      <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <FaCheckCircle size={13} /> Entrou
                                      </span>
                                      <button
                                        onClick={() => handleConfirmarEntrada(c.id)}
                                        disabled={confirmandoId === c.id}
                                        title="Desfazer confirmação"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.68rem', padding: 0, opacity: confirmandoId === c.id ? 0.5 : 1, textDecoration: 'underline' }}
                                      >
                                        desfazer
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleConfirmarEntrada(c.id)}
                                      disabled={confirmandoId === c.id}
                                      title="Confirmar entrada manual"
                                      style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', color: '#15803d', fontSize: '0.73rem', fontWeight: 600, padding: '4px 8px', whiteSpace: 'nowrap', opacity: confirmandoId === c.id ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4 }}
                                    >
                                      <FaCheckCircle size={11} /> Confirmar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCopyQr(c.id, c.qr_token)}
                                    disabled={!c.qr_token}
                                    title="Copiar QR Code"
                                    style={{
                                      ...iconBtn,
                                      color: qrCopyStatus[c.id] === 'copied' ? '#059669' : qrCopyStatus[c.id] === 'error' ? '#dc2626' : '#374151',
                                      borderColor: qrCopyStatus[c.id] === 'copied' ? '#86efac' : qrCopyStatus[c.id] === 'error' ? '#fca5a5' : '#e5e7eb',
                                    }}
                                  >
                                    {qrCopyStatus[c.id] === 'copied' ? <FaCheck size={11} /> : <FaCopy size={11} />}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleCopyQr(c.id, c.qr_token)}
                                    disabled={!c.qr_token}
                                    title="Copiar QR Code"
                                    style={{
                                      ...iconBtn,
                                      color: qrCopyStatus[c.id] === 'copied' ? '#059669' : qrCopyStatus[c.id] === 'error' ? '#dc2626' : '#374151',
                                      borderColor: qrCopyStatus[c.id] === 'copied' ? '#86efac' : qrCopyStatus[c.id] === 'error' ? '#fca5a5' : '#e5e7eb',
                                    }}
                                  >
                                    {qrCopyStatus[c.id] === 'copied' ? <FaCheck size={11} /> : <FaCopy size={11} />}
                                  </button>
                                  <button
                                    onClick={() => handleEnviarQrCode(c.id)}
                                    disabled={!c.email || qrStatus[c.id] === 'sending'}
                                    title={c.email ? 'Enviar QR Code por e-mail' : 'Cadastre um e-mail para enviar o QR'}
                                    style={{
                                      ...iconBtn,
                                      color: qrStatus[c.id] === 'ok' ? '#059669' : qrStatus[c.id] === 'error' ? '#dc2626' : '#6366f1',
                                      borderColor: qrStatus[c.id] === 'ok' ? '#86efac' : qrStatus[c.id] === 'error' ? '#fca5a5' : '#c7d2fe',
                                      opacity: (!c.email || qrStatus[c.id] === 'sending') ? 0.4 : 1,
                                    }}
                                  >
                                    {qrStatus[c.id] === 'ok' ? <FaCheckCircle size={11} /> : <FaEnvelope size={11} />}
                                  </button>
                                  <button onClick={() => startEdit(c)} title="Editar" style={{ ...iconBtn, color: '#6b7280' }}>
                                    <FaPencilAlt size={11} />
                                  </button>
                                  <button onClick={() => handleRemoverConvidado(c.id)} title="Remover" style={{ ...iconBtn, color: '#dc2626', borderColor: '#fca5a5' }}>
                                    <FaTrash size={11} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="convidado-card-meta">
                            <span>{c.cpf_formatado || c.cpf}</span>
                            {!readOnly && c.email && <span>{c.email}</span>}
                            {readOnly && c.entrada_em && (
                              <span style={{ color: '#059669' }}>entrou: {formatarDataHora(c.entrada_em)}</span>
                            )}
                          </div>
                          {qrErro[c.id] && (
                            <p style={{ fontSize: '0.68rem', color: '#dc2626', margin: '4px 0 0' }}>{qrErro[c.id]}</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
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

              {/* Linhas de CPF + Nome + Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 210, overflowY: 'auto', marginBottom: 8, paddingRight: 2 }}>
                {novasLinhas.map((l, idx) => (
                  <div key={idx} className="convidado-row">
                    <div className="col-cpf" style={{ position: 'relative' }}>
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
                    <div className="col-nome">
                      <input
                        type="text"
                        placeholder="Nome do convidado"
                        value={l.nome}
                        onChange={(e) => handleNovaLinhaNomeChange(idx, e.target.value)}
                        style={{
                          width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
                          borderRadius: 5, fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none',
                          color: l.encontrado ? '#059669' : '#111',
                        }}
                      />
                    </div>
                    <div className="col-email">
                      <input
                        type="email"
                        placeholder="E-mail (opcional)"
                        value={l.email}
                        onChange={(e) => handleNovaLinhaEmailChange(idx, e.target.value)}
                        style={{
                          width: '100%', padding: '6px 8px', border: '1px solid #d1d5db',
                          borderRadius: 5, fontSize: '0.83rem', boxSizing: 'border-box', outline: 'none',
                        }}
                      />
                    </div>
                    <div className="col-acao">
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
                  </div>
                ))}
              </div>

              {erroLote && <p style={{ color: '#dc2626', fontSize: '0.78rem', marginBottom: 6 }}>{erroLote}</p>}

              {/* Importar de listas anteriores */}
              <div style={{ marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowImportar(v => !v); setBuscaAnterior(''); setResultadosAnteriores([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
                >
                  📋 {showImportar ? 'Fechar busca' : 'Importar de lista anterior'}
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
                    {buscandoAnteriores && <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Buscando...</p>}
                    {!buscandoAnteriores && buscaAnterior && resultadosAnteriores.length === 0 && (
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Nenhum convidado encontrado.</p>
                    )}
                    {!buscaAnterior && <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>Digite o nome ou CPF para buscar.</p>}
                    {resultadosAnteriores.map(c => (
                      <div key={c.cpf} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 4 }}>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                          <div style={{ fontSize: '0.73rem', color: '#6b7280' }}>{c.cpf_formatado}{c.email ? ` • ${c.email}` : ''}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleImportarNovaLinha(c)}
                          style={{ background: '#2abb98', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0, marginLeft: 8 }}
                        >
                          + Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
