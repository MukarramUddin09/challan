import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const resolveApiAssetUrl = (assetPath) => {
  if (!assetPath || /^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  return `${API_URL}${assetPath}`;
};

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  // Do not set a global Content-Type so browser/axios can set it per-request (multipart/form-data needs boundary)
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ghmc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ghmc_token');
      // Only redirect if not already on login/register page
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
