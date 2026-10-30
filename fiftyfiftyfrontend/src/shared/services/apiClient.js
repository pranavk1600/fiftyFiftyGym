import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fiftyfifty_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error unwrapping
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Automatically purge invalid/expired sessions on 401 Unauthorized
    if (error.response?.status === 401) {
      const lastGymSlug = localStorage.getItem('fiftyfifty_last_gym_slug');
      localStorage.removeItem('fiftyfifty_token');
      localStorage.removeItem('fiftyfifty_user');

      const path = window.location.pathname;
      if (!path.includes('/login')) {
        if (path.startsWith('/admin') || path.startsWith('/superadmin')) {
          window.location.href = '/superadmin/login';
        } else if (path.startsWith('/owner')) {
          if (lastGymSlug) {
            window.location.href = `/gym/${lastGymSlug}/login`;
          } else {
            window.location.href = '/admin/login';
          }
        } else {
          window.location.href = '/admin/login';
        }
      }
    }

    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);
