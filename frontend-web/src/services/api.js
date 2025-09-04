import axios from 'axios';
import { emitToast } from '../context/ToastContext';

// Normalize base URL to point to API root
const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const baseURL = (() => {
  // If rawBase already ends with /api or /api/, keep it as is
  if (/\/api\/?$/.test(rawBase)) return rawBase.replace(/\/$/, '');
  // Otherwise, append /api
  return `${rawBase.replace(/\/$/, '')}/api`;
})();

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found in localStorage');
      // Don't throw an error here, let the backend handle unauthorized requests
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Gather error info
    const url = error.config?.url;
    const method = (error.config?.method || 'get').toLowerCase();
    const status = error.response?.status;
    const data = error.response?.data;
    const message = error.message;

    // Do not log expected 404s for endpoints where absence is normal
    const expected404 = (
      status === 404 && method === 'get' && (
        url === '/localization-settings/current/' || url?.startsWith('/localization-settings/current') ||
        url === '/subscription/current/' || url?.startsWith('/subscription/current')
      )
    );
    if (!expected404) {
      console.error('API Error:', { url, status, data, message });
    }
    
    const detail = data?.detail || data?.message;

    // Handle 403 Forbidden: permissions, CSRF, etc.
    if (status === 403) {
      const msg = detail || 'You do not have permission to perform this action.';
      emitToast({ message: msg, type: 'error' });
    }

    // Handle 401 Unauthorized errors
    if (status === 401) {
      const msg = detail || 'Session expired. Please login again.';
      emitToast({ message: msg, type: 'warning' });
      console.warn('Authentication required - redirecting to login');
      // Clear any existing token
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      delete apiClient.defaults.headers.common['Authorization'];
      
      // Redirect to login page if we're not already there
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
