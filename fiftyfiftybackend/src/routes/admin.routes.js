import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db, { checkDatabaseHealth } from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { ROLES } from '../constants/roles.constant.js';
import { sendGymOwnerInvitationEmail } from '../services/email.service.js';
import { handleLogoUpload } from '../middlewares/upload.middleware.js';
import { uploadGymLogoFromBuffer } from '../services/cloudinary.service.js';

const router = Router();

// Protect all admin endpoints with authentication and Super Admin authorization
router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN));

/**
 * GET /api/admin/dashboard
 * Clean platform administration status overview.
 * Does NOT return gym-specific business or operational statistics.
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    const overview = {
      system: 'FiftyFifty Gym Management Software',
      role: req.user?.role || 'SUPER_ADMIN',
      email: req.user?.email || 'leopardxtechnology@gmail.com',
      status: 'operational',
      database: {
        connected: Boolean(dbHealth?.connected),
        status: dbHealth?.status || 'connected'
      },
      quickActions: [
        {
          label: 'Gym Management',
          path: '/admin/gyms',
          description: 'Manage gym profile, branding, location, and operational hours.'
        }
      ],
      timestamp: new Date().toISOString()
    };

    return ApiResponse.success(res, overview, 'Super Admin platform status retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/gym
 * Returns the gym's full profile and settings.
 * All gym-specific information is maintained exclusively inside Gym Management.
 */
router.get('/gym', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        id, name, owner_name, email, phone, status,
        logo_url, address, city, state, postal_code,
        opening_hours, description, business_contact,
        created_at, updated_at
      FROM gyms
      ORDER BY created_at ASC
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      return ApiResponse.success(res, null, 'No gym records exist yet');
    }

    return ApiResponse.success(res, result.rows[0], 'Gym profile retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/gym
 * Updates the gym's profile and settings in Supabase PostgreSQL.
 */
router.put('/gym', async (req, res, next) => {
  try {
    const {
      name,
      owner_name,
      email,
      phone,
      logo_url,
      address,
      city,
      state,
      postal_code,
      opening_hours,
      description,
      business_contact,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Gym name is required', 400);
    }
    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Contact email is required', 400);
    }
    if (!phone || !phone.trim()) {
      return ApiResponse.error(res, 'Contact phone is required', 400);
    }

    // Get gym ID or return 404 if no gyms exist
    const checkGym = await db.query('SELECT id FROM gyms LIMIT 1;');
    if (checkGym.rows.length === 0) {
      return ApiResponse.error(res, 'No gym available to update. Please create a gym first.', 404);
    }
    const gymId = checkGym.rows[0].id;

    const updateSql = `
      UPDATE gyms
      SET 
        name = $1,
        owner_name = $2,
        email = $3,
        phone = $4,
        logo_url = $5,
        address = $6,
        city = $7,
        state = $8,
        postal_code = $9,
        opening_hours = $10,
        description = $11,
        business_contact = $12,
        status = COALESCE($13, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *;
    `;

    const values = [
      name.trim(),
      owner_name ? owner_name.trim() : null,
      email.trim().toLowerCase(),
      phone.trim(),
      logo_url ? logo_url.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      postal_code ? postal_code.trim() : null,
      opening_hours ? opening_hours.trim() : null,
      description ? description.trim() : null,
      business_contact ? business_contact.trim() : null,
      status || 'active',
      gymId
    ];

    const result = await db.query(updateSql, values);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gym could not be updated', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Gym settings updated successfully in Supabase');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/gyms
 * Returns all gyms in the system with owner details and invitation status.
 */
router.get('/gyms', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        g.id, g.name, g.owner_name, g.owner_name AS owner, g.email, g.phone, g.status,
        g.logo_url, g.address, g.city, g.state, g.postal_code, g.opening_hours, g.description,
        g.business_contact, g.invitation_status, g.invitation_sent_at, g.created_at, g.updated_at,
        u.id AS owner_user_id,
        u.email AS owner_email,
        u.full_name AS owner_full_name,
        u.status AS owner_status,
        u.must_change_password,
        u.last_login_at
      FROM gyms g
      LEFT JOIN users u ON u.gym_id = g.id AND u.role = 'GYM_OWNER'
      ORDER BY g.created_at DESC;
    `);

    // Normalize invitation status for clean presentation
    const gyms = result.rows.map((gym) => {
      let displayInvitationStatus = gym.invitation_status || 'pending';
      if (gym.last_login_at || gym.must_change_password === false) {
        displayInvitationStatus = 'active';
      } else if (displayInvitationStatus === 'invitation_sent' && gym.must_change_password) {
        displayInvitationStatus = 'password_setup_pending';
      }

      return {
        ...gym,
        displayInvitationStatus
      };
    });

    return ApiResponse.success(res, gyms, 'Gyms retrieved from database');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/gyms/:id
 * Returns a specific gym's full profile and owner details.
 */
router.get('/gyms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        g.id, g.name, g.owner_name, g.owner_name AS owner, g.email, g.phone, g.status,
        g.logo_url, g.address, g.city, g.state, g.postal_code, g.opening_hours, g.description,
        g.business_contact, g.invitation_status, g.invitation_sent_at, g.created_at, g.updated_at,
        u.id AS owner_user_id,
        u.email AS owner_email,
        u.full_name AS owner_full_name,
        u.status AS owner_status,
        u.must_change_password,
        u.last_login_at
      FROM gyms g
      LEFT JOIN users u ON u.gym_id = g.id AND u.role = 'GYM_OWNER'
      WHERE g.id = $1
      LIMIT 1;
    `, [id]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gym record not found', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Gym profile retrieved');
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/gyms/upload-logo & POST /api/admin/upload-logo
 * Validates image type and 5MB limit, then uploads directly to Cloudinary.
 * Returns the Cloudinary secure URL for storing in gyms.logo_url.
 */
const handleLogoUploadAction = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return ApiResponse.error(res, 'No image file provided. Please attach a logo image (PNG, JPG, or WebP).', 400);
    }

    const uploadResult = await uploadGymLogoFromBuffer(req.file.buffer, {
      folder: 'fiftyfiftygym/logos',
      originalname: req.file.originalname
    });

    return ApiResponse.success(
      res,
      {
        url: uploadResult.secure_url,
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes
      },
      'Gym logo uploaded successfully to Cloudinary'
    );
  } catch (error) {
    if (error.message?.includes('Cloudinary credentials are not configured')) {
      return ApiResponse.error(res, error.message, 503);
    }
    next(error);
  }
};

