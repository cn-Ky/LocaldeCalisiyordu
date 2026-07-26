import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err, fallback = 'Bir şeyler ters gitti.') {
  return err?.response?.data?.error || fallback;
}

export default api;
