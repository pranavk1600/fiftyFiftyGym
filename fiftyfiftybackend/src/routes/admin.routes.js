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
import { addInMemoryGym, getInMemoryGyms, findInMemoryGym, updateInMemoryGym, deleteInMemoryGym, registerInMemoryToken } from '../services/devGymStore.js';

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
      email: req.user?.email || 'admin@fiftyfifty.com',
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
 * Returns the primary gym's full profile and settings.
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
    const checkGym = await db.query('SELECT id, logo_url FROM gyms LIMIT 1;');
    if (checkGym.rows.length === 0) {
      return ApiResponse.error(res, 'No gym available to update. Please create a gym first.', 404);
    }
    const gymId = checkGym.rows[0].id;
    const currentLogo = checkGym.rows[0].logo_url;
    const finalLogoUrl = logo_url !== undefined ? (logo_url ? logo_url.trim() : null) : currentLogo;

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
      finalLogoUrl,
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
 * Returns all gyms in the system with owner metadata and invitation status from gym_owners table.
 */
router.get('/gyms', async (req, res, next) => {
  try {
    try {
      const result = await db.query(`
        SELECT 
          g.id, g.slug, g.name, g.owner_name, g.owner_name AS owner, g.email, g.phone, g.status,
          g.logo_url, g.address, g.city, g.state, g.postal_code, g.opening_hours, g.description,
          g.business_contact, g.invitation_status, g.invitation_sent_at, g.created_at, g.updated_at,
          o.id AS owner_user_id,
          o.email AS owner_email,
          o.full_name AS owner_full_name,
          o.status AS owner_status,
          o.must_change_password,
          o.last_login_at
        FROM gyms g
        LEFT JOIN gym_owners o ON o.gym_id = g.id
        ORDER BY g.created_at DESC;
      `);

      // Normalize invitation status for clean presentation
      const gyms = result.rows.map((gym) => {
        let displayInvitationStatus = gym.invitation_status || 'pending';
        if (gym.invitation_status === 'accepted' || (!gym.must_change_password && gym.last_login_at)) {
          displayInvitationStatus = 'accepted';
        } else if (gym.invitation_status === 'delivered') {
          displayInvitationStatus = 'delivered';
        } else if (gym.invitation_status === 'sent' || gym.invitation_status === 'invitation_sent') {
          displayInvitationStatus = 'sent';
        } else if (gym.invitation_status === 'expired') {
          displayInvitationStatus = 'expired';
        } else if (gym.invitation_status === 'failed' || gym.invitation_status === 'invitation_failed') {
          displayInvitationStatus = 'failed';
        } else {
          displayInvitationStatus = 'pending';
        }

        return {
          ...gym,
          slug: gym.slug || (gym.name ? gym.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : gym.id),
          invitation_status: displayInvitationStatus,
          displayInvitationStatus
        };
      });

      return ApiResponse.success(res, gyms, 'Gyms retrieved from database');
    } catch (dbErr) {
      console.warn('[Admin API] Database error fetching gyms:', dbErr.message);
      // In development mode or when DB is offline, return dev store gyms
      if (process.env.NODE_ENV !== 'production') {
        return ApiResponse.success(res, getInMemoryGyms(), 'Gyms retrieved (Dev Mode fallback)');
      }
      return ApiResponse.error(res, dbErr.message, 503);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/gyms/:id
 * Returns a specific gym's full profile and owner details from gym_owners.
 */
router.get('/gyms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      const result = await db.query(`
        SELECT 
          g.id, g.slug, g.name, g.owner_name, g.owner_name AS owner, g.email, g.phone, g.status,
          g.logo_url, g.address, g.city, g.state, g.postal_code, g.opening_hours, g.description,
          g.business_contact, g.invitation_status, g.invitation_sent_at, g.created_at, g.updated_at,
          o.id AS owner_user_id,
          o.email AS owner_email,
          o.full_name AS owner_full_name,
          o.status AS owner_status,
          o.must_change_password,
          o.last_login_at
        FROM gyms g
        LEFT JOIN gym_owners o ON o.gym_id = g.id
        WHERE g.id = $1
        LIMIT 1;
      `, [id]);

      if (result.rows.length === 0) {
        const devGym = findInMemoryGym(id);
        if (devGym) {
          return ApiResponse.success(res, devGym, 'Gym profile retrieved (dev store)');
        }
        return ApiResponse.error(res, 'Gym record not found', 404);
      }

      return ApiResponse.success(res, result.rows[0], 'Gym profile retrieved');
    } catch (dbErr) {
      const devGym = findInMemoryGym(id);
      if (devGym) {
        return ApiResponse.success(res, devGym, 'Gym profile retrieved (fallback)');
      }
      return ApiResponse.error(res, dbErr.message, 503);
    }
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

    try {
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
    } catch (cloudErr) {
      // In local dev mode, if Cloudinary network or credentials fail, return data URI fallback so user is never blocked
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
        console.warn('[Admin Logo Upload] Cloudinary fallback activated:', cloudErr.message);
        const mimeType = req.file.mimetype || 'image/png';
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${mimeType};base64,${base64Data}`;
        return ApiResponse.success(
          res,
          {
            url: dataUri,
            secure_url: dataUri,
            public_id: `dev_logo_${Date.now()}`,
            format: mimeType.split('/')[1] || 'png',
            bytes: req.file.buffer.length
          },
          'Gym logo processed successfully (Dev fallback)'
        );
      }
      throw cloudErr;
    }
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
  let client = null;
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
      description,
      slug
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

    // 2. Enforce unique owner email across gym_owners and super_admins
    let dbAvailable = true;
    try {
      const existingOwner = await db.query(
        'SELECT id, email FROM gym_owners WHERE LOWER(email) = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (existingOwner.rows.length > 0) {
        return ApiResponse.error(
          res,
          `An account with email "${normalizedEmail}" already exists. Each gym owner must have a unique email.`,
          409
        );
      }

      const existingSuperAdmin = await db.query(
        'SELECT id, email FROM super_admins WHERE LOWER(email) = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (existingSuperAdmin.rows.length > 0) {
        return ApiResponse.error(
          res,
          `An account with email "${normalizedEmail}" already exists. Super Admin emails cannot be reused as Gym Owners.`,
          409
        );
      }
    } catch (checkErr) {
      console.warn('[Admin API] Database unique email check failed, falling back to dev store check:', checkErr.message);
      dbAvailable = false;
    }

    // Dev store duplicate check
    const memGyms = getInMemoryGyms();
    if (memGyms.some((g) => (g.owner_email || g.email || '').toLowerCase() === normalizedEmail)) {
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

    // Generate unique slug
    let baseSlug = (slug && slug.trim())
      ? slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : gymNameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'gym';

    let uniqueSlug = baseSlug;

    if (dbAvailable) {
      try {
        let slugIndex = 1;
        while (true) {
          const checkRes = await db.query('SELECT id FROM gyms WHERE LOWER(slug) = $1 LIMIT 1', [uniqueSlug]);
          if (checkRes.rows.length === 0) break;
          slugIndex++;
          uniqueSlug = `${baseSlug}-${slugIndex}`;
        }
      } catch (_e) {
        dbAvailable = false;
      }
    }

    let memSlugIndex = 1;
    while (getInMemoryGyms().some((g) => g.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${memSlugIndex++}`;
    }

    // 4. Atomic Database Transaction: Insert Gym + Gym Owner Account
    let gymRecord = null;
    let ownerRecord = null;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    if (dbAvailable) {
      try {
        client = await db.getClient();
        await client.query('BEGIN');

        const gymInsertSql = `
          INSERT INTO gyms (
            id, name, owner_name, email, phone,
            address, city, state, postal_code, logo_url,
            opening_hours, description, business_contact, status,
            invitation_status, invitation_sent_at, slug
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', 'pending', CURRENT_TIMESTAMP, $14)
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
          phoneClean,
          uniqueSlug
        ]);
        gymRecord = gymResult.rows[0];

        const ownerInsertSql = `
          INSERT INTO gym_owners (
            id, email, password_hash, full_name, phone, role, gym_id, status,
            must_change_password, invitation_status, invitation_sent_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', true, 'pending', CURRENT_TIMESTAMP)
          RETURNING id, email, full_name, phone, role, gym_id, status, must_change_password, created_at;
        `;
        const ownerResult = await client.query(ownerInsertSql, [
          ownerUserId,
          normalizedEmail,
          passwordHash,
          ownerNameClean,
          phoneClean,
          ROLES.GYM_OWNER,
          gymId
        ]);
        ownerRecord = ownerResult.rows[0];

        await client.query(
          'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
          [ownerUserId, tokenHash, expiresAt]
        );

        await client.query('COMMIT');
      } catch (txErr) {
        if (client) {
          try {
            await client.query('ROLLBACK');
          } catch (_rbErr) {}
        }
        console.warn('[Admin API] Database transaction failed, proceeding with dev store:', txErr.message);
        dbAvailable = false;
      } finally {
        if (client) {
          try {
            client.release();
          } catch (_) {}
          client = null;
        }
      }
    }

    if (!gymRecord) {
      gymRecord = {
        id: gymId,
        name: gymNameClean,
        slug: uniqueSlug,
        owner_name: ownerNameClean,
        owner: ownerNameClean,
        email: normalizedEmail,
        owner_email: normalizedEmail,
        phone: phoneClean,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        postal_code: postal_code ? postal_code.trim() : null,
        logo_url: logo_url ? logo_url.trim() : null,
        opening_hours: hoursClean,
        description: description ? description.trim() : null,
        business_contact: phoneClean,
        status: 'active',
        owner_status: 'active',
        invitation_status: 'pending',
        displayInvitationStatus: 'pending',
        must_change_password: true,
        created_at: new Date().toISOString()
      };
      ownerRecord = {
        id: ownerUserId,
        email: normalizedEmail,
        full_name: ownerNameClean,
        fullName: ownerNameClean,
        phone: phoneClean,
        role: ROLES.GYM_OWNER,
        gymId,
        status: 'active',
        must_change_password: true,
        created_at: new Date().toISOString()
      };
    }

    // 5. Brevo Owner Invitation Email
    const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
    const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
    const loginUrl = `${frontendUrl}/gym/${uniqueSlug}/login`;
    const activationUrl = `${frontendUrl}/gym/${uniqueSlug}/setup-password?token=${rawToken}`;

    let emailDelivered = false;
    let emailErrorMessage = null;

    try {
      const emailResult = await sendGymOwnerInvitationEmail({
        to: normalizedEmail,
        gymName: gymNameClean,
        ownerName: ownerNameClean,
        loginUrl,
        ownerEmail: normalizedEmail,
        activationUrl,
        expiryHours: 48
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

    const invitationStatus = emailDelivered ? 'sent' : 'pending';
    gymRecord.invitation_status = invitationStatus;
    gymRecord.displayInvitationStatus = invitationStatus;

    if (dbAvailable) {
      try {
        await db.query(
          'UPDATE gyms SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          [invitationStatus, gymId]
        );
        await db.query(
          'UPDATE gym_owners SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          [invitationStatus, ownerUserId]
        );
      } catch (_e) {}
    }

    // Always register in dev devGymStore so subsequent queries immediately see the new gym
    addInMemoryGym(gymRecord, ownerRecord, null, rawToken);

    const responsePayload = {
      gym: {
        ...gymRecord,
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
      emailDelivered,
      loginUrl,
      activationUrl
    };

    const responseMessage = emailDelivered
      ? `Gym "${gymNameClean}" created successfully and invitation email sent via Brevo to ${normalizedEmail}.`
      : `Gym "${gymNameClean}" created successfully, but the Brevo invitation email could not be delivered (${emailErrorMessage || 'check Brevo settings'}). You can resend the invitation from Gym Management.`;

    return ApiResponse.created(res, responsePayload, responseMessage);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_rbErr) {}
    }
    next(error);
  } finally {
    if (client) {
      try {
        client.release();
      } catch (_) {}
    }
  }
});

/**
 * POST /api/admin/gyms/:id/resend-invitation
 * Regenerates a temporary password and resends the invitation email to the gym owner.
 * Never creates duplicate gym or owner accounts.
 */
router.post('/gyms/:id/resend-invitation', async (req, res, next) => {
  try {
    const { id } = req.params;

    let gym = null;
    let owner = null;

    try {
      // 1. Fetch gym details
      const gymResult = await db.query(
        'SELECT id, name, owner_name, email, phone, slug FROM gyms WHERE id = $1 LIMIT 1',
        [id]
      );
      if (gymResult.rows.length > 0) {
        gym = gymResult.rows[0];
      }

      // 2. Fetch linked Gym Owner from gym_owners table
      const ownerResult = await db.query(
        'SELECT id, email, full_name, role, status FROM gym_owners WHERE gym_id = $1 LIMIT 1',
        [id]
      );
      if (ownerResult.rows.length > 0) {
        owner = ownerResult.rows[0];
      }
    } catch (dbErr) {
      console.warn('[Resend Invitation DB Warning]:', dbErr.message);
    }

    // In dev mode fallback to dynamically created in-memory store
    if (!gym) {
      gym = findInMemoryGym(id);
    }
    if (!owner && gym) {
      owner = findInMemoryOwner(gym.id) || findInMemoryOwner(gym.email);
    }

    if (!gym) {
      return ApiResponse.error(res, 'Gym not found', 404);
    }
    if (!owner) {
      return ApiResponse.error(res, 'No linked Gym Owner account found for this gym', 404);
    }

    // 3. Generate new temporary password and update existing owner account
    const newTemporaryPassword = `Gym#${crypto.randomBytes(4).toString('hex')}!${Math.floor(100 + Math.random() * 900)}`;
    const newPasswordHash = await bcrypt.hash(newTemporaryPassword, 10);

    try {
      await db.query(`
        UPDATE gym_owners 
        SET password_hash = $1, must_change_password = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newPasswordHash, owner.id]);
    } catch (dbErr) {
      console.warn('[Resend Invitation DB Update Warning]:', dbErr.message);
    }

    // 4. Generate fresh 48-hour single-use invitation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    try {
      await db.query(
        'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL',
        [owner.id]
      );
      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [owner.id, tokenHash, expiresAt]
      );
    } catch (dbErr) {
      console.warn('[Resend Invitation DB Token Warning]:', dbErr.message);
    }

    const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
    const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
    const gymSlug = gym.slug || gym.id;
    const loginUrl = `${frontendUrl}/gym/${gymSlug}/login`;
    const activationUrl = `${frontendUrl}/gym/${gymSlug}/setup-password?token=${rawToken}`;

    let emailDelivered = false;
    let emailErrorMessage = null;

    try {
      const emailResult = await sendGymOwnerInvitationEmail({
        to: owner.email,
        gymName: gym.name,
        ownerName: owner.full_name || gym.owner_name || 'Gym Owner',
        loginUrl,
        ownerEmail: owner.email,
        activationUrl,
        expiryHours: 48
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

    const invitationStatus = emailDelivered ? 'sent' : 'pending';

    try {
      await db.query(
        'UPDATE gyms SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        [invitationStatus, id]
      );
      await db.query(
        'UPDATE gym_owners SET invitation_status = $1, invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        [invitationStatus, owner.id]
      );
    } catch (_e) {}

    // Also update dev store if applicable
    updateInMemoryGym(id, { invitation_status: invitationStatus, displayInvitationStatus: invitationStatus });
    registerInMemoryToken(rawToken, {
      userId: owner.id,
      email: owner.email,
      gymId: id,
      gymSlug,
      gymName: gym.name
    });

    const message = emailDelivered
      ? `Invitation email successfully resent to ${owner.email}.`
      : `Failed to deliver invitation email to ${owner.email} (${emailErrorMessage || 'check Brevo settings'}).`;

    return ApiResponse.success(
      res,
      {
        gymId: id,
        ownerEmail: owner.email,
        invitationStatus,
        emailDelivered,
        loginUrl,
        activationUrl
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
      status,
      slug
    } = req.body || {};

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Gym name is required', 400);
    }

    let finalSlug = null;
    if (slug && slug.trim()) {
      const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const existingSlug = await db.query('SELECT id FROM gyms WHERE LOWER(slug) = $1 AND id != $2 LIMIT 1', [cleanSlug, id]);
      if (existingSlug.rows.length > 0) {
        return ApiResponse.error(res, `Slug "${cleanSlug}" is already taken by another gym. Please choose a different slug.`, 409);
      }
      finalSlug = cleanSlug;
    }

    const existingGym = await db.query('SELECT logo_url FROM gyms WHERE id = $1 LIMIT 1', [id]);
    const currentGymLogo = existingGym.rows[0]?.logo_url || null;
    const finalGymLogo = logo_url !== undefined ? (logo_url ? logo_url.trim() : null) : currentGymLogo;

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
        slug = COALESCE($14, slug),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *;
    `;

    const values = [
      name.trim(),
      owner_name ? owner_name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      finalGymLogo,
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      postal_code ? postal_code.trim() : null,
      opening_hours ? opening_hours.trim() : null,
      description ? description.trim() : null,
      business_contact ? business_contact.trim() : null,
      status || null,
      finalSlug,
      id
    ];

    const result = await db.query(updateSql, values);

    if (result.rows.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        const updated = updateInMemoryGym(id, req.body);
        if (updated) {
          return ApiResponse.success(res, updated, 'Gym settings updated successfully (dev store)');
        }
      }
      return ApiResponse.error(res, 'Gym could not be found or updated', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Gym settings updated successfully');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const updated = updateInMemoryGym(req.params.id, req.body);
      if (updated) {
        return ApiResponse.success(res, updated, 'Gym settings updated successfully (dev fallback)');
      }
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/gyms/:id
 * Permanently deletes a gym and all associated tenant data:
 * - password_reset_tokens
 * - membership_receipts
 * - attendance
 * - payments
 * - member_subscriptions
 * - members
 * - membership_plans
 * - notifications
 * - users linked to this gym
 * - gym_owners
 * - the gym record itself
 */
router.delete('/gyms/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return ApiResponse.error(res, 'Gym ID is required', 400);
    }
    const cleanId = id.trim();

    let client = null;
    let deletedGym = null;
    let dbSuccess = false;

    try {
      client = await db.getClient();
      await client.query('BEGIN');

      // Check if gym exists by id or slug
      const checkResult = await client.query(
        'SELECT id, name, slug FROM gyms WHERE id = $1 OR LOWER(slug) = LOWER($1) LIMIT 1',
        [cleanId]
      );

      if (checkResult.rows.length > 0) {
        deletedGym = checkResult.rows[0];
        const targetGymId = deletedGym.id;

        // 1. Invalidate and delete password reset tokens for gym owners and users
        await client.query(`
          DELETE FROM password_reset_tokens 
          WHERE user_id IN (SELECT id FROM gym_owners WHERE gym_id = $1)
             OR user_id IN (SELECT id FROM users WHERE gym_id = $1)
             OR user_id IN (SELECT user_id FROM members WHERE gym_id = $1 AND user_id IS NOT NULL);
        `, [targetGymId]);

        // 2. Delete membership receipts
        await client.query('DELETE FROM membership_receipts WHERE gym_id = $1;', [targetGymId]);

        // 3. Delete attendance records
        await client.query('DELETE FROM attendance WHERE gym_id = $1;', [targetGymId]);

        // 4. Delete payments
        await client.query('DELETE FROM payments WHERE gym_id = $1;', [targetGymId]);

        // 5. Delete member subscriptions
        await client.query('DELETE FROM member_subscriptions WHERE gym_id = $1;', [targetGymId]);

        // 6. Delete members
        await client.query('DELETE FROM members WHERE gym_id = $1;', [targetGymId]);

        // 7. Delete membership plans
        await client.query('DELETE FROM membership_plans WHERE gym_id = $1;', [targetGymId]);

        // 8. Delete notifications
        await client.query('DELETE FROM notifications WHERE gym_id = $1;', [targetGymId]);

        // 9. Delete users associated with this gym
        await client.query('DELETE FROM users WHERE gym_id = $1;', [targetGymId]);

        // 10. Delete gym owners
        await client.query('DELETE FROM gym_owners WHERE gym_id = $1;', [targetGymId]);

        // 11. Finally delete the gym record
        await client.query('DELETE FROM gyms WHERE id = $1;', [targetGymId]);

        await client.query('COMMIT');
        dbSuccess = true;
      } else {
        await client.query('ROLLBACK');
      }
    } catch (dbErr) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (_rbErr) {}
      }
      console.warn('[Admin API] Database error during gym deletion:', dbErr.message);
    } finally {
      if (client) {
        try {
          client.release();
        } catch (_) {}
      }
    }

    // Always ensure dev in-memory store is also cleared
    const memDeleted = deleteInMemoryGym(cleanId);

    if (dbSuccess || memDeleted) {
      const gymName = deletedGym?.name || cleanId;
      return ApiResponse.success(
        res,
        { id: cleanId, name: gymName },
        `Gym "${gymName}" and all associated records permanently deleted`
      );
    }

    return ApiResponse.error(res, `Gym with identifier "${cleanId}" not found`, 404);
  } catch (error) {
    next(error);
  }
});

export default router;
