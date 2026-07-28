import axios from 'axios';

// Yerel geliştirmede Vite dev proxy sayesinde '/api' yeterlidir.
// Production'da (Vercel gibi statik barındırma) backend ayrı bir adreste
// çalıştığı için VITE_API_URL ortam değişkeniyle tam adres verilmelidir.
// Örn: VITE_API_URL=https://senin-backend-adresin.onrender.com/api
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Backend'den, ağ katmanından ya da barındırma platformundan (örn. Vercel'in
// kendi 404 JSON'ı) gelen HATA her zaman düz bir string olacak şekilde
// normalize edilir — aksi halde React, obje render etmeye çalışırken çöker.
export function apiErrorMessage(err, fallback = 'Bir şeyler ters gitti.') {
  const raw = err?.response?.data?.error ?? err?.response?.data?.message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    if (typeof raw.message === 'string') return raw.message;
    try { return JSON.stringify(raw); } catch { /* düş */ }
  }
  if (err?.response?.status === 404) return 'API bulunamadı (404). Backend doğru adreste çalışıyor mu?';
  if (err?.message === 'Network Error') return 'Sunucuya ulaşılamıyor. Backend çalışıyor mu?';
  return fallback;
}

export default api;
