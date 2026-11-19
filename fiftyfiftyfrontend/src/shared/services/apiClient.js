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
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const url = config.url || '';

    let token = localStorage.getItem('fiftyfifty_token');

    // Role-isolated token lookup to prevent multi-tab session overwrites on localhost
    if (url.startsWith('/admin') || url.startsWith('/superadmin') || path.startsWith('/admin') || path.startsWith('/superadmin')) {
      const superadminToken = localStorage.getItem('fiftyfifty_superadmin_token');
      if (superadminToken) {
        token = superadminToken;
      }
    } else if (url.startsWith('/owner') || path.startsWith('/owner')) {
      const ownerToken = localStorage.getItem('fiftyfifty_owner_token');
      if (ownerToken) {
        token = ownerToken;
      }
    } else if (url.startsWith('/member') || path.startsWith('/member')) {
      const memberToken = localStorage.getItem('fiftyfifty_member_token');
      if (memberToken) {
        token = memberToken;
      }
    }

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
      const path = typeof window !== 'undefined' ? window.location.pathname : '';

      if (path.startsWith('/admin') || path.startsWith('/superadmin')) {
        localStorage.removeItem('fiftyfifty_superadmin_token');
        localStorage.removeItem('fiftyfifty_superadmin_user');
      } else if (path.startsWith('/owner')) {
        localStorage.removeItem('fiftyfifty_owner_token');
        localStorage.removeItem('fiftyfifty_owner_user');
      } else if (path.startsWith('/member')) {
        localStorage.removeItem('fiftyfifty_member_token');
        localStorage.removeItem('fiftyfifty_member_user');
      }
      localStorage.removeItem('fiftyfifty_token');
      localStorage.removeItem('fiftyfifty_user');

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
    const enhancedError = new Error(message);
    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;
    return Promise.reject(enhancedError);
  }
);
