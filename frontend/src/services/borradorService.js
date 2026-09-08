// borradorService.js
// Servicios para el guardado parcial (auto-save) de solicitudes de insolvencia y conciliación.
import axios from 'axios';
import { API_BASE_URL } from './userService'; // Assuming this is defined in userService

const INSOLVENCIA_API_URL = `${API_BASE_URL}/api/solicitudes`;
const CONCILIACION_API_URL = `${API_BASE_URL}/api/conciliaciones`;

export const TIPO_INSOLVENCIA = 'Solicitud de Insolvencia Económica de Persona Natural No Comerciante';
export const TIPO_CONCILIACION = 'Solicitud de Conciliación Unificada';

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

export const obtenerApiBaseDeTipo = (tipoSolicitud) =>
  tipoSolicitud === TIPO_CONCILIACION ? CONCILIACION_API_URL : INSOLVENCIA_API_URL;

// Crea el borrador (o reutiliza el último activo del mismo tipo) en el servidor.
export const guardarBorrador = async (payload, tipoSolicitud) => {
  try {
    const base = obtenerApiBaseDeTipo(tipoSolicitud);
    const config = getConfig();
    const response = await axios.post(`${base}/borrador`, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error guardando borrador:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error guardando el borrador' };
  }
};

// Actualiza un borrador existente.
export const actualizarBorrador = async (borradorId, payload) => {
  try {
    const config = getConfig();
    // El tipo se resuelve por el id: se prueba primero solicitudes y luego conciliaciones
    const endpoints = [
      `${INSOLVENCIA_API_URL}/borrador/${borradorId}`,
      `${CONCILIACION_API_URL}/borrador/${borradorId}`,
    ];
    let lastError = null;
    for (const url of endpoints) {
      try {
        const response = await axios.put(url, payload, config);
        return response.data;
      } catch (e) {
        if (e.response && e.response.status !== 404) throw e;
        lastError = e;
      }
    }
    throw lastError || { message: 'Borrador no encontrado' };
  } catch (err) {
    console.error('Error actualizando borrador:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error actualizando el borrador' };
  }
};

// Obtiene un borrador por id (para retomar tras recargar la página).
export const obtenerBorrador = async (borradorId, tipoSolicitud) => {
  try {
    const base = obtenerApiBaseDeTipo(tipoSolicitud);
    const config = getConfig();
    const response = await axios.get(`${base}/${borradorId}`, config);
    return response.data;
  } catch (err) {
    console.error('Error obteniendo borrador:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error obteniendo el borrador' };
  }
};

// Elimina un borrador.
export const eliminarBorrador = async (borradorId, tipoSolicitud) => {
  try {
    const base = obtenerApiBaseDeTipo(tipoSolicitud);
    const config = getConfig();
    const response = await axios.delete(`${base}/borrador/${borradorId}`, config);
    return response.data;
  } catch (err) {
    console.error('Error eliminando borrador:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error eliminando el borrador' };
  }
};

// Obtiene el historial del usuario (borradores + completadas, de ambos tipos).
export const obtenerMiHistorial = async ({ estado } = {}) => {
  try {
    const config = getConfig();
    const query = estado ? `?estado=${estado}` : '';
    const [insolvencias, conciliaciones] = await Promise.all([
      axios.get(`${INSOLVENCIA_API_URL}${query}`, config),
      axios.get(`${CONCILIACION_API_URL}${query}`, config),
    ]);
    const conTipo = [
      ...insolvencias.data.map((s) => ({ ...s, _tipoDocumento: 'insolvencia' })),
      ...conciliaciones.data.map((c) => ({ ...c, _tipoDocumento: 'conciliacion' })),
    ];
    // Ordenar por última actualización (desc)
    return conTipo.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  } catch (err) {
    console.error('Error obteniendo historial:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error obteniendo el historial' };
  }
};

const borradorService = {
  guardarBorrador,
  actualizarBorrador,
  obtenerBorrador,
  eliminarBorrador,
  obtenerMiHistorial,
};

export default borradorService;