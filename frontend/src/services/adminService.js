import axios from 'axios';
import { API_BASE_URL } from './userService';

const API_URL = `${API_BASE_URL}/api/admin`;

// Helper para obtener el token y la configuración JSON
const getConfig = (isJson = true) => {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : null;
  if (!token) {
    throw new Error('No autorizado, inicie sesión de nuevo.');
  }
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return { headers };
};

// Obtener las estadísticas del dashboard
export const getAdminStats = async () => {
  const { data } = await axios.get(`${API_URL}/stats`, getConfig());
  return data;
};

// Obtener el historial de solicitudes (con paginación, filtros y ordenamiento)
export const getAdminSolicitudes = async ({ pageIndex, pageSize, filters, sorting }) => {
  const params = new URLSearchParams({
    page: pageIndex + 1,
    limit: pageSize,
    filters: filters || '[]',
    sorting: sorting || '[]',
  });
  const { data } = await axios.get(`${API_URL}/solicitudes?${params.toString()}`, getConfig());
  return data;
};

// Subir un anexo a una solicitud existente
export const uploadAnexo = async (id, tipo, filename, fileUrl, descripcion = '', size) => {
  const payload = { filename, fileUrl, descripcion, size };
  const config = getConfig(); // JSON content type
  const { data } = await axios.post(`${API_URL}/upload-anexo/${tipo}/${id}`, payload, config);
  return data;
};