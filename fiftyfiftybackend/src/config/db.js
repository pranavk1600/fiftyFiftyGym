import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultEnvPath = path.resolve(__dirname, '../../.env');

// Ensure environment variables are loaded regardless of import hoisting or working directory
dotenv.config({ path: defaultEnvPath });

/**
 * Safely masks database credentials from a connection string for safe logging.
 * Replaces the password segment with '****'.
 */
export const sanitizeDbUrl = (connString) => {
  if (!connString) return 'Not configured';
  try {
    const url = new URL(connString);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch (_e) {
    return connString.replace(/:([^@]+)@/, ':****@');
  }
};

/**
 * Check if the connection string is missing or uses placeholder credentials.
 */
export const isPlaceholderConfig = (connString) => {
  const str = connString !== undefined ? connString : (process.env.DATABASE_URL || '');
  return !str || str.includes('YOUR_ACTUAL_PASSWORD');
};

/**
 * Parses the connection string into a pg.Pool configuration object.
 * Correctly decodes URL-encoded passwords so special characters are preserved
 * without double encoding or URL parsing errors.
 */
export const parseDbConfig = (connString) => {
  const raw = connString || process.env.DATABASE_URL || '';
  if (isPlaceholderConfig(raw)) {
    return null;
  }

  try {
    const url = new URL(raw);
    const isSupabase = url.hostname.includes('supabase.co') || url.hostname.includes('supabase.com');

    // Decode password so pg receives raw credentials directly in the protocol stream
    // avoiding URL delimiter collisions or double-encoding issues
    const rawPassword = url.password ? decodeURIComponent(url.password) : '';

    return {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      user: url.username ? decodeURIComponent(url.username) : 'postgres',
      password: rawPassword,
      database: url.pathname.replace(/^\//, '') || 'postgres',
      ssl: isSupabase || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000 // 15-second connection timeout for remote cloud pooler
    };
  } catch (err) {
    console.error('[Database Config Error] Failed to parse DATABASE_URL:', err.message);
    return null;
  }
};

let activePool = null;
let activeConnString = null;

/**
 * Dynamically acquires or creates the pg connection pool instance.
 */
export const getPool = () => {
  const currentUrl = process.env.DATABASE_URL || '';
  if (isPlaceholderConfig(currentUrl)) {
    return null;
  }

  if (activePool && activeConnString === currentUrl) {
    return activePool;
  }

  if (activePool) {
    activePool.end().catch(() => {});
  }

  const poolConfig = parseDbConfig(currentUrl);
  if (!poolConfig) {
    return null;
  }

  activePool = new Pool(poolConfig);
  activeConnString = currentUrl;

  activePool.on('error', (err) => {
    console.error('[Database Pool Error]: Unexpected client error', err.message);
  });

  return activePool;
};

/**
 * Execute a parameterized SQL query using the connection pool.
 */
export const query = async (text, params) => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database is not configured. Please set your actual database password in .env');
  }
  return pool.query(text, params);
};

/**
 * Acquire a client from the pool for transactions.
 */
export const getClient = async () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database is not configured. Please set your actual database password in .env');
  }
  return pool.connect();
};

/**
 * Safe database connectivity probe that never exposes credentials.
 */
export const checkDatabaseHealth = async () => {
  const currentUrl = process.env.DATABASE_URL || '';

  if (isPlaceholderConfig(currentUrl)) {
    return {
      connected: false,
      status: 'unconfigured',
      message: 'DATABASE_URL is missing or contains placeholder "YOUR_ACTUAL_PASSWORD". Update with your real database password.',
      target: sanitizeDbUrl(currentUrl)
    };
  }

  const pool = getPool();
  if (!pool) {
    return {
      connected: false,
      status: 'unconfigured',
      message: 'DATABASE_URL could not be parsed into a valid connection pool configuration.',
      target: sanitizeDbUrl(currentUrl)
    };
  }

  const start = Date.now();
  try {
    const result = await pool.query('SELECT 1 AS connected, NOW() AS current_time, current_database() AS db_name, version() AS db_version;');
    const latencyMs = Date.now() - start;

    return {
      connected: true,
      status: 'connected',
      latencyMs,
      database: result.rows[0]?.db_name,
      serverTime: result.rows[0]?.current_time,
      version: result.rows[0]?.db_version,
      target: sanitizeDbUrl(currentUrl)
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    let hint = 'Check network connection and database credentials.';

    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      hint = 'Direct connection host failed or timed out. Supabase direct host (db.[ref].supabase.co) requires IPv6. If your network lacks IPv6, use the Supabase Session Pooler (aws-0-[region].pooler.supabase.com:5432) with user "postgres.[ref]".';
    } else if (error.code === '28P01') {
      hint = 'Password authentication failed. Please verify your Supabase database password in .env.';
    } else if (error.code === 'XX000' && error.message.includes('tenant')) {
      hint = 'Supabase pooler tenant not found. Verify your project region and make sure username is "postgres.[project-ref]".';
    } else if (error.code === '3D000') {
      hint = 'Target database does not exist on the server.';
    }

    return {
      connected: false,
      status: 'error',
      errorCode: error.code || 'UNKNOWN',
      errorMessage: error.message,
      hint,
      latencyMs,
      target: sanitizeDbUrl(currentUrl)
    };
  }
};

export default {
  query,
  getClient,
  getPool,
  checkDatabaseHealth,
  sanitizeDbUrl,
  isPlaceholderConfig,
  parseDbConfig
};
