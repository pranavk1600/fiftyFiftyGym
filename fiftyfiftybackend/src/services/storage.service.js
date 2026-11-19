import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.resolve(__dirname, '../../uploads/receipts');

// Initialize Supabase Storage Client if credentials exist
let supabaseClient = null;
const supabaseUrl = process.env.SUPABASE_URL || 'https://dntnzfxcoyopsmrifdbq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('[Storage Service] Supabase Storage client initialized for URL:', supabaseUrl);
  } catch (err) {
    console.warn('[Storage Service] Supabase client init warning:', err.message);
  }
}

const BUCKET_NAME = 'membership-receipts';

/**
 * Uploads a generated PDF to Supabase Storage and maintains a reliable local copy.
 * Path format: membership-receipts/{gymId}/{memberId}/{receiptNumber}.pdf
 *
 * @param {Object} params
 * @param {string} params.gymId
 * @param {string} params.memberId
 * @param {string} params.receiptNumber
 * @param {Buffer} params.pdfBuffer
 * @returns {Promise<{ storagePath: string, bucket: string, localPath: string }>}
 */
export const uploadReceiptPdf = async ({ gymId, memberId, receiptNumber, pdfBuffer }) => {
  if (!gymId || !memberId || !receiptNumber || !pdfBuffer) {
    throw new Error('Missing parameters for receipt PDF upload');
  }

  const relativeObjectPath = `${gymId}/${memberId}/${receiptNumber}.pdf`;
  const storagePath = `membership-receipts/${relativeObjectPath}`;

  // 1. Maintain private local copy for guaranteed instant access & Brevo attachments
  const gymDir = path.join(storageRoot, gymId, memberId);
  fs.mkdirSync(gymDir, { recursive: true });
  const localFilePath = path.join(gymDir, `${receiptNumber}.pdf`);
  fs.writeFileSync(localFilePath, pdfBuffer);

  // 2. Upload to Supabase Storage if client is configured
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(relativeObjectPath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        console.warn('[Storage Service Notice] Supabase storage upload warning:', error.message);
      } else {
        console.log(`[Storage Service] Uploaded ${receiptNumber}.pdf to Supabase Storage (${data?.path || relativeObjectPath})`);
      }
    } catch (sbErr) {
      console.warn('[Storage Service] Supabase Storage upload exception:', sbErr.message);
    }
  }

  return {
    storagePath,
    bucket: BUCKET_NAME,
    localPath: localFilePath
  };
};

/**
 * Retrieves the stored PDF binary buffer for email attachments or streaming.
 * Checks local cache first, then falls back to Supabase Storage.
 *
 * @param {string} storagePath - e.g. "membership-receipts/{gymId}/{memberId}/{receiptNumber}.pdf"
 * @returns {Promise<Buffer>}
 */
export const getReceiptPdfBuffer = async (storagePath) => {
  if (!storagePath) {
    throw new Error('storagePath is required to retrieve receipt PDF');
  }

  // Strip bucket prefix if present
  const relativePath = storagePath.startsWith(`${BUCKET_NAME}/`)
    ? storagePath.slice(BUCKET_NAME.length + 1)
    : storagePath;

  // 1. Check local file copy
  const localFilePath = path.join(storageRoot, relativePath);
  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }

  // 2. Fall back to Supabase Storage download
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .download(relativePath);

      if (error) {
        throw error;
      }

      if (data) {
        const arrayBuf = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        // Cache locally for subsequent fast reads
        try {
          fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
          fs.writeFileSync(localFilePath, buffer);
        } catch (_e) {}
        return buffer;
      }
    } catch (err) {
      console.error('[Storage Service] Supabase download error:', err.message);
    }
  }

  throw new Error(`Receipt PDF not found in storage at path: ${storagePath}`);
};

/**
 * Generates an HMAC-signed secure short-lived preview/download token (15 minutes).
 *
 * @param {string} receiptId
 * @param {number} expiresInSeconds - default 900 (15 min)
 * @returns {{ token: string, expires: number }}
 */
export const createSignedDownloadToken = (receiptId, expiresInSeconds = 900) => {
  const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${receiptId}:${expires}`)
    .digest('hex');

  const token = `${expires}.${signature}`;
  return { token, expires };
};

/**
 * Validates a signed download token.
 *
 * @param {string} receiptId
 * @param {string} token
 * @returns {boolean}
 */
export const verifySignedDownloadToken = (receiptId, token) => {
  if (!token || !receiptId) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [expiresStr, providedSignature] = parts;
  const expires = parseInt(expiresStr, 10);
  if (isNaN(expires)) return false;

  // Check expiration
  if (Math.floor(Date.now() / 1000) > expires) {
    return false;
  }

  const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${receiptId}:${expires}`)
    .digest('hex');

  const bufProvided = Buffer.from(providedSignature, 'hex');
  const bufExpected = Buffer.from(expectedSignature, 'hex');
  if (bufProvided.length !== bufExpected.length || bufProvided.length === 0) {
    return false;
  }

  return crypto.timingSafeEqual(bufProvided, bufExpected);
};

/**
 * Generates a signed URL for preview or download.
 * If Supabase Storage is configured, attempts to create a native Supabase signed URL;
 * otherwise provides an authenticated backend signed endpoint URL.
 *
 * @param {Object} params
 * @param {string} params.receiptId
 * @param {string} params.storagePath
 * @param {number} [params.expiresInSeconds=900]
 * @returns {Promise<{ previewUrl: string, downloadUrl: string }>}
 */
export const generateReceiptSignedUrls = async ({ receiptId, storagePath, expiresInSeconds = 900 }) => {
  const { token } = createSignedDownloadToken(receiptId, expiresInSeconds);

  const previewUrl = `/api/receipts/${receiptId}/preview?token=${token}`;
  const downloadUrl = `/api/receipts/${receiptId}/download?token=${token}`;

  // If Supabase Storage is live and key exists, check if native signed URL is possible
  if (supabaseClient) {
    try {
      const relativePath = storagePath.startsWith(`${BUCKET_NAME}/`)
        ? storagePath.slice(BUCKET_NAME.length + 1)
        : storagePath;

      const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .createSignedUrl(relativePath, expiresInSeconds);

      if (!error && data?.signedUrl) {
        return {
          previewUrl: data.signedUrl,
          downloadUrl: `${data.signedUrl}&download=true`,
          backendPreviewUrl: previewUrl,
          backendDownloadUrl: downloadUrl
        };
      }
    } catch (_e) {
      // Fallback cleanly to backend authenticated signed streaming URLs
    }
  }

  return {
    previewUrl,
    downloadUrl
  };
};

export default {
  uploadReceiptPdf,
  getReceiptPdfBuffer,
  createSignedDownloadToken,
  verifySignedDownloadToken,
  generateReceiptSignedUrls
};
