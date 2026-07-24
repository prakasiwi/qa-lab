import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!apiBaseUrl) {
  // Vite exposes VITE_* variables at build time. Configure VITE_API_BASE_URL
  // in frontend/.env for local development and in Vercel Environment Variables
  // for Preview/Production deployments.
  console.error('VITE_API_BASE_URL belum dikonfigurasi.');
}

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