router.post('/gyms/upload-logo', handleLogoUpload, handleLogoUploadAction);
router.post('/upload-logo', handleLogoUpload, handleLogoUploadAction);

/**
 * POST /api/admin/gyms
 * Creates a new gym record, provisions a linked Gym Owner account in an atomic transaction,
 * and sends a Brevo invitation email with secure temporary credentials.
 */
router.post('/gyms', async (req, res, next) => {
  const client = await db.getClient();
  try {
    const {
      name,
      owner_name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      logo_url,
      opening_hours,
      description
    } = req.body || {};

    // 1. Validation & normalization
    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Gym name is required', 400);
    }
    if (!owner_name || !owner_name.trim()) {
      return ApiResponse.error(res, 'Owner full name is required', 400);
    }
    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Owner email address is required', 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return ApiResponse.error(res, 'Please provide a valid owner email address', 400);
    }
    if (!phone || !phone.trim()) {
      return ApiResponse.error(res, 'Owner phone number is required', 400);
    }

    // 2. Enforce unique owner email across accounts
    const existingUser = await db.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );
    if (existingUser.rows.length > 0) {
      return ApiResponse.error(
        res,
        `An account with email "${normalizedEmail}" already exists. Each gym owner must have a unique email.`,
        409
      );
    }

    // 3. Generate IDs and secure temporary password
    const gymId = `gym_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const ownerUserId = `usr_owner_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const temporaryPassword = `Gym#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const gymNameClean = name.trim();
    const ownerNameClean = owner_name.trim();
    const phoneClean = phone.trim();
    const hoursClean = opening_hours && opening_hours.trim() ? opening_hours.trim() : '06:00 AM - 10:00 PM';

    // 4. Atomic Database Transaction: Insert Gym + Owner User
    await client.query('BEGIN');

    const gymInsertSql = `
      INSERT INTO gyms (
        id, name, owner_name, email, phone,
        address, city, state, postal_code, logo_url,
        opening_hours, description, business_contact, status,
        invitation_status, invitation_sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', 'pending', CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const gymResult = await client.query(gymInsertSql, [
      gymId,
      gymNameClean,
      ownerNameClean,
      normalizedEmail,
      phoneClean,
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      postal_code ? postal_code.trim() : null,
      logo_url ? logo_url.trim() : null,
      hoursClean,
      description ? description.trim() : null,
      phoneClean
    ]);

    const userInsertSql = `
      INSERT INTO users (
        id, email, password_hash, full_name, role, gym_id, status,
        must_change_password, invitation_status, invitation_sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', true, 'pending', CURRENT_TIMESTAMP)
      RETURNING id, email, full_name, role, gym_id, status, must_change_password, created_at;
    `;
    const userResult = await client.query(userInsertSql, [
      ownerUserId,
      normalizedEmail,
      passwordHash,
      ownerNameClean,
      ROLES.GYM_OWNER,
      gymId
    ]);

    await client.query('COMMIT');

    // 5. Brevo Owner Invitation Email (Sent after transaction commits)
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const loginUrl = `${frontendUrl}/admin/login`;

    let emailDelivered = false;
    let emailErrorMessage = null;

    try {
      const emailResult = await sendGymOwnerInvitationEmail({
        to: normalizedEmail,
        gymName: gymNameClean,
        ownerName: ownerNameClean,
        loginUrl,
        ownerEmail: normalizedEmail,
        temporaryPassword
      });

      if (emailResult && emailResult.success) {
        emailDelivered = true;
      } else {
        emailErrorMessage = emailResult?.error || emailResult?.message || 'Email dispatch failed';
      }
    } catch (mailErr) {
      emailErrorMessage = mailErr.message;
      console.error('[Create Gym Email Error]:', mailErr.message);
    }

    const invitationStatus = emailDelivered ? 'invitation_sent' : 'invitation_failed';

    // Update invitation status record
    await db.query(
      'UPDATE gyms SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      [invitationStatus, gymId]
    );
    await db.query(
      'UPDATE users SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      [invitationStatus, ownerUserId]
    );

    const responsePayload = {
      gym: {
        ...gymResult.rows[0],
        invitation_status: invitationStatus,
        owner_email: normalizedEmail,
        owner_full_name: ownerNameClean
      },
      owner: {
        id: ownerUserId,
        email: normalizedEmail,
        fullName: ownerNameClean,
        role: ROLES.GYM_OWNER,
        gymId
      },
      invitationStatus,
      emailDelivered
    };

    const responseMessage = emailDelivered
      ? `Gym "${gymNameClean}" created successfully and invitation email sent via Brevo to ${normalizedEmail}.`
      : `Gym "${gymNameClean}" created successfully, but the Brevo invitation email could not be delivered (${emailErrorMessage || 'check Brevo API key'}). You can resend the invitation from Gym Management.`;

    return ApiResponse.created(res, responsePayload, responseMessage);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_rbErr) {
      // rollback error ignored
    }
    next(error);
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/gyms/:id/resend-invitation
 * Regenerates a temporary password and resends the invitation email to the gym owner.
 * Never creates duplicate gym or user accounts.
 */
