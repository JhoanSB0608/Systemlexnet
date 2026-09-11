// liquidacionService.js
import axios from 'axios';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from './userService';

const API_URL = `${API_BASE_URL}/api/liquidaciones`;

const getToken = () => {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo).token : null;
};

const getConfig = (options = {}) => {
  const token = getToken();
  const headers = { };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Do not set Content-Type for FormData, let browser do it
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return { headers, ...options };
};

export const createLiquidacion = async (payload) => {
  try {
    const config = getConfig({ body: payload });
    const response = await axios.post(API_URL, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error creating liquidacion:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error creando la solicitud de liquidación' };
  }
};

export const downloadLiquidacionDocument = async (solicitudId, format = 'pdf') => {
  try {
    const config = getConfig({ responseType: 'blob' });
    const response = await axios.get(`${API_URL}/${solicitudId}/documento?format=${format}`, config);

    const contentType = (response.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const text = await response.data.text();
      let errObj = { message: 'Error desconocido en servidor' };
      try { errObj = JSON.parse(text); } catch(e) {}
      throw errObj;
    }

    let filename = `liquidacion-${solicitudId}.${format}`;
    const cd = response.headers['content-disposition'] || response.headers['Content-Disposition'];
    if (cd) {
      const match = cd.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/);
      if (match) filename = decodeURIComponent(match[1] || match[2] || match[3]);
    }

    saveAs(response.data, filename);
    return true;
  } catch (error) {
    console.error('Error al descargar el documento de liquidación', error);
    throw error.response?.data || { message: error.message || 'Error descargando el documento' };
  }
};


export const getLiquidacionById = async (solicitudId) => {
  try {
    const config = getConfig();
    const response = await axios.get(`${API_URL}/${solicitudId}`, config);
    return response.data;
  } catch (err) {
    console.error('Error fetching liquidacion by ID:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error obteniendo la solicitud' };
  }
};

export const updateLiquidacion = async (solicitudId, payload) => {
  try {
    const config = getConfig({ body: payload });
    const response = await axios.put(`${API_URL}/${solicitudId}`, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error updating liquidacion:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error actualizando la solicitud' };
  }
};

const liquidacionService = { createLiquidacion, downloadLiquidacionDocument, getLiquidacionById, updateLiquidacion };

export default liquidacionService;