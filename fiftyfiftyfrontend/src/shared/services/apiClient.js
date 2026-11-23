import axios from 'axios';

export const PRODUCTION_API_URL = 'https://fiftyfiftygym.onrender.com/api';

/**
 * Resolves the backend API base URL safely across environments.
 *
 * Rules:
 * 1. Default production API Base URL is 'https://fiftyfiftygym.onrender.com/api'.
 * 2. In production builds or when hosted on a remote domain (e.g. Vercel):
 *    - Guard against missing, localhost, or invalid frontend URLs in VITE_API_URL.
 *    - Strictly use PRODUCTION_API_URL.
 * 3. In local development on localhost:
 *    - Allows explicit local dev overrides if VITE_API_URL is provided (e.g. http://localhost:5000/api).
 *    - Otherwise safely falls back to PRODUCTION_API_URL.
 * 4. Normalizes URLs by removing trailing slashes and ensuring '/api' path.
 */
export const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const isProdBuild = Boolean(import.meta.env.PROD);
  const isBrowser = typeof window !== 'undefined' && Boolean(window.location?.hostname);
  const isLocalHost = isBrowser
    ? ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
    : !isProdBuild;

  // In production builds or when running on production domains
  if (isProdBuild || (!isLocalHost && isBrowser)) {
    // If VITE_API_URL is missing, points to localhost, or is accidentally set to the frontend URL
    if (
      !envUrl ||
      envUrl.includes('localhost') ||
      envUrl.includes('127.0.0.1') ||
      envUrl.includes('vercel.app')
    ) {
      return PRODUCTION_API_URL;
    }
  }

  // If a valid custom environment URL is supplied, normalize it
  if (envUrl) {
    let cleanUrl = envUrl.replace(/\/+$/, '');
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = `${cleanUrl}/api`;
    }
    return cleanUrl;
  }

  return PRODUCTION_API_URL;
};

export const API_BASE_URL = getApiBaseUrl();

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
          localStorage.removeItem('fiftyfifty_last_gym_slug');
          window.location.href = '/?signin=true';
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
