import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { sendPasswordResetOtpEmail, sendPasswordChangeOtpEmail } from './email.service.js';
import { findInMemoryOwner } from './devGymStore.js';

// In-memory OTP cache for offline/test resilience and fast lookups
const memoryOtps = new Map();

// Rate limiting & cooldown stores: email/key -> timestamp
const sendCooldowns = new Map();
const requestCounts = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

/**
 * Computes deterministic SHA-256 hash of email + OTP.
 * Salting with the user's normalized email prevents rainbow table lookups.
 */
export const hashOtp = (email, otp) => {
  const normalized = (email || '').toLowerCase().trim();
  const cleanOtp = (otp || '').toString().trim();
  return crypto.createHash('sha256').update(`${normalized}:${cleanOtp}`).digest('hex');
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP string.
 */
export const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Ensures the password_reset_otps table exists in the PostgreSQL database.
 */
let tableEnsured = false;
export const ensureOtpTable = async () => {
  if (tableEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        user_type VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified_at TIMESTAMP WITH TIME ZONE,
        reset_token_hash VARCHAR(255),
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reset_otps_email ON password_reset_otps(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_reset_otps_user_id ON password_reset_otps(user_id);
      CREATE INDEX IF NOT EXISTS idx_reset_otps_reset_token ON password_reset_otps(reset_token_hash);
    `);
    tableEnsured = true;
  } catch (err) {
    // If DB is offline or mock, continue gracefully with in-memory fallback
    console.warn('[OTP Service] DB table check note:', err.message);
  }
};

/**
 * Checks resend cooldown and rate limits.
 */
export const checkRateLimit = (email, clientIp = 'unknown') => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const now = Date.now();

  // 1. Resend cooldown check (60s)
  const lastSent = sendCooldowns.get(normalizedEmail);
  if (lastSent && now - lastSent < OTP_RESEND_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
    return {
      allowed: false,
      reason: 'cooldown',
      remainingSeconds,
      message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before requesting another code.`
    };
  }

  // 2. IP & email window limit (max 5 requests per 15 minutes)
  const windowKey = `window_${clientIp}_${normalizedEmail}`;
  const record = requestCounts.get(windowKey);
  if (record) {
    if (now - record.windowStart < 15 * 60 * 1000) {
      if (record.count >= 5) {
        return {
          allowed: false,
          reason: 'limit',
          message: 'Too many verification code requests. Please wait 15 minutes before trying again.'
        };
      }
      record.count += 1;
    } else {
      requestCounts.set(windowKey, { windowStart: now, count: 1 });
    }
  } else {
    requestCounts.set(windowKey, { windowStart: now, count: 1 });
  }

  return { allowed: true };
};

/**
 * Searches across Super Admins, Gym Owners, and Members to locate an active account.
 */
export const findAccountByEmail = async (email, gymSlugHint = '') => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  // 1. Check Super Admins
  try {
    const saRes = await db.query(
      'SELECT id, email, full_name, status, role FROM super_admins WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );
    if (saRes.rows.length > 0 && saRes.rows[0].status === 'active') {
      const sa = saRes.rows[0];
      return {
        userId: sa.id,
        userType: 'SUPER_ADMIN',
        email: sa.email,
        fullName: sa.full_name || 'Super Admin',
        gymName: 'LeopardxGyms'
      };
    }
  } catch (_e) {}

  // 2. Check Gym Owners
  try {
    const ownerRes = await db.query(`
      SELECT 
        go.id, go.email, go.full_name, go.status, go.role,
        g.name AS gym_name, g.slug AS gym_slug
      FROM gym_owners go
      LEFT JOIN gyms g ON g.id = go.gym_id
      WHERE LOWER(go.email) = $1 AND go.status = 'active'
      LIMIT 1;
    `, [normalizedEmail]);
    if (ownerRes.rows.length > 0) {
      const owner = ownerRes.rows[0];
      return {
        userId: owner.id,
        userType: 'GYM_OWNER',
        email: owner.email,
        fullName: owner.full_name || 'Gym Owner',
        gymName: owner.gym_name || 'Your Gym'
      };
    }
  } catch (_e) {}

  // 3. Check Members
  try {
    const memberRes = await db.query(`
      SELECT 
        m.id, m.email, m.full_name, m.status,
        g.name AS gym_name, g.slug AS gym_slug
      FROM members m
      LEFT JOIN gyms g ON g.id = m.gym_id
      WHERE LOWER(m.email) = $1 AND m.status = 'active'
      LIMIT 1;
    `, [normalizedEmail]);
    if (memberRes.rows.length > 0) {
      const member = memberRes.rows[0];
      return {
        userId: member.id,
        userType: 'MEMBER',
        email: member.email,
        fullName: member.full_name || 'Member',
        gymName: member.gym_name || 'Your Gym'
      };
    }
  } catch (_e) {}

  // 4. In-Memory Store Check (for dev / test fallback)
  const inMemOwner = findInMemoryOwner(normalizedEmail);
  if (inMemOwner) {
    return {
      userId: inMemOwner.id,
      userType: 'GYM_OWNER',
      email: inMemOwner.email,
      fullName: inMemOwner.fullName || 'Gym Owner',
      gymName: 'LeopardxGyms'
    };
  }

  // 5. Check if matching process.env.SUPERADMIN_EMAIL in local dev
  const saEnv = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  if (saEnv && normalizedEmail === saEnv) {
    return {
      userId: 'sa_env_admin',
      userType: 'SUPER_ADMIN',
      email: saEnv,
      fullName: 'Super Admin',
      gymName: 'LeopardxGyms'
    };
  }

  return null;
};

/**
 * Generates and dispatches a 6-digit OTP for the given email address.
 * Never leaks account existence to callers.
 */
export const sendPasswordResetOtp = async ({ email, clientIp = 'unknown', gymSlug = '' }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  // 1. Rate limit check
  const rateLimit = checkRateLimit(normalizedEmail, clientIp);
  if (!rateLimit.allowed) {
    return {
      success: false,
      rateLimited: true,
      message: rateLimit.message,
      remainingSeconds: rateLimit.remainingSeconds
    };
  }

  // 2. Locate account across all roles
  const account = await findAccountByEmail(normalizedEmail, gymSlug);

  // If no account exists, return generic success to prevent enumeration
  if (!account) {
    sendCooldowns.set(normalizedEmail, Date.now());
    return {
      success: true,
      userFound: false,
      message: 'If an account exists with that email address, a 6-digit verification code has been sent.'
    };
  }

  // 3. Generate 6-digit OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(normalizedEmail, rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // 4. Invalidate previous in-memory OTPs for this email
  for (const [key, item] of memoryOtps.entries()) {
    if (item.email === normalizedEmail) {
      memoryOtps.delete(key);
    }
  }

  // 5. Store in memory
  const memoryKey = `${normalizedEmail}_${Date.now()}`;
  const memoryRecord = {
    id: memoryKey,
    userId: account.userId,
    userType: account.userType,
    email: normalizedEmail,
    otpHash,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt,
    verifiedAt: null,
    resetTokenHash: null,
    usedAt: null,
    createdAt: new Date()
  };
  memoryOtps.set(memoryKey, memoryRecord);

  // 6. Persist to DB table if available
  try {
    await ensureOtpTable();
    // Invalidate existing unused records for this user
    await db.query(
      'UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE LOWER(email) = $1 AND used_at IS NULL',
      [normalizedEmail]
    );
    await db.query(`
      INSERT INTO password_reset_otps (user_id, user_type, email, otp_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [account.userId, account.userType, normalizedEmail, otpHash, expiresAt]);
  } catch (err) {
    console.warn('[OTP Service] DB store error (memory fallback active):', err.message);
  }

  // Record cooldown timestamp
  sendCooldowns.set(normalizedEmail, Date.now());

  // 7. Dispatch OTP transactional email via Brevo
  await sendPasswordResetOtpEmail({
    to: account.email,
    otp: rawOtp,
    recipientName: account.fullName,
    gymName: account.gymName,
    expiryMinutes: 5
  });

  return {
    success: true,
    userFound: true,
    message: 'If an account exists with that email address, a 6-digit verification code has been sent.'
  };
};

/**
 * Sends a 6-digit OTP verification code specifically for Password Change requests via Brevo.
 */
export const sendPasswordChangeOtp = async ({ email, clientIp = 'unknown' }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail) {
    const error = new Error('Email address is required.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Enforce cooldown and rate limits
  const rateCheck = checkRateLimit(normalizedEmail, clientIp);
  if (!rateCheck.allowed) {
    const error = new Error(rateCheck.message);
    error.statusCode = 429;
    error.data = { remainingSeconds: rateCheck.remainingSeconds };
    throw error;
  }

  // 2. Locate account across all user tables
  const account = await findAccountByEmail(normalizedEmail);

  if (!account) {
    sendCooldowns.set(normalizedEmail, Date.now());
    return {
      success: true,
      userFound: false,
      message: 'If an account exists with that email address, a 6-digit verification code has been sent.'
    };
  }

  // 3. Generate 6-digit OTP
  const rawOtp = generateSecureOtp();
  const otpHash = hashOtp(normalizedEmail, rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // 4. Invalidate previous in-memory OTPs for this email
  for (const [key, item] of memoryOtps.entries()) {
    if (item.email === normalizedEmail) {
      memoryOtps.delete(key);
    }
  }

  // 5. Store in memory
  const memoryKey = `change_${normalizedEmail}_${Date.now()}`;
  const memoryRecord = {
    id: memoryKey,
    userId: account.userId,
    userType: account.userType,
    email: normalizedEmail,
    otpHash,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    expiresAt,
    verifiedAt: null,
    resetTokenHash: null,
    usedAt: null,
    createdAt: new Date()
  };
  memoryOtps.set(memoryKey, memoryRecord);

  // 6. Persist to DB table if available
  try {
    await ensureOtpTable();
    await db.query(
      'UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE LOWER(email) = $1 AND used_at IS NULL',
      [normalizedEmail]
    );
    await db.query(`
      INSERT INTO password_reset_otps (user_id, user_type, email, otp_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [account.userId, account.userType, normalizedEmail, otpHash, expiresAt]);
  } catch (err) {
    console.warn('[OTP Service] DB store error (memory fallback active):', err.message);
  }

  // Record cooldown timestamp
  sendCooldowns.set(normalizedEmail, Date.now());

  // 7. Dispatch Password Change OTP transactional email via Brevo
  await sendPasswordChangeOtpEmail({
    to: account.email,
    otp: rawOtp,
    recipientName: account.fullName,
    gymName: account.gymName,
    expiryMinutes: 5
  });

  return {
    success: true,
    userFound: true,
    message: 'If an account exists with that email address, a 6-digit verification code has been sent.'
  };
};

/**
 * Validates a submitted 6-digit OTP code against the stored hash.
 * Enforces 5-minute expiry, single-use, and max 5 failed attempts limit.
 */
export const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const submittedOtp = (otp || '').toString().trim();

  if (!submittedOtp || submittedOtp.length !== 6 || !/^\d{6}$/.test(submittedOtp)) {
    return {
      success: false,
      message: 'Please enter a valid 6-digit numeric verification code.'
    };
  }

  // Look up latest memory record
  let record = null;
  for (const [, item] of memoryOtps.entries()) {
    if (item.email === normalizedEmail && !item.usedAt) {
      if (!record || item.createdAt > record.createdAt) {
        record = item;
      }
    }
  }

  // Look up in DB if not in memory or to sync
  try {
    const dbRes = await db.query(`
      SELECT * FROM password_reset_otps
      WHERE LOWER(email) = $1 AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1;
    `, [normalizedEmail]);

    if (dbRes.rows.length > 0) {
      const row = dbRes.rows[0];
      if (!record || new Date(row.created_at) >= new Date(record.createdAt)) {
        record = {
          id: row.id,
          userId: row.user_id,
          userType: row.user_type,
          email: row.email,
          otpHash: row.otp_hash,
          attempts: row.attempts,
          maxAttempts: row.max_attempts || MAX_ATTEMPTS,
          expiresAt: new Date(row.expires_at),
          verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
          resetTokenHash: row.reset_token_hash,
          usedAt: row.used_at,
          createdAt: new Date(row.created_at),
          isDb: true
        };
      }
    }
  } catch (_e) {}

  if (!record) {
    return {
      success: false,
      message: 'No active verification code found for this email. Please request a new one.'
    };
  }

  // Single-use check: if already verified or consumed, reject
  if (record.verifiedAt || record.usedAt) {
    return {
      success: false,
      message: 'This verification code has already been verified and used. Please request a new one.'
    };
  }

  // Expiry check
  if (new Date() > record.expiresAt) {
    return {
      success: false,
      expired: true,
      message: 'This verification code has expired (valid for 5 minutes). Please request a new one.'
    };
  }

  // Attempts limit check
  if (record.attempts >= record.maxAttempts) {
    return {
      success: false,
      locked: true,
      message: 'Too many incorrect attempts. This code is now invalid. Please request a new one.'
    };
  }

  // Validate OTP hash
  const submittedHash = hashOtp(normalizedEmail, submittedOtp);
  if (submittedHash !== record.otpHash) {
    record.attempts += 1;
    const remaining = record.maxAttempts - record.attempts;

    if (record.isDb) {
      try {
        await db.query(
          'UPDATE password_reset_otps SET attempts = $1 WHERE id = $2',
          [record.attempts, record.id]
        );
      } catch (_e) {}
    }

    if (remaining <= 0) {
      return {
        success: false,
        locked: true,
        message: 'Too many incorrect attempts. This code is now invalid. Please request a new one.'
      };
    }

    return {
      success: false,
      message: `Invalid verification code. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    };
  }

  // Correct OTP! Generate single-use resetToken
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
  const now = new Date();

  record.verifiedAt = now;
  record.resetTokenHash = resetTokenHash;

  if (record.isDb) {
    try {
      await db.query(
        'UPDATE password_reset_otps SET verified_at = $1, reset_token_hash = $2 WHERE id = $3',
        [now, resetTokenHash, record.id]
      );
    } catch (_e) {}
  }

  return {
    success: true,
    resetToken: rawResetToken,
    message: 'Verification code confirmed successfully.'
  };
};

/**
 * Resets the user's password using the verified resetToken.
 * Securely hashes the new password with bcrypt and updates the database.
 */
export const resetPasswordWithOtpToken = async ({ email, resetToken, newPassword }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!resetToken || !resetToken.trim()) {
    return {
      success: false,
      message: 'Verification reset token is missing or invalid. Please verify your OTP again.'
    };
  }

  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      message: 'Password must be at least 8 characters long.'
    };
  }

  const tokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');

  // Look up verified record in memory or DB
  let record = null;
  for (const [, item] of memoryOtps.entries()) {
    if (
      item.email === normalizedEmail &&
      item.resetTokenHash === tokenHash &&
      item.verifiedAt &&
      !item.usedAt
    ) {
      record = item;
      break;
    }
  }

  if (!record) {
    try {
      const dbRes = await db.query(`
        SELECT * FROM password_reset_otps
        WHERE LOWER(email) = $1 AND reset_token_hash = $2 AND verified_at IS NOT NULL AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1;
      `, [normalizedEmail, tokenHash]);

      if (dbRes.rows.length > 0) {
        const row = dbRes.rows[0];
        record = {
          id: row.id,
          userId: row.user_id,
          userType: row.user_type,
          email: row.email,
          verifiedAt: row.verified_at,
          isDb: true
        };
      }
    } catch (_e) {}
  }

  if (!record) {
    return {
      success: false,
      message: 'Invalid or expired session. Please start the verification process again.'
    };
  }

  // Token valid window: within 15 minutes of OTP verification
  const tokenWindowMs = 15 * 60 * 1000;
  if (Date.now() - new Date(record.verifiedAt).getTime() > tokenWindowMs) {
    return {
      success: false,
      message: 'Verification session has expired. Please request a new code.'
    };
  }

  // Hash new password using bcrypt (cost factor 10)
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const now = new Date();

  // Update password in respective table
  let updated = false;
  if (record.userType === 'SUPER_ADMIN') {
    try {
      await db.query(
        'UPDATE super_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 OR LOWER(email) = $3',
        [passwordHash, record.userId, normalizedEmail]
      );
      updated = true;
    } catch (_e) {}
  } else if (record.userType === 'GYM_OWNER') {
    try {
      await db.query(`
        UPDATE gym_owners 
        SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 OR LOWER(email) = $3
      `, [passwordHash, record.userId, normalizedEmail]);
      updated = true;
    } catch (_e) {}
  } else if (record.userType === 'MEMBER') {
    try {
      await db.query(`
        UPDATE members 
        SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 OR LOWER(email) = $3
      `, [passwordHash, record.userId, normalizedEmail]);
      await db.query(`
        UPDATE users 
        SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 OR LOWER(email) = $3
      `, [passwordHash, record.userId, normalizedEmail]);
      updated = true;
    } catch (_e) {}
  }

  // Mark OTP record as consumed (single-use)
  record.usedAt = now;
  if (record.isDb) {
    try {
      await db.query(
        'UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [record.id]
      );
    } catch (_e) {}
  }

  // Also clean up any lingering reset tokens for this user
  try {
    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
      [record.userId]
    );
  } catch (_e) {}

  return {
    success: true,
    message: 'Password Reset Successfully!'
  };
};

/**
 * Test helper to clear memory stores between test runs.
 */
export const _resetOtpMemoryForTest = () => {
  memoryOtps.clear();
  sendCooldowns.clear();
  requestCounts.clear();
};

export default {
  hashOtp,
  generateSecureOtp,
  checkRateLimit,
  findAccountByEmail,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtpToken,
  _resetOtpMemoryForTest
};
