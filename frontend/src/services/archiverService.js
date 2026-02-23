import axios from 'axios';
import { API_BASE_URL } from './userService'; // Assuming this is defined in userService

const API_URL = `${API_BASE_URL}/api/archiver`;

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

export const createArchiverEntry = async (payload) => {
  try {
    const config = getConfig();
    const response = await axios.post(API_URL, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error creating archiver entry:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error creating archiver entry' };
  }
};

export const getArchiverEntries = async () => {
  try {
    const config = getConfig();
    const response = await axios.get(API_URL, config);
    return response.data;
  } catch (err) {
    console.error('Error fetching archiver entries:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error fetching archiver entries' };
  }
};

export const getArchiverEntryById = async (id) => {
  try {
    const config = getConfig();
    const response = await axios.get(`${API_URL}/${id}`, config);
    return response.data;
  } catch (err) {
    console.error('Error fetching archiver entry by ID:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error fetching archiver entry' };
  }
};

export const uploadArchiverAnexo = async (id, payload) => {
  try {
    const config = getConfig();
    const response = await axios.post(`${API_URL}/${id}/anexos`, payload, config);
    return response.data;
  } catch (err) {
    console.error('Error uploading archiver anexo:', err.response?.data || err.message || err);
    throw err.response?.data || { message: err.message || 'Error uploading archiver anexo' };
  }
};

const archiverService = {
  createArchiverEntry,
  getArchiverEntries,
  getArchiverEntryById,
  uploadArchiverAnexo,
};

export default archiverService;
