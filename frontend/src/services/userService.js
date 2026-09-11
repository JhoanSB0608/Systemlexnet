import axios from 'axios';

// URL base de la API. En desarrollo apunta a localhost:3000; en producción se
// sobreescribe con REACT_APP_BACKEND_URL.
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

const API_URL = `${API_BASE_URL}/api/users`;
const AUTH_URL = `${API_BASE_URL}/api/auth`;

export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  if (response.data.token) {
    localStorage.setItem('userInfo', JSON.stringify(response.data));
  }
  return response.data;
};

export const register = async (name, email, password) => {
  const response = await axios.post(API_URL, { name, email, password });
  if (response.data.token) {
    localStorage.setItem('userInfo', JSON.stringify(response.data));
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('userInfo');
};

export const getMe = async () => {
  const userInfoString = localStorage.getItem('userInfo');
  if (!userInfoString) {
    return Promise.reject(new Error('No user info found in local storage'));
  }

  const userInfo = JSON.parse(userInfoString);
  if (!userInfo || !userInfo.token) {
    return Promise.reject(new Error('Invalid user info found in local storage'));
  }

  const config = {
    headers: {
      Authorization: `Bearer ${userInfo.token}`,
    },
  };
  const response = await axios.get(`${AUTH_URL}/me`, config);
  // The /me route returns the user object, but the app stores user object + token.
  // So, we merge them.
  const user = { ...response.data, token: userInfo.token };
  localStorage.setItem('userInfo', JSON.stringify(user));
  return user;
};

export const resendVerificationEmail = async (email) => {
  const response = await axios.post(`${API_URL}/resend-verification`, { email });
  return response.data;
};