router.post('/gyms/:id/resend-invitation', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch gym details
    const gymResult = await db.query(
      'SELECT id, name, owner_name, email, phone FROM gyms WHERE id = $1 LIMIT 1',
      [id]
    );
    if (gymResult.rows.length === 0) {
      return ApiResponse.error(res, 'Gym not found', 404);
    }
    const gym = gymResult.rows[0];

    // 2. Fetch linked Gym Owner user
    const ownerResult = await db.query(
      'SELECT id, email, full_name, role, status FROM users WHERE gym_id = $1 AND role = $2 LIMIT 1',
      [id, ROLES.GYM_OWNER]
    );
    if (ownerResult.rows.length === 0) {
      return ApiResponse.error(res, 'No linked Gym Owner account found for this gym', 404);
    }
    const owner = ownerResult.rows[0];

    // 3. Generate new temporary password and update existing owner account
    const newTemporaryPassword = `Gym#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
    const newPasswordHash = await bcrypt.hash(newTemporaryPassword, 10);

    await db.query(`
      UPDATE users 
      SET password_hash = $1, must_change_password = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newPasswordHash, owner.id]);

    // 4. Send Brevo invitation email
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const loginUrl = `${frontendUrl}/admin/login`;

    let emailDelivered = false;
    let emailErrorMessage = null;

    try {
      const emailResult = await sendGymOwnerInvitationEmail({
        to: owner.email,
        gymName: gym.name,
        ownerName: owner.full_name || gym.owner_name || 'Gym Owner',
        loginUrl,
        ownerEmail: owner.email,
        temporaryPassword: newTemporaryPassword
      });

      if (emailResult && emailResult.success) {
        emailDelivered = true;
      } else {
        emailErrorMessage = emailResult?.error || emailResult?.message || 'Email dispatch failed';
      }
    } catch (mailErr) {
      emailErrorMessage = mailErr.message;
      console.error('[Resend Invitation Error]:', mailErr.message);
    }

    const invitationStatus = emailDelivered ? 'invitation_sent' : 'invitation_failed';

    await db.query(
      'UPDATE gyms SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      [invitationStatus, id]
    );
    await db.query(
      'UPDATE users SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
      [invitationStatus, owner.id]
    );

    const message = emailDelivered
      ? `Invitation email successfully resent to ${owner.email}.`
      : `Failed to deliver invitation email to ${owner.email} (${emailErrorMessage || 'check Brevo settings'}).`;

    return ApiResponse.success(
      res,
      {
        gymId: id,
        ownerEmail: owner.email,
        invitationStatus,
        emailDelivered
      },
      message
    );
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/gyms/:id
 * Updates a specific gym's profile and settings by ID.
 */
router.put('/gyms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      owner_name,
      email,
      phone,
      logo_url,
      address,
      city,
      state,
      postal_code,
      opening_hours,
      description,
      business_contact,
      status
    } = req.body || {};

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Gym name is required', 400);
    }

    const updateSql = `
      UPDATE gyms
      SET 
        name = $1,
        owner_name = COALESCE($2, owner_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        logo_url = $5,
        address = $6,
        city = $7,
        state = $8,
        postal_code = $9,
        opening_hours = COALESCE($10, opening_hours),
        description = $11,
        business_contact = COALESCE($12, business_contact),
        status = COALESCE($13, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *;
    `;

    const values = [
      name.trim(),
      owner_name ? owner_name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      logo_url ? logo_url.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      postal_code ? postal_code.trim() : null,
      opening_hours ? opening_hours.trim() : null,
      description ? description.trim() : null,
      business_contact ? business_contact.trim() : null,
      status || null,
      id
    ];

    const result = await db.query(updateSql, values);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gym could not be found or updated', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Gym settings updated successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
