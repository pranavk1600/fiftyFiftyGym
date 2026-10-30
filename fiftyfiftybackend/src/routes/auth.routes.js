import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/roles.constant.js';
import { sendPasswordResetEmail, sendGymOwnerPasswordResetEmail, sendMemberPasswordResetEmail } from '../services/email.service.js';

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
 * Super Admin authentication handler.
 * Strictly queries `super_admins` table only.
 * Never authenticates against gym_owners or users.
 */
const executeSuperAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email is required', 400);
    }
    if (!password) {
      return ApiResponse.error(res, 'Password is required', 400);
    }

    const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
    const normalizedEmail = email.toLowerCase().trim();

    const result = await db.query(
      'SELECT id, email, password_hash, full_name, role, status FROM super_admins WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    const row = result.rows[0];

    // Only accept accounts with Super Admin role
    const normalizedRole = (row.role || '').toUpperCase();
    if (normalizedRole !== 'SUPER_ADMIN' && normalizedRole !== 'PLATFORM_ADMIN') {
      return ApiResponse.error(res, 'Access denied. Account is not a Super Admin.', 403);
    }

    if (row.status !== 'active') {
      return ApiResponse.error(res, 'Your Super Admin account is deactivated. Please contact administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, row.password_hash).catch(() => false);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    await db.query(
      'UPDATE super_admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [row.id]
    );

    const superAdmin = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: ROLES.SUPER_ADMIN,
      gymId: null,
      gymName: 'Platform Governance'
    };

    const token = jwt.sign(
      {
        id: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role,
        gymId: null,
        fullName: superAdmin.fullName
      },
      secret,
      { expiresIn: '7d' }
    );

    return ApiResponse.success(res, { user: superAdmin, token }, `Welcome back, ${superAdmin.fullName}!`);
  } catch (error) {
    console.error('[Super Admin Login Error]:', error.message);
    return ApiResponse.error(res, 'Database error during authentication', 500);
  }
};

/**
 * Gym Owner authentication handler.
 * Strictly queries `gym_owners` table only.
 * Never authenticates against super_admins.
 */
const executeGymOwnerLogin = async (req, res, next) => {
  try {
    const { email, password, gymSlug, slug } = req.body || {};
    const targetSlug = (gymSlug || slug || '').toLowerCase().trim();

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email is required', 400);
    }
    if (!password) {
      return ApiResponse.error(res, 'Password is required', 400);
    }

    const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
    const normalizedEmail = email.toLowerCase().trim();

    // If gymSlug is specified, verify that the gym exists first
    let targetGym = null;
    if (targetSlug) {
      const hyphenatedTargetSlug = targetSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const gymQuery = await db.query(
        'SELECT id, name, slug, status FROM gyms WHERE LOWER(slug) = $1 OR LOWER(slug) = $2 OR id = $1 LIMIT 1',
        [targetSlug, hyphenatedTargetSlug]
      );
      if (gymQuery.rows.length === 0) {
        return ApiResponse.error(res, 'Gym not found', 404);
      }
      targetGym = gymQuery.rows[0];
    }

    const result = await db.query(
      'SELECT go.id, go.email, go.password_hash, go.full_name, go.phone, go.role, go.gym_id, go.status, go.must_change_password, g.name AS gym_name, g.slug AS gym_slug, g.status AS gym_status, g.logo_url AS gym_logo_url FROM gym_owners go LEFT JOIN gyms g ON g.id = go.gym_id WHERE LOWER(go.email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    const row = result.rows[0];

    // Reject deleted, inactive or unapproved accounts
    if (row.status !== 'active') {
      return ApiResponse.error(res, 'Your Gym Owner account is deactivated or unapproved. Please contact support.', 403);
    }

    // Verify account belongs to active gym if specified
    if (row.gym_status && row.gym_status !== 'active') {
      return ApiResponse.error(res, 'Your gym branch is currently inactive. Please contact support.', 403);
    }

    // Enforce gym ownership when logging in through a specific gym portal
    if (targetGym && row.gym_id !== targetGym.id) {
      return ApiResponse.error(res, 'Access denied: You do not have owner authorization for this specific gym portal.', 403);
    }

    const isMatch = await bcrypt.compare(password, row.password_hash).catch(() => false);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    const gymName = row.gym_name || (targetGym ? targetGym.name : 'FiftyFifty Gym');
    const gymSlugValue =
      row.gym_slug ||
      (targetGym ? targetGym.slug : '') ||
      (gymName ? gymName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : '');

    await db.query(
      'UPDATE gym_owners SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [row.id]
    );

    const gymOwner = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: ROLES.GYM_OWNER,
      gymId: row.gym_id,
      gymName,
      gymSlug: gymSlugValue,
      gymLogoUrl: row.gym_logo_url || null,
      mustChangePassword: Boolean(row.must_change_password)
    };

    const token = jwt.sign(
      {
        id: gymOwner.id,
        email: gymOwner.email,
        role: gymOwner.role,
        gymId: gymOwner.gymId,
        gymSlug: gymOwner.gymSlug,
        fullName: gymOwner.fullName
      },
      secret,
      { expiresIn: '7d' }
    );

    return ApiResponse.success(res, { user: gymOwner, token }, `Welcome back, ${gymOwner.fullName}!`);
  } catch (error) {
    console.error('[Gym Owner Login Error]:', error.message);
    return ApiResponse.error(res, 'Database error during authentication', 500);
  }
};

