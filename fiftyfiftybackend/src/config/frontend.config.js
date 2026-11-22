export const PRODUCTION_FRONTEND_URL = 'https://fiftyfiftygym.vercel.app';
export const LOCAL_DEV_FRONTEND_URL = 'http://localhost:5173';

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
 * 1. If running in production or hosted cloud (Render, Vercel, etc.):
 *    - Uses FRONTEND_URL if provided, UNLESS it points to localhost / 127.0.0.1.
 *    - Never outputs localhost in production; strictly defaults to PRODUCTION_FRONTEND_URL.
 * 2. In local development:
 *    - Uses FRONTEND_URL if specified.
 *    - Defaults to LOCAL_DEV_FRONTEND_URL ('http://localhost:5173').
 * 3. Strips trailing slashes cleanly.
 */
export const getFrontendUrl = () => {
  const isProd = isProductionEnvironment();
  const configured = (process.env.FRONTEND_URL || '').trim();

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
 * Sanitizes any URL before it is placed into an outgoing email.
 * Guarantees that in production, no localhost URL can ever be sent out.
 */
export const sanitizeEmailUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const isProd = isProductionEnvironment();

  if (isProd) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url.replace(/https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?)/gi, PRODUCTION_FRONTEND_URL);
    }
  }

  return url;
};

export default {
  PRODUCTION_FRONTEND_URL,
  LOCAL_DEV_FRONTEND_URL,
  isProductionEnvironment,
  getFrontendUrl,
  sanitizeEmailUrl
};
