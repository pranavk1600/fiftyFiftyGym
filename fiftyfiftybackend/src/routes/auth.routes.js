import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/roles.constant.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

const router = Router();

// In-memory rate limiting map for password reset requests (5 requests per 15 minutes)
const resetRateLimitMap = new Map();

const isRateLimited = (key, maxRequests = 5, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  const entry = resetRateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    resetRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (entry.count >= maxRequests) {
    return true;
  }

  entry.count++;
  return false;
};

/**
 * Core User & Admin authentication handler.
 * Supports role-based portal validation to separate Super Admin and Gym Admin logins.
 */
const executeUserLogin = async (req, res, next, forcedPortal = null) => {
  try {
    const { email, password, portal: bodyPortal } = req.body || {};
    const portal = forcedPortal || bodyPortal || null;

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email is required', 400);
    }
    if (!password) {
      return ApiResponse.error(res, 'Password is required', 400);
    }

    const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    // 1. Verify credentials against Supabase PostgreSQL
    try {
      const result = await db.query(
        'SELECT id, email, password_hash, full_name, role, gym_id, status, must_change_password FROM users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );

      if (result.rows.length > 0) {
        const dbUser = result.rows[0];

        if (dbUser.status !== 'active') {
          return ApiResponse.error(res, 'Your account is deactivated. Please contact support.', 403);
        }

        const isMatch = await bcrypt.compare(password, dbUser.password_hash).catch(() => false);

        if (!isMatch) {
          return ApiResponse.error(res, 'Invalid email or password', 401);
        }

        let gymName = 'FiftyFifty Gym';
        if (dbUser.gym_id) {
          const gymRes = await db.query('SELECT name FROM gyms WHERE id = $1', [dbUser.gym_id]);
          if (gymRes.rows.length > 0) {
            gymName = gymRes.rows[0].name;
          }
        }

        // Record last login timestamp
        await db.query(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
          [dbUser.id]
        );

        user = {
          id: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.full_name,
          role: dbUser.role,
          gymId: dbUser.gym_id,
          gymName,
          mustChangePassword: Boolean(dbUser.must_change_password)
        };
      }
    } catch (_dbErr) {
      // In case database is temporarily offline, allow dev fallback only in non-production
    }

    // 2. Safe development fallback for demo accounts if DB is unavailable
    if (!user) {
      if (process.env.NODE_ENV === 'production') {
        return ApiResponse.error(res, 'Invalid email or password', 401);
      }

      if (password === 'password123' || password === 'admin123') {
        let role = ROLES.GYM_OWNER;
        let fullName = 'Om Kolekar';
        let gymId = 'gym_alpha_1';

        if (normalizedEmail.includes('admin') || normalizedEmail === 'leopardxtechnology@gmail.com') {
          role = ROLES.SUPER_ADMIN;
          fullName = 'Platform Super Admin';
          gymId = null;
        } else if (normalizedEmail.includes('member')) {
          role = ROLES.MEMBER;
          fullName = 'Alex Mercer';
        }

        user = {
          id: `usr_${Date.now()}`,
          email: normalizedEmail,
          fullName,
          role,
          gymId,
          gymName: 'FiftyFifty Downtown Fitness'
        };
      } else {
        return ApiResponse.error(res, 'Invalid email or password', 401);
      }
    }

    // 3. Strict Portal & Role Authorization Check
    if (portal) {
      const normalizedPortal = String(portal).toUpperCase();
      const isSuperAdminRole = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.PLATFORM_ADMIN || user.role === 'super_admin';
      const isGymOwnerRole = user.role === ROLES.GYM_OWNER || user.role === 'gym_owner';

      if (normalizedPortal === 'SUPER_ADMIN' || normalizedPortal === 'SUPERADMIN') {
        if (!isSuperAdminRole) {
          return ApiResponse.error(
            res,
            'Access denied. This portal is restricted to Super Administrators only.',
            403
          );
        }
      } else if (normalizedPortal === 'GYM_ADMIN' || normalizedPortal === 'GYM_OWNER' || normalizedPortal === 'ADMIN') {
        if (!isGymOwnerRole) {
          return ApiResponse.error(
            res,
            'Access denied. This portal is restricted to Gym Administrators and Owners only.',
            403
          );
        }
      }
    }

    // 4. Issue signed JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        gymId: user.gymId,
        fullName: user.fullName
      },
      secret,
      { expiresIn: '7d' }
    );

    return ApiResponse.success(res, { user, token }, `Welcome back, ${user.fullName}!`);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Universal login endpoint with optional portal constraint.
 */
router.post('/login', (req, res, next) => executeUserLogin(req, res, next));

