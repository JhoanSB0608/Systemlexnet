// poderService.js
// Servicio que envía los datos de PoderForm.jsx al backend y fuerza la
// descarga del PDF generado usando window.URL.createObjectURL.
// También expone la descarga del PDF de un poder guardado (para el admin).
import axios from 'axios';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from './userService';

const API_URL = `${API_BASE_URL}/api/poder`;

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

// Envía el payload al endpoint y dispara la descarga del PDF en el navegador.
export const generarPoderPdf = async (data) => {
  try {
    // responseType 'blob' -> axios no intenta parsear la respuesta como JSON;
    // el Buffer binario del backend llega como un Blob en el navegador.
    const config = getConfig({ responseType: 'blob' });
    const response = await axios.post(`${API_URL}/generar`, data, config);

    // Si el servidor responde JSON (p. ej. un error), lo convertimos a texto
    // para lanzar un error legible en lugar de intentar descargar un PDF roto.
    const contentType = (response.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      let errObj = { message: 'Error desconocido en el servidor' };
      try { errObj = JSON.parse(text); } catch (e) { /* mantener mensaje por defecto */ }
      throw errObj;
    }

    // Nombre del archivo desde el header Content-Disposition del backend.
    let filename = 'poder.pdf';
    const cd = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    if (cd) {
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/);
      if (match) filename = decodeURIComponent(match[1] || match[2] || match[3]);
    }

    // Descarga forzada mediante un <a> temporal:
    // 1) Se genera un objeto URL a partir del Blob.
    // 2) Se dispara el click del enlace con el atributo download.
    // 3) Se libera el objeto URL para no dejar memoria residua en el navegador.
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    return true;
  } catch (error) {
    console.error('Error al generar el PDF del poder:', error);
    throw error.response?.data || { message: error.message || 'Error al generar el PDF' };
  }
};

// GET /api/poder/:id
// Trae un poder completo (incluye la firma) para el modo edición.
export const getPoderById = async (poderId) => {
  try {
    const config = getConfig();
    const response = await axios.get(`${API_URL}/${poderId}`, config);
    return response.data;
  } catch (err) {
    console.error('Error obteniendo el poder:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error obteniendo el poder' };
  }
};

// PUT /api/poder/:id
// Actualiza un poder existente (modo edición).
export const actualizarPoder = async (poderId, payload) => {
  try {
    const config = getConfig();
    const response = await axios.put(`${API_URL}/${poderId}`, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error actualizando el poder:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error actualizando el poder' };
  }
};

// GET /api/poder/:id/documento
// Descarga el PDF de un poder previamente guardado en la base de datos.
export const downloadPoderDocument = async (poderId) => {
  try {
    const config = getConfig({ responseType: 'blob' });
    const response = await axios.get(`${API_URL}/${poderId}/documento`, config);

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      let errObj = { message: 'Error desconocido en el servidor' };
      try { errObj = JSON.parse(text); } catch (e) { /* mantener mensaje por defecto */ }
      throw errObj;
    }

    let filename = `poder-${poderId}.pdf`;
    const cd = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    if (cd) {
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/);
      if (match) filename = decodeURIComponent(match[1] || match[2] || match[3]);
    }

    saveAs(response.data, filename);

    return true;
  } catch (error) {
    console.error('Error al descargar el documento del poder:', error);
    throw error.response?.data || { message: error.message || 'Error al descargar el documento' };
  }
};

const poderService = { generarPoderPdf, getPoderById, actualizarPoder, downloadPoderDocument };

export default poderService;