// contratoService.js
// Servicio que envía los datos de ContratoForm.jsx al backend y fuerza la
// descarga del PDF generado usando window.URL.createObjectURL.
// También expone la descarga del PDF de un contrato guardado (para el admin).
import axios from 'axios';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from './userService';

const API_URL = `${API_BASE_URL}/api/contrato`;

const getToken = () => {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo).token : null;
};

const getConfig = (options = {}) => {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, ...options };
};

const detectJsonBlob = async (blob, fallback) => {
  const contentType = (blob.type || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const text = await blob.text();
    let errObj = { message: 'Error desconocido en el servidor' };
    try { errObj = JSON.parse(text); } catch (e) { /* mantener mensaje por defecto */ }
    throw errObj;
  }
  return fallback;
};

const extractFilename = (headers, fallback) => {
  let filename = fallback;
  const cd = headers['content-disposition'] || headers['Content-Disposition'];
  if (cd) {
    const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/);
    if (match) filename = decodeURIComponent(match[1] || match[2] || match[3]);
  }
  return filename;
};

const triggerDownload = (blob, filename) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
};

// Envía el payload al endpoint y dispara la descarga del PDF en el navegador.
export const generarContratoPdf = async (data) => {
  try {
    const config = getConfig({ responseType: 'blob' });
    const response = await axios.post(`${API_URL}/generar`, data, config);
    await detectJsonBlob(response.data, null);
    const filename = extractFilename(response.headers, 'contrato-servicios.pdf');
    triggerDownload(response.data, filename);
    return true;
  } catch (error) {
    console.error('Error al generar el PDF del contrato:', error);
    throw error.response?.data || { message: error.message || 'Error al generar el PDF' };
  }
};

// GET /api/contrato/:id
export const getContratoById = async (contratoId) => {
  try {
    const config = getConfig();
    const response = await axios.get(`${API_URL}/${contratoId}`, config);
    return response.data;
  } catch (err) {
    console.error('Error obteniendo el contrato:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error obteniendo el contrato' };
  }
};

// PUT /api/contrato/:id
export const actualizarContrato = async (contratoId, payload) => {
  try {
    const config = getConfig();
    const response = await axios.put(`${API_URL}/${contratoId}`, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error actualizando el contrato:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error actualizando el contrato' };
  }
};

// GET /api/contrato/:id/documento
export const downloadContratoDocument = async (contratoId) => {
  try {
    const config = getConfig({ responseType: 'blob' });
    const response = await axios.get(`${API_URL}/${contratoId}/documento`, config);
    await detectJsonBlob(response.data, null);
    const filename = extractFilename(response.headers, `contrato-servicios-${contratoId}.pdf`);
    saveAs(response.data, filename);
    return true;
  } catch (error) {
    console.error('Error al descargar el documento del contrato:', error);
    throw error.response?.data || { message: error.message || 'Error al descargar el documento' };
  }
};

const contratoService = { generarContratoPdf, getContratoById, actualizarContrato, downloadContratoDocument };

export default contratoService;