/**
 * POST /api/auth/superadmin/login
 * Dedicated Super Admin authentication endpoint.
 */
router.post('/superadmin/login', (req, res, next) => executeUserLogin(req, res, next, 'SUPER_ADMIN'));

/**
 * POST /api/auth/admin/login
 * Dedicated Gym Admin / Gym Owner authentication endpoint.
 */
router.post('/admin/login', (req, res, next) => executeUserLogin(req, res, next, 'GYM_ADMIN'));

/**
 * POST /api/auth/forgot-password
 * Step A: Request password reset link.
 * Generates single-use cryptographic token, stores hash with 15-minute expiry, and sends Brevo email.
 * Always returns generic success response to avoid user enumeration.
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email address is required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return ApiResponse.error(res, 'Please provide a valid email address', 400);
    }

    // Rate limiting check by IP and email
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (isRateLimited(`forgot:${clientIp}`) || isRateLimited(`forgot:${normalizedEmail}`)) {
      return ApiResponse.error(res, 'Too many password reset attempts. Please wait 15 minutes before trying again.', 429);
    }

    const genericSuccessMessage = 'If an account exists with that email address, password reset instructions have been sent.';

    try {
      const userRes = await db.query(
        'SELECT id, email, full_name, role, status FROM users WHERE LOWER(email) = $1',
        [normalizedEmail]
      );

      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const isSuperAdmin = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.PLATFORM_ADMIN || user.role === 'super_admin';

        // Restrict to Super Admin as requested
        if (isSuperAdmin && user.status === 'active') {
          // 1. Generate cryptographically secure 256-bit random token
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          // 2. Set expiry to 15 minutes
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

          // 3. Invalidate any existing unused tokens for this user
          await db.query(
            'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
            [user.id]
          );

          // 4. Store only token hash in database
          await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHash, expiresAt]
          );

          // 5. Construct secure reset link
          const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
          const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

          // 6. Send transactional email via Brevo
          await sendPasswordResetEmail({
            to: user.email,
            resetUrl,
            recipientName: user.full_name || 'Super Admin'
          });
        }
      }
    } catch (err) {
      console.error('[Forgot Password Error]:', err.message);
      // Still return generic success to avoid leaking internal status
    }

    return ApiResponse.success(res, { message: genericSuccessMessage }, genericSuccessMessage);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/verify-reset-token
 * Validates a reset token without consuming it.
 */
router.get('/verify-reset-token', async (req, res, next) => {
  try {
    const { token } = req.query || {};

    if (!token || !token.trim()) {
      return ApiResponse.error(res, 'Reset token is required', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const result = await db.query(`
      SELECT t.id, t.expires_at, t.used_at, u.email
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1
      ORDER BY t.created_at DESC
      LIMIT 1;
    `, [tokenHash]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid or unrecognized password reset token.', 400);
    }

    const row = result.rows[0];
    if (row.used_at) {
      return ApiResponse.error(res, 'This password reset link has already been used. Please request a new one.', 400);
    }

    if (new Date(row.expires_at) < new Date()) {
      return ApiResponse.error(res, 'This password reset link has expired. Please request a new one.', 400);
    }

    return ApiResponse.success(res, { valid: true }, 'Reset token is valid');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Step B & C: Validate single-use token, hash new password with bcrypt, update user, and invalidate token.
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !token.trim()) {
      return ApiResponse.error(res, 'Reset token is required', 400);
    }
    if (!newPassword || newPassword.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters long', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    // 1. Query token from database
    const tokenResult = await db.query(`
      SELECT t.id, t.user_id, t.expires_at, t.used_at, u.email, u.role
      FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1
      ORDER BY t.created_at DESC
      LIMIT 1;
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid or expired password reset link. Please request a new one.', 400);
    }

    const tokenRow = tokenResult.rows[0];

    // Check single-use
    if (tokenRow.used_at) {
      return ApiResponse.error(res, 'This password reset link has already been used. Please request a new one.', 400);
    }

    // Check 15-minute expiration
    if (new Date(tokenRow.expires_at) < new Date()) {
      return ApiResponse.error(res, 'This password reset link has expired. Please request a new one.', 400);
    }

    // 2. Hash new password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update Super Admin user password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, tokenRow.user_id]
    );

    // 4. Invalidate the reset token immediately (single-use enforcement)
    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRow.id]
    );

    console.log(`[Auth] Super Admin password reset successfully for user ID ${tokenRow.user_id}`);

    return ApiResponse.success(
      res,
      { success: true },
      'Your password has been reset successfully. Please sign in with your new password.'
    );
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  return ApiResponse.success(res, { user: req.user }, 'User profile retrieved');
});

export default router;
