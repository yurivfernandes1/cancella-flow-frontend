import React, { useState, useEffect } from 'react';
import { FaTimes, FaUpload, FaTrash } from 'react-icons/fa';
import { espacoAPI, eventoAPI } from '../../services/api';
import '../../styles/Modal.css';

function EventoModal({ isOpen, onClose, onSuccess, evento = null }) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    espaco: '',
    local_texto: '',
    inicio: '',
    fim: '',
    imagem: null
  });

  const [espacos, setEspacos] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEspacos();
      if (evento) {
        // Modo edição
        setFormData({
          titulo: evento.titulo || '',
          descricao: evento.descricao || '',
          espaco: evento.espaco_id || '',
          local_texto: evento.local_texto || '',
          inicio: evento.datetime_inicio ? evento.datetime_inicio.replace(' ', 'T').slice(0,16) : (evento.data_evento && evento.hora_inicio ? `${evento.data_evento}T${evento.hora_inicio}` : ''),
          fim: evento.datetime_fim ? evento.datetime_fim.replace(' ', 'T').slice(0,16) : (evento.data_evento && evento.hora_fim ? `${evento.data_evento}T${evento.hora_fim}` : ''),
          imagem: null
        });
        if (evento.imagem_url) {
          setImagePreview(evento.imagem_url);
        }
      } else {
        // Modo criação
        resetForm();
      }
    }
  }, [isOpen, evento]);

  const fetchEspacos = async () => {
    try {
      const response = await espacoAPI.list({ is_active: true });
      const espacosData = response.data.results || response.data || [];
      setEspacos(espacosData);
    } catch (error) {
      console.error('Erro ao buscar espaços:', error);
      setEspacos([]);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      espaco: '',
      local_texto: '',
      inicio: '',
      fim: '',
      imagem: null
    });
    setImagePreview(null);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpar erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // Se selecionar espaço, limpar local_texto
    if (name === 'espaco' && value) {
      setFormData(prev => ({
        ...prev,
        local_texto: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          imagem: 'Por favor, selecione um arquivo de imagem válido'
        }));
        return;
      }

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          imagem: 'A imagem deve ter no máximo 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        imagem: file
      }));

      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Limpar erro
      if (errors.imagem) {
        setErrors(prev => ({
          ...prev,
          imagem: null
        }));
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      imagem: null
    }));
    setImagePreview(null);
    // Limpar input de arquivo
    const fileInput = document.getElementById('imagem-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'Título é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.espaco && !formData.local_texto.trim()) {
      newErrors.local = 'Selecione um espaço ou informe o local';
    }

    if (!formData.inicio) newErrors.inicio = 'Data e hora de início são obrigatórias';
    if (!formData.fim) newErrors.fim = 'Data e hora de término são obrigatórias';
    if (formData.inicio && formData.fim && formData.inicio >= formData.fim) {
      newErrors.fim = 'Término deve ser posterior ao início';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
  const formDataToSend = new FormData();
      formDataToSend.append('titulo', formData.titulo);
      formDataToSend.append('descricao', formData.descricao);
  // Quebrar datetime-local em data e horas para o backend
  // Enviar novos campos datetime
  if (formData.inicio) formDataToSend.append('datetime_inicio', formData.inicio);
  if (formData.fim) formDataToSend.append('datetime_fim', formData.fim);

      if (formData.espaco) {
        formDataToSend.append('espaco_id', formData.espaco);
      } else {
        formDataToSend.append('local_texto', formData.local_texto);
      }

      if (formData.imagem instanceof File) {
        formDataToSend.append('imagem', formData.imagem);
      }

      if (evento) {
        // Editar evento existente
        await eventoAPI.update(evento.id, formDataToSend);
      } else {
        // Criar novo evento
        await eventoAPI.create(formDataToSend);
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      if (error.response?.data) {
        const apiErrors = {};
        Object.keys(error.response.data).forEach(key => {
          const errorMsg = Array.isArray(error.response.data[key])
            ? error.response.data[key][0]
            : error.response.data[key];
          apiErrors[key] = errorMsg;
        });
        setErrors(apiErrors);
      } else {
        alert('Erro ao salvar evento. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{evento ? 'Editar Evento' : 'Novo Evento'}</h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {/* Título */}
            <div className="form-group">
              <label htmlFor="titulo">
                Título <span className="required">*</span>
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ex: Festa de Ano Novo"
                className={errors.titulo ? 'error' : ''}
              />
              {errors.titulo && <span className="error-message">{errors.titulo}</span>}
            </div>

            {/* Descrição */}
            <div className="form-group">
              <label htmlFor="descricao">
                Descrição <span className="required">*</span>
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descreva os detalhes do evento..."
                rows="4"
                className={errors.descricao ? 'error' : ''}
              />
              {errors.descricao && <span className="error-message">{errors.descricao}</span>}
            </div>

            {/* Local - Espaço ou Texto */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="espaco">Espaço</label>
                <select
                  id="espaco"
                  name="espaco"
                  value={formData.espaco}
                  onChange={handleChange}
                  className={errors.local ? 'error' : ''}
                  disabled={!!formData.local_texto}
                >
                  <option value="">Selecione um espaço (opcional)</option>
                  {espacos.map(esp => (
                    <option key={esp.id} value={esp.id}>
                      {esp.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label htmlFor="local_texto">Ou informe o local</label>
                <input
                  type="text"
                  id="local_texto"
                  name="local_texto"
                  value={formData.local_texto}
                  onChange={handleChange}
                  placeholder="Ex: Salão de Festas Externo"
                  className={errors.local ? 'error' : ''}
                  disabled={!!formData.espaco}
                />
              </div>
            </div>
            {errors.local && <span className="error-message">{errors.local}</span>}

            {/* Início e término em datetime único */}
            <div className="form-row">
              <div className="form-group" style={{ flex: '0 0 48%' }}>
                <label htmlFor="inicio">
                  Início <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="inicio"
                  name="inicio"
                  value={formData.inicio}
                  onChange={handleChange}
                  className={errors.inicio ? 'error' : ''}
                />
                {errors.inicio && <span className="error-message">{errors.inicio}</span>}
              </div>

              <div className="form-group" style={{ flex: '0 0 48%' }}>
                <label htmlFor="fim">
                  Término <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="fim"
                  name="fim"
                  value={formData.fim}
                  onChange={handleChange}
                  className={errors.fim ? 'error' : ''}
                />
                {errors.fim && <span className="error-message">{errors.fim}</span>}
              </div>
            </div>

            {/* Upload de Imagem */}
            <div className="form-group">
              <label htmlFor="imagem-upload">Imagem do Evento</label>
              <div className="image-upload-container">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={handleRemoveImage}
                      title="Remover imagem"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="imagem-upload" className="upload-label">
                    <FaUpload />
                    <span>Clique para selecionar uma imagem</span>
                    <small>PNG, JPG ou JPEG até 5MB</small>
                  </label>
                )}
                <input
                  type="file"
                  id="imagem-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>
              {errors.imagem && <span className="error-message">{errors.imagem}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : evento ? 'Salvar Alterações' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventoModal;