/**
 * Gym Member authentication handler.
 * Queries `members` table for authentic member credentials, with fallback to `users`.
 */
const executeMemberLogin = async (req, res, next) => {
  try {
    const { email, password, gymSlug, slug, memberSlug } = req.body || {};
    const targetGymSlug = (gymSlug || slug || '').toLowerCase().trim();

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email is required', 400);
    }
    if (!password) {
      return ApiResponse.error(res, 'Password is required', 400);
    }

    const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';
    const normalizedEmail = email.toLowerCase().trim();

    // If gym context is provided, resolve and verify the gym
    let targetGym = null;
    if (targetGymSlug) {
      const hyphenatedGymSlug = targetGymSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const gymQuery = await db.query(
        'SELECT id, name, slug, status, logo_url FROM gyms WHERE LOWER(slug) = $1 OR LOWER(slug) = $2 OR id = $1 LIMIT 1',
        [targetGymSlug, hyphenatedGymSlug]
      );
      if (gymQuery.rows.length === 0) {
        return ApiResponse.error(res, 'Gym not found', 404);
      }
      targetGym = gymQuery.rows[0];
      if (targetGym.status !== 'active') {
        return ApiResponse.error(res, 'Your gym branch is currently inactive. Please contact support.', 403);
      }
    }

    // 1. Check primary `members` table
    let memQueryText = `
      SELECT 
        m.id, m.email, m.password_hash, m.full_name, m.phone, m.gym_id, m.status, m.slug AS member_slug,
        m.current_plan_name, TO_CHAR(m.join_date, 'YYYY-MM-DD') AS join_date, TO_CHAR(m.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        g.name AS gym_name, g.slug AS gym_slug, g.status AS gym_status, g.logo_url AS gym_logo_url
      FROM members m
      LEFT JOIN gyms g ON g.id = m.gym_id
      WHERE LOWER(m.email) = $1
    `;
    const memParams = [normalizedEmail];

    if (targetGym) {
      memParams.push(targetGym.id);
      memQueryText += ` AND m.gym_id = $${memParams.length}`;
    }

    memQueryText += ' LIMIT 1;';

    const memRes = await db.query(memQueryText, memParams);

    if (memRes.rows.length > 0) {
      const row = memRes.rows[0];

      if (row.gym_status && row.gym_status !== 'active') {
        return ApiResponse.error(res, 'Your gym branch is currently inactive. Please contact support.', 403);
      }

      if (row.status !== 'active') {
        return ApiResponse.error(res, 'Your Member account is inactive. Please contact your gym administrator.', 403);
      }

      // Check memberSlug alignment if supplied
      if (memberSlug) {
        const cleanMemberSlug = memberSlug.toLowerCase().trim();
        const hyphenatedMemberSlug = cleanMemberSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (row.member_slug !== cleanMemberSlug && row.member_slug !== hyphenatedMemberSlug && row.id !== cleanMemberSlug) {
          return ApiResponse.error(res, 'Your member account credentials do not match this dedicated member portal URL', 403);
        }
      }

      const isMatch = await bcrypt.compare(password, row.password_hash).catch(() => false);
      if (!isMatch) {
        return ApiResponse.error(res, 'Invalid email or password', 401);
      }

      await db.query('UPDATE members SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [row.id]);

      const memberUser = {
        id: row.id,
        memberId: row.id,
        email: row.email,
        fullName: row.full_name,
        role: ROLES.MEMBER,
        gymId: row.gym_id,
        gymName: row.gym_name || (targetGym ? targetGym.name : 'FiftyFifty Gym'),
        gymSlug: row.gym_slug || (targetGym ? targetGym.slug : ''),
        gymLogoUrl: row.gym_logo_url || (targetGym ? targetGym.logo_url : null),
        memberSlug: row.member_slug || '',
        planName: row.current_plan_name || null,
        joinDate: row.join_date || null,
        expiryDate: row.expiry_date || null
      };

      const token = jwt.sign(
        {
          id: memberUser.id,
          memberId: memberUser.id,
          email: memberUser.email,
          role: memberUser.role,
          gymId: memberUser.gymId,
          gymSlug: memberUser.gymSlug,
          memberSlug: memberUser.memberSlug,
          fullName: memberUser.fullName
        },
        secret,
        { expiresIn: '7d' }
      );

      return ApiResponse.success(res, { user: memberUser, token }, `Welcome, ${memberUser.fullName}!`);
    }

    // If targetGym was specified and member was not found in it, reject cross-gym access
    if (targetGym) {
      return ApiResponse.error(res, 'Invalid email or password for this gym portal', 401);
    }

    // 2. Fallback to `users` table for legacy member records
    const result = await db.query(`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.gym_id, u.status, g.name AS gym_name, g.slug AS gym_slug
      FROM users u
      LEFT JOIN gyms g ON g.id = u.gym_id
      WHERE LOWER(u.email) = $1 AND u.role = 'MEMBER'
      LIMIT 1;
    `, [normalizedEmail]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    const row = result.rows[0];

    if (row.status !== 'active') {
      return ApiResponse.error(res, 'Your Member account is inactive. Please contact your gym administrator.', 403);
    }

    const isMatch = await bcrypt.compare(password, row.password_hash).catch(() => false);
    if (!isMatch) {
      return ApiResponse.error(res, 'Invalid email or password', 401);
    }

    let memberDetails = null;
    try {
      const legacyMemRes = await db.query(
        'SELECT id, phone, current_plan_name, expiry_date, status, slug FROM members WHERE user_id = $1 OR LOWER(email) = $2 LIMIT 1',
        [row.id, normalizedEmail]
      );
      if (legacyMemRes.rows.length > 0) {
        memberDetails = legacyMemRes.rows[0];
      }
    } catch (_mErr) {
      // Non-fatal if members profile row is missing
    }

    const memberUser = {
      id: row.id,
      memberId: memberDetails?.id || null,
      email: row.email,
      fullName: row.full_name,
      role: ROLES.MEMBER,
      gymId: row.gym_id,
      gymName: row.gym_name || 'FiftyFifty Gym',
      gymSlug: row.gym_slug || '',
      memberSlug: memberDetails?.slug || '',
      planName: memberDetails?.current_plan_name || null,
      expiryDate: memberDetails?.expiry_date || null
    };

    const token = jwt.sign(
      {
        id: memberUser.id,
        email: memberUser.email,
        role: memberUser.role,
        gymId: memberUser.gymId,
        fullName: memberUser.fullName
      },
      secret,
      { expiresIn: '7d' }
    );

    return ApiResponse.success(res, { user: memberUser, token }, `Welcome, ${memberUser.fullName}!`);
  } catch (error) {
    console.error('[Member Login Error]:', error.message);
    return ApiResponse.error(res, 'Database error during authentication', 500);
  }
};

/**
 * Universal login endpoint (/api/auth/login).
 * If portal is specified, routes strictly to corresponding table.
 * If portal is omitted, checks super_admins first, then gym_owners, then members.
 */
const executeUserLogin = async (req, res, next) => {
  const { portal } = req.body || {};
  if (portal) {
    const normalizedPortal = String(portal).toUpperCase();
    if (normalizedPortal === 'SUPER_ADMIN' || normalizedPortal === 'SUPERADMIN') {
      return executeSuperAdminLogin(req, res, next);
    }
    if (normalizedPortal === 'GYM_ADMIN' || normalizedPortal === 'GYM_OWNER' || normalizedPortal === 'ADMIN') {
      return executeGymOwnerLogin(req, res, next);
    }
    if (normalizedPortal === 'MEMBER' || normalizedPortal === 'USER') {
      return executeMemberLogin(req, res, next);
    }
    return ApiResponse.error(res, 'Invalid portal specified', 400);
  }

  // If no portal is provided, detect target table by email
  const { email } = req.body || {};
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail) {
    return ApiResponse.error(res, 'Email is required', 400);
  }

  try {
    const saCheck = await db.query('SELECT id FROM super_admins WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);
    if (saCheck.rows.length > 0) {
      return executeSuperAdminLogin(req, res, next);
    }

    const ownerCheck = await db.query('SELECT id FROM gym_owners WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);
    if (ownerCheck.rows.length > 0) {
      return executeGymOwnerLogin(req, res, next);
    }

    const memberCheck = await db.query('SELECT id FROM users WHERE LOWER(email) = $1 AND role = $2 LIMIT 1', [normalizedEmail, ROLES.MEMBER]);
    if (memberCheck.rows.length > 0) {
      return executeMemberLogin(req, res, next);
    }

    return ApiResponse.error(res, 'Invalid email or password', 401);
  } catch (_e) {
    console.error('[User Login DB Check Error]:', _e.message);
    return ApiResponse.error(res, 'Database error during authentication', 500);
  }
};

/**
 * POST /api/auth/login
 * Universal login endpoint.
 */
router.post('/login', (req, res, next) => executeUserLogin(req, res, next));

/**
 * POST /api/auth/member/login
 * Dedicated Member login endpoint.
 */
router.post('/member/login', (req, res, next) => executeMemberLogin(req, res, next));

/**
 * POST /api/auth/superadmin/login
 * Dedicated Super Admin authentication endpoint.
 * Strictly queries super_admins table.
 */
router.post('/superadmin/login', (req, res, next) => executeSuperAdminLogin(req, res, next));

/**
 * POST /api/auth/admin/login
 * Dedicated Gym Admin / Gym Owner authentication endpoint.
 * Strictly queries gym_owners table.
 */
router.post('/admin/login', (req, res, next) => executeGymOwnerLogin(req, res, next));

/**
 * POST /api/auth/gym/login
 * Dedicated dynamic gym portal login endpoint.
 * Validates email, password, and gymSlug; enforces tenant authorization.
 */
router.post('/gym/login', (req, res, next) => executeGymOwnerLogin(req, res, next));

/**
 * POST /api/auth/setup-password
 * Allows Gym Owners to set their permanent password after temporary login.
 */
router.post('/setup-password', authenticate, async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 8) {
      return ApiResponse.error(res, 'New password must be at least 8 characters long', 400);
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole === ROLES.GYM_OWNER) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.query(`
        UPDATE gym_owners 
        SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [passwordHash, userId]);

      return ApiResponse.success(res, { success: true }, 'Password has been set successfully. You can now use your new password.');
    } else if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PLATFORM_ADMIN) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.query(`
        UPDATE super_admins 
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [passwordHash, userId]);

      return ApiResponse.success(res, { success: true }, 'Password has been updated successfully.');
    }

    return ApiResponse.error(res, 'Unauthorized to update password', 403);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Step A: Request password reset link for Super Admin.
 * Queries super_admins table.
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
      // Query strictly against super_admins table
      const saRes = await db.query(
        'SELECT id, email, full_name, role, status FROM super_admins WHERE LOWER(email) = $1 LIMIT 1',
        [normalizedEmail]
      );

      if (saRes.rows.length > 0) {
        const superAdmin = saRes.rows[0];

        if (superAdmin.status === 'active') {
          // 1. Generate cryptographically secure 256-bit random token
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          // 2. Set expiry to 15 minutes
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

          // 3. Invalidate any existing unused tokens for this super admin
          await db.query(
            'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
            [superAdmin.id]
          );

          // 4. Store only token hash in database
          await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [superAdmin.id, tokenHash, expiresAt]
          );

          // 5. Construct secure reset link using configured FRONTEND_URL
          const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
          const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
          const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

          // 6. Send transactional email via Brevo
          await sendPasswordResetEmail({
            to: superAdmin.email,
            resetUrl,
            recipientName: superAdmin.full_name || 'Super Admin'
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
 * POST /api/auth/gym/forgot-password
 * Step A: Request password reset link for Gym Owner ONLY.
 * Queries gym_owners joined with gyms table.
 * Generates single-use cryptographic token, stores hash with 15-minute expiry in password_reset_tokens,
 * and sends branded Brevo email featuring the specific gym name.
 * Always returns generic success response to avoid user enumeration.
 */
router.post('/gym/forgot-password', async (req, res, next) => {
  try {
    const { email, gymSlug } = req.body || {};

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email address is required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return ApiResponse.error(res, 'Please provide a valid email address', 400);
    }

    // Rate limiting check by IP and email
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (isRateLimited(`gym-forgot:${clientIp}`) || isRateLimited(`gym-forgot:${normalizedEmail}`)) {
      return ApiResponse.error(res, 'Too many password reset attempts. Please wait 15 minutes before trying again.', 429);
    }

    const genericSuccessMessage = 'If an account exists with that email address, password reset instructions have been sent.';

    try {
      const normalizedSlug = (gymSlug || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      let ownerRes = null;
      if (normalizedSlug) {
        ownerRes = await db.query(`
          SELECT 
            go.id, go.email, go.full_name, go.status,
            g.id AS gym_id, g.name AS gym_name, g.slug AS gym_slug
          FROM gym_owners go
          JOIN gyms g ON g.id = go.gym_id
          WHERE LOWER(go.email) = $1 
            AND go.status = 'active'
            AND (
              g.slug = $2 
              OR LOWER(REPLACE(g.name, ' ', '-')) = $2
              OR LOWER(g.name) = LOWER($3)
            )
          LIMIT 1;
        `, [normalizedEmail, normalizedSlug, (gymSlug || '').trim()]);
      }

      // If not found with gymSlug or if no gymSlug was provided, query by active owner email
      if (!ownerRes || ownerRes.rows.length === 0) {
        ownerRes = await db.query(`
          SELECT 
            go.id, go.email, go.full_name, go.status,
            g.id AS gym_id, g.name AS gym_name, g.slug AS gym_slug
          FROM gym_owners go
          JOIN gyms g ON g.id = go.gym_id
          WHERE LOWER(go.email) = $1 AND go.status = 'active'
          LIMIT 1;
        `, [normalizedEmail]);
      }

      if (ownerRes.rows.length > 0) {
        const owner = ownerRes.rows[0];

        // 1. Generate cryptographically secure 256-bit random token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        // 2. Set expiry to 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // 3. Invalidate any existing unused tokens for this gym owner
        await db.query(
          'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
          [owner.id]
        );

        // 4. Store only token hash in database
        await db.query(
          'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
          [owner.id, tokenHash, expiresAt]
        );

        // 5. Construct secure gym-specific reset link using configured FRONTEND_URL
        const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
        const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
        const targetSlug = owner.gym_slug || normalizedSlug || '5050-fitness-club';
        const resetUrl = `${frontendUrl}/gym/${targetSlug}/reset-password?token=${rawToken}`;

        // 6. Send transactional email via Brevo
        await sendGymOwnerPasswordResetEmail({
          to: owner.email,
          resetUrl,
          gymName: owner.gym_name || 'FiftyFifty Gym',
          recipientName: owner.full_name || 'Gym Owner',
          expiryMinutes: 15
        });
      }
    } catch (err) {
      console.error('[Gym Forgot Password Error]:', err.message);
      // Still return generic success to avoid leaking internal status
    }

    return ApiResponse.success(res, { message: genericSuccessMessage }, genericSuccessMessage);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/member/portal-details/:gymSlug/:memberSlug
 * Fetches branded gym and member profile details for dynamic member login & setup screens.
 */
router.get('/member/portal-details/:gymSlug/:memberSlug', async (req, res, next) => {
  try {
    const { gymSlug, memberSlug } = req.params;
    if (!gymSlug || !memberSlug) {
      return ApiResponse.error(res, 'Gym slug and member slug are required', 400);
    }

    const cleanGymSlug = gymSlug.toLowerCase().trim();
    const hyphenatedGymSlug = cleanGymSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const gymResult = await db.query(`
      SELECT id, name, slug, logo_url, status
      FROM gyms
      WHERE LOWER(slug) = $1 OR LOWER(slug) = $2 OR id = $1
      LIMIT 1;
    `, [cleanGymSlug, hyphenatedGymSlug]);

    if (gymResult.rows.length === 0) {
      return ApiResponse.error(res, `Gym "${gymSlug}" was not found`, 404);
    }
    const gym = gymResult.rows[0];

    const cleanMemberSlug = memberSlug.toLowerCase().trim();
    const hyphenatedMemberSlug = cleanMemberSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const memberResult = await db.query(`
      SELECT 
        m.id, m.full_name, m.email, m.phone, m.slug, m.status,
        m.current_plan_name, m.invitation_status,
        TO_CHAR(m.join_date, 'YYYY-MM-DD') AS join_date,
        TO_CHAR(m.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        m.password_hash
      FROM members m
      WHERE m.gym_id = $1 AND (LOWER(m.slug) = $2 OR LOWER(m.slug) = $3 OR m.id = $2)
      LIMIT 1;
    `, [gym.id, cleanMemberSlug, hyphenatedMemberSlug]);

    if (memberResult.rows.length === 0) {
      return ApiResponse.error(res, `Member "${memberSlug}" was not found for this gym`, 404);
    }
    const member = memberResult.rows[0];

    return ApiResponse.success(res, {
      gym: {
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        logoUrl: gym.logo_url,
        status: gym.status
      },
      member: {
        id: member.id,
        fullName: member.full_name,
        name: member.full_name,
        slug: member.slug,
        email: member.email,
        plan: member.current_plan_name,
        joinDate: member.join_date,
        expiryDate: member.expiry_date,
        status: member.status,
        invitationStatus: member.invitation_status,
        hasSetPassword: !!(member.password_hash && !member.password_hash.startsWith('MUST_CHANGE_'))
      }
    }, 'Member portal details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/member/setup-password
 * Handles account activation and permanent password configuration from Brevo invitation link.
 */
router.post('/member/setup-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !token.trim()) {
      return ApiResponse.error(res, 'Activation token is required', 400);
    }
    if (!newPassword || newPassword.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters long', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const tokenResult = await db.query(`
      SELECT 
        t.id AS token_id, t.user_id, t.expires_at, t.used_at,
        m.id AS member_id, m.email, m.full_name, m.slug AS member_slug, m.gym_id,
        g.slug AS gym_slug, g.name AS gym_name
      FROM password_reset_tokens t
      INNER JOIN members m ON m.id = t.user_id
      INNER JOIN gyms g ON g.id = m.gym_id
      WHERE t.token_hash = $1
      ORDER BY t.created_at DESC
      LIMIT 1;
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid or unrecognized activation link. Please contact your gym administrator.', 400);
    }

    const tokenRow = tokenResult.rows[0];

    if (tokenRow.used_at) {
      return ApiResponse.error(res, 'This activation link has already been used. Please log in with your password.', 400);
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return ApiResponse.error(res, 'This activation link has expired. Please request a new invitation from your gym.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.query(`
      UPDATE members
      SET 
        password_hash = $1,
        must_change_password = false,
        invitation_status = 'accepted',
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [passwordHash, tokenRow.member_id]);

    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRow.token_id]
    );

    return ApiResponse.success(res, {
      success: true,
      gymSlug: tokenRow.gym_slug,
      memberSlug: tokenRow.member_slug
    }, 'Your password has been successfully configured. You can now sign in.');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/member/forgot-password
 * Password reset request for Member.
 */
router.post('/member/forgot-password', async (req, res, next) => {
  try {
    const { email, gymSlug } = req.body || {};

    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email address is required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return ApiResponse.error(res, 'Please provide a valid email address', 400);
    }

    const genericSuccessMessage = 'If an active member account with that email exists in this gym, a password reset link has been sent.';

    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const rateLimitKey = `member_reset_${clientIp}_${normalizedEmail}`;
    if (isRateLimited(rateLimitKey, 5, 15 * 60 * 1000)) {
      return ApiResponse.error(res, 'Too many password reset requests. Please wait 15 minutes before trying again.', 429);
    }

    try {
      const cleanGymSlug = (gymSlug || '').toLowerCase().trim();
      const hyphenatedGymSlug = cleanGymSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      const memberQuery = await db.query(`
        SELECT 
          m.id, m.email, m.full_name, m.slug AS member_slug, m.status,
          g.id AS gym_id, g.name AS gym_name, g.slug AS gym_slug
        FROM members m
        INNER JOIN gyms g ON g.id = m.gym_id
        WHERE LOWER(m.email) = $1 AND (LOWER(g.slug) = $2 OR LOWER(g.slug) = $3 OR g.id = $2)
        LIMIT 1;
      `, [normalizedEmail, cleanGymSlug, hyphenatedGymSlug]);

      if (memberQuery.rows.length > 0) {
        const member = memberQuery.rows[0];

        if (member.status === 'active') {
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

          await db.query(
            'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
            [member.id]
          );

          await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [member.id, tokenHash, expiresAt]
          );

          const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
          const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
          const resetUrl = `${frontendUrl}/gym/${member.gym_slug}/${member.member_slug}/reset-password?token=${rawToken}`;

          await sendMemberPasswordResetEmail({
            to: member.email,
            gymName: member.gym_name,
            memberName: member.full_name || 'Member',
            resetUrl,
            expiryMinutes: 15
          });
        }
      }
    } catch (err) {
      console.error('[Member Forgot Password Error]:', err.message);
    }

    return ApiResponse.success(res, { message: genericSuccessMessage }, genericSuccessMessage);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/member/reset-password
 * Handles password reset for gym members.
 */
router.post('/member/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !token.trim()) {
      return ApiResponse.error(res, 'Reset token is required', 400);
    }
    if (!newPassword || newPassword.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters long', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const tokenResult = await db.query(`
      SELECT 
        t.id AS token_id, t.user_id, t.expires_at, t.used_at,
        m.id AS member_id, m.email, m.slug AS member_slug,
        g.slug AS gym_slug
      FROM password_reset_tokens t
      INNER JOIN members m ON m.id = t.user_id
      INNER JOIN gyms g ON g.id = m.gym_id
      WHERE t.token_hash = $1
      ORDER BY t.created_at DESC
      LIMIT 1;
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid or expired password reset link. Please request a new one.', 400);
    }

    const tokenRow = tokenResult.rows[0];

    if (tokenRow.used_at) {
      return ApiResponse.error(res, 'This password reset link has already been used. Please request a new one.', 400);
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return ApiResponse.error(res, 'This password reset link has expired. Please request a new one.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE members SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, tokenRow.member_id]
    );

    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRow.token_id]
    );

    return ApiResponse.success(res, {
      success: true,
      gymSlug: tokenRow.gym_slug,
      memberSlug: tokenRow.member_slug
    }, 'Your password has been reset successfully. Please sign in with your new password.');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/verify-reset-token
 * Validates a reset token without consuming it.
 * Queries password_reset_tokens joined with super_admins, gym_owners, and members.
 */
router.get('/verify-reset-token', async (req, res, next) => {
  try {
    const { token } = req.query || {};

    if (!token || !token.trim()) {
      return ApiResponse.error(res, 'Reset token is required', 400);
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const result = await db.query(`
      SELECT 
        t.id, t.user_id, t.expires_at, t.used_at,
        sa.id AS sa_id, sa.email AS sa_email,
        go.id AS go_id, go.email AS go_email, go.gym_id,
        g.slug AS gym_slug, g.name AS gym_name,
        m.id AS m_id, m.email AS m_email, m.slug AS m_slug,
        gm.slug AS m_gym_slug, gm.name AS m_gym_name
      FROM password_reset_tokens t
      LEFT JOIN super_admins sa ON sa.id = t.user_id
      LEFT JOIN gym_owners go ON go.id = t.user_id
      LEFT JOIN gyms g ON g.id = go.gym_id
      LEFT JOIN members m ON m.id = t.user_id
      LEFT JOIN gyms gm ON gm.id = m.gym_id
      WHERE t.token_hash = $1
      ORDER BY t.created_at DESC
      LIMIT 1;
    `, [tokenHash]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid or unrecognized password setup token.', 400);
    }

    const row = result.rows[0];
    if (row.used_at) {
      return ApiResponse.error(res, 'This password setup link has already been used. Please request a new one.', 400);
    }

    if (new Date(row.expires_at) < new Date()) {
      return ApiResponse.error(res, 'This password setup link has expired. Please request a new one.', 400);
    }

    const userEmail = row.sa_email || row.go_email || row.m_email;
    let userType = 'SUPER_ADMIN';
    if (row.go_id) userType = 'GYM_OWNER';
    if (row.m_id) userType = 'MEMBER';

    return ApiResponse.success(res, {
      valid: true,
      email: userEmail,
      userType,
      gymSlug: row.gym_slug || row.m_gym_slug || '',
      memberSlug: row.m_slug || '',
      gymName: row.gym_name || row.m_gym_name || ''
    }, 'Token is valid');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Step B & C: Validate single-use token, hash new password with bcrypt, update respective user table, and invalidate token.
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

    // 1. Query token joined with super_admins, gym_owners, and members
    const tokenResult = await db.query(`
      SELECT 
        t.id, t.user_id, t.expires_at, t.used_at,
        sa.id AS sa_id, sa.email AS sa_email,
        go.id AS go_id, go.email AS go_email, go.gym_id,
        g.slug AS gym_slug, g.name AS gym_name,
        m.id AS m_id, m.email AS m_email, m.slug AS m_slug,
        gm.slug AS m_gym_slug, gm.name AS m_gym_name
      FROM password_reset_tokens t
      LEFT JOIN super_admins sa ON sa.id = t.user_id
      LEFT JOIN gym_owners go ON go.id = t.user_id
      LEFT JOIN gyms g ON g.id = go.gym_id
      LEFT JOIN members m ON m.id = t.user_id
      LEFT JOIN gyms gm ON gm.id = m.gym_id
      WHERE t.token_hash = $1
      ORDER BY t.created_at DESC
      LIMIT 1;
    `, [tokenHash]);

    if (tokenResult.rows.length === 0) {
      return ApiResponse.error(res, 'Invalid or expired password setup link. Please request a new one.', 400);
    }

    const tokenRow = tokenResult.rows[0];

    // Check single-use
    if (tokenRow.used_at) {
      return ApiResponse.error(res, 'This password setup link has already been used. Please request a new one.', 400);
    }

    // Check expiration
    if (new Date(tokenRow.expires_at) < new Date()) {
      return ApiResponse.error(res, 'This password setup link has expired. Please request a new one.', 400);
    }

    // 2. Hash new password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update appropriate table based on user type
    if (tokenRow.sa_id) {
      await db.query(
        'UPDATE super_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [passwordHash, tokenRow.user_id]
      );
      console.log(`[Auth] Super Admin password reset successfully for user ID ${tokenRow.user_id}`);
    } else if (tokenRow.go_id) {
      await db.query(
        'UPDATE gym_owners SET password_hash = $1, must_change_password = false, invitation_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [passwordHash, 'accepted', tokenRow.user_id]
      );
      if (tokenRow.gym_id) {
        await db.query(
          'UPDATE gyms SET invitation_status = $1 WHERE id = $2',
          ['accepted', tokenRow.gym_id]
        );
      }
      console.log(`[Auth] Gym Owner password setup successfully for user ID ${tokenRow.user_id}`);
    } else if (tokenRow.m_id) {
      await db.query(
        'UPDATE members SET password_hash = $1, must_change_password = false, invitation_status = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [passwordHash, 'accepted', 'active', tokenRow.user_id]
      );
      console.log(`[Auth] Member password setup/reset successfully for user ID ${tokenRow.user_id}`);
    }

    // 4. Invalidate the reset token immediately (single-use enforcement)
    await db.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRow.id]
    );

    return ApiResponse.success(
      res,
      {
        success: true,
        userType: tokenRow.sa_id ? 'SUPER_ADMIN' : (tokenRow.go_id ? 'GYM_OWNER' : 'MEMBER'),
        gymSlug: tokenRow.gym_slug || tokenRow.m_gym_slug || '',
        memberSlug: tokenRow.m_slug || ''
      },
      'Your password has been set successfully. Please sign in with your new password.'
    );
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  return ApiResponse.success(res, { user: req.user }, 'User profile retrieved');
});

export default router;
