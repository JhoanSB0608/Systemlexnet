import axios from 'axios';

import { API_BASE_URL } from './userService';

const API_URL = `${API_BASE_URL}/api/acreedores`;

// Helper para obtener el token y la configuración
const getConfig = (options = {}) => {
  const userInfo = localStorage.getItem('userInfo');
  const token = userInfo ? JSON.parse(userInfo).token : null;
  return {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };
};

// Obtener todos los acreedores con parámetros de React Table
export const getAcreedores = async (queryParams) => {
  const config = getConfig({ params: queryParams });
  const { data } = await axios.get(API_URL, config);
  return data;
};

// Obtener un acreedor por su ID
export const getAcreedor = async (id) => {
  const config = getConfig();
  const { data } = await axios.get(`${API_URL}/${id}`, config);
  return data;
};

// Crear un nuevo acreedor
export const createAcreedor = async (acreedorData) => {
  const config = getConfig({ headers: { 'Content-Type': 'application/json' } });
  const { data } = await axios.post(API_URL, acreedorData, config);
  return data;
};

// Actualizar un acreedor
export const updateAcreedor = async (id, acreedorData) => {
  const config = getConfig({ headers: { 'Content-Type': 'application/json' } });
  const { data } = await axios.put(`${API_URL}/${id}`, acreedorData, config);
  return data;
};

// Eliminar un acreedor
export const deleteAcreedor = async (id) => {
  const config = getConfig();
  await axios.delete(`${API_URL}/${id}`, config);
};
