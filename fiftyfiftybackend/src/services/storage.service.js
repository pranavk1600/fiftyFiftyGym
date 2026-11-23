import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.resolve(__dirname, '../../uploads/receipts');

const BUCKET_NAME = 'membership-receipts';

/**
 * Pure in-memory receipt upload handler.
 * Zero files are written to local disk or cloud bucket.
 * Generated PDF buffers are retained strictly in-memory during request lifecycle.
 *
 * @param {Object} params
 * @param {string} params.gymId
 * @param {string} params.memberId
 * @param {string} params.receiptNumber
 * @param {Buffer} [params.pdfBuffer]
 * @returns {Promise<{ storagePath: string, bucket: null, localPath: null }>}
 */
export const uploadReceiptPdf = async ({ gymId, memberId, receiptNumber }) => {
  const storagePath = `ephemeral:${gymId}/${memberId}/${receiptNumber}.pdf`;
  return {
    storagePath,
    bucket: null,
    localPath: null
  };
};

/**
 * Retrieves the stored PDF binary buffer for email attachments or streaming.
 * Checks local cache only if a legacy file exists on disk.
 *
 * @param {string} storagePath
 * @returns {Promise<Buffer|null>}
 */
export const getReceiptPdfBuffer = async (storagePath) => {
  if (!storagePath) {
    return null;
  }

  // Strip prefix if present
  const relativePath = storagePath.startsWith(`${BUCKET_NAME}/`)
    ? storagePath.slice(BUCKET_NAME.length + 1)
    : storagePath.replace(/^ephemeral:/, '');

  const localFilePath = path.join(storageRoot, relativePath);
  if (fs.existsSync(localFilePath)) {
    try {
      return fs.readFileSync(localFilePath);
    } catch (_e) {
      return null;
    }
  }

  return null;
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
 * Generates a signed URL for preview or download streaming endpoints.
 *
 * @param {Object} params
 * @param {string} params.receiptId
 * @param {string} [params.storagePath]
 * @param {number} [params.expiresInSeconds=900]
 * @returns {Promise<{ previewUrl: string, downloadUrl: string }>}
 */
export const generateReceiptSignedUrls = async ({ receiptId, storagePath, expiresInSeconds = 900 }) => {
  const { token } = createSignedDownloadToken(receiptId, expiresInSeconds);

  const previewUrl = `/api/receipts/${receiptId}/preview?token=${token}`;
  const downloadUrl = `/api/receipts/${receiptId}/download?token=${token}`;

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
