export const PRODUCTION_FRONTEND_URL = 'https://leopardxgyms.vercel.app';
export const LOCAL_DEV_FRONTEND_URL = 'http://localhost:5173';

export const DISCONTINUED_DOMAINS = [
  'fiftyfiftygym.vercel.app',
  'https://fiftyfiftygym.vercel.app',
  'http://fiftyfiftygym.vercel.app'
];

/**
 * Checks whether the current runtime environment is considered production or hosted cloud.
 */
export const isProductionEnvironment = () => {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase().trim();
  const isRender = process.env.RENDER === 'true';
  const isVercel = Boolean(process.env.VERCEL);
  return nodeEnv === 'production' || isRender || isVercel;
};

/**
 * Safely resolves the Frontend URL for platform emails, invitations, and password setup links.
 *
 * Rules:
 * 1. The old domain 'fiftyfiftygym.vercel.app' is discontinued and will NEVER be output.
 * 2. If running in production or hosted cloud (Render, Vercel, etc.):
 *    - Uses FRONTEND_URL if provided, UNLESS it points to localhost, 127.0.0.1, or the discontinued domain.
 *    - Strictly defaults to PRODUCTION_FRONTEND_URL ('https://leopardxgyms.vercel.app').
 * 3. In local development:
 *    - If FRONTEND_URL is set (and not the discontinued domain), uses it.
 *    - Defaults to LOCAL_DEV_FRONTEND_URL ('http://localhost:5173').
 * 4. Strips trailing slashes cleanly.
 */
export const getFrontendUrl = () => {
  const isProd = isProductionEnvironment();
  let configured = (process.env.FRONTEND_URL || '').trim();

  // If set to discontinued domain, redirect immediately to active production domain
  if (configured.includes('fiftyfiftygym.vercel.app')) {
    configured = PRODUCTION_FRONTEND_URL;
  }

  if (isProd) {
    if (!configured || configured.includes('localhost') || configured.includes('127.0.0.1')) {
      return PRODUCTION_FRONTEND_URL;
    }
    return configured.replace(/\/$/, '');
  }

  // Local development
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return LOCAL_DEV_FRONTEND_URL;
};

/**
 * Safely resolves the Member Frontend URL.
 * Supports distinct MEMBER_FRONTEND_URL if configured, otherwise falls back to getFrontendUrl().
 */
export const getMemberFrontendUrl = () => {
  const isProd = isProductionEnvironment();
  let configured = (process.env.MEMBER_FRONTEND_URL || '').trim();

  if (configured.includes('fiftyfiftygym.vercel.app')) {
    configured = '';
  }

  if (isProd) {
    if (!configured || configured.includes('localhost') || configured.includes('127.0.0.1')) {
      return getFrontendUrl();
    }
    return configured.replace(/\/$/, '');
  }

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return getFrontendUrl();
};

/**
 * Sanitizes any URL before it is placed into an outgoing email.
 * Guarantees that no discontinued domain and no production localhost can ever be sent out.
 */
export const sanitizeEmailUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const isProd = isProductionEnvironment();

  let sanitized = url;

  // Always replace discontinued fiftyfiftygym.vercel.app domain
  if (sanitized.includes('fiftyfiftygym.vercel.app')) {
    sanitized = sanitized.replace(/https?:\/\/fiftyfiftygym\.vercel\.app/gi, PRODUCTION_FRONTEND_URL);
  }

  if (isProd) {
    if (sanitized.includes('localhost') || sanitized.includes('127.0.0.1')) {
      sanitized = sanitized.replace(/https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?)/gi, PRODUCTION_FRONTEND_URL);
    }
  }

  return sanitized;
};

export default {
  PRODUCTION_FRONTEND_URL,
  LOCAL_DEV_FRONTEND_URL,
  DISCONTINUED_DOMAINS,
  isProductionEnvironment,
  getFrontendUrl,
  getMemberFrontendUrl,
  sanitizeEmailUrl
};
