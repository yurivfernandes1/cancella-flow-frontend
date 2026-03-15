import api from '../services/api';

/**
 * Baixa o QR Code da pessoa como PNG gerado pelo backend.
 * @param {string} token - qr_token do visitante/convidado
 * @param {string} nome  - nome exibido no arquivo baixado
 */
export async function downloadQrCode(token, nome) {
  const response = await api.get('/cadastros/download-qrcode/', {
    params: { token },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `qrcode-${nome.replace(/\s+/g, '-').toLowerCase()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
