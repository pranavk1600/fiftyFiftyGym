import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { optionalAuthenticate, authenticate } from '../middlewares/auth.middleware.js';
import { enforceGymIsolation } from '../middlewares/rbac.middleware.js';
import { calculateMembershipEndDate } from '../utils/dateUtils.js';
import { sendMemberInvitationEmail } from '../services/email.service.js';
import { generateMembershipReceiptPdf } from '../services/pdf.service.js';
import { uploadReceiptPdf, generateReceiptSignedUrls } from '../services/storage.service.js';
import { ROLES } from '../constants/roles.constant.js';

const router = Router();

router.use(optionalAuthenticate, enforceGymIsolation);

const resolveGymId = async (req) => {
  let gymId = req.gymId || req.user?.gymId || req.headers['x-gym-id'];
  if (!gymId) {
    try {
      const primaryGym = await db.query('SELECT id FROM gyms ORDER BY created_at ASC LIMIT 1');
      if (primaryGym.rows.length > 0) {
        gymId = primaryGym.rows[0].id;
      }
    } catch (_e) {
      // DB unconfigured
    }
  }
  return gymId;
};

// GET /api/members
router.get('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);
    const { search, status } = req.query;

    if (!gymId) {
      return ApiResponse.success(res, [], 'No members found');
    }

    try {
      let queryText = `
        SELECT 
          id, gym_id AS "gymId", full_name AS name, phone, email, 
          slug, current_plan_name AS plan, current_plan_id AS "planId",
          TO_CHAR(join_date, 'YYYY-MM-DD') AS "joinDate", 
          TO_CHAR(expiry_date, 'YYYY-MM-DD') AS "expiryDate",
          status, total_visits AS visits,
          invitation_status AS "invitationStatus",
          invitation_sent_at AS "invitationSentAt",
          created_at AS "createdAt"
        FROM members 
        WHERE gym_id = $1
      `;
      const params = [gymId];

      if (status && status !== 'ALL') {
        params.push(status.toLowerCase());
        queryText += ` AND status = $${params.length}`;
      }

      if (search && search.trim()) {
        params.push(`%${search.trim()}%`);
        queryText += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR id ILIKE $${params.length} OR email ILIKE $${params.length} OR slug ILIKE $${params.length})`;
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await db.query(queryText, params);
      return ApiResponse.success(res, result.rows, 'Members retrieved from database');
    } catch (err) {
      console.error('[Members Query Error]:', err.message);
      return ApiResponse.success(res, [], 'No members found');
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/members
router.post('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);
    const { name, phone, email, plan, joinDate, status } = req.body || {};

    if (!name || !name.trim()) {
      return ApiResponse.error(res, 'Member full name is required', 400);
    }
    if (!phone || !phone.trim()) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }
    if (!email || !email.trim()) {
      return ApiResponse.error(res, 'Email address is required for member portal invitation', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return ApiResponse.error(res, 'Please provide a valid email address', 400);
    }

    if (!gymId) {
      return ApiResponse.error(res, 'No gym assigned to record member', 400);
    }

    // 1. Fetch Gym details
    const gymRes = await db.query(
      'SELECT id, name, slug, logo_url, address, city, state, postal_code, phone, email FROM gyms WHERE id = $1 LIMIT 1',
      [gymId]
    );
    if (gymRes.rows.length === 0) {
      return ApiResponse.error(res, 'Gym not found', 404);
    }
    const gym = gymRes.rows[0];
    const gymSlug = gym.slug || '5050-fitness-club';

    // 2. Prevent duplicate email under the same gym context
    const dupCheck = await db.query(
      'SELECT id FROM members WHERE gym_id = $1 AND LOWER(email) = $2 LIMIT 1',
      [gymId, normalizedEmail]
    );
    if (dupCheck.rows.length > 0) {
      return ApiResponse.error(res, 'A member with this email address is already registered in this gym', 409);
    }

    // 3. Resolve plan and validate duration for end date calculation
    let planId = null;
    let planName = plan || 'Standard Membership';
    let durationDays = 30;
    let planPrice = 0;

    const planQuery = await db.query(
      'SELECT id, name, duration_days, price FROM membership_plans WHERE gym_id = $1 AND (LOWER(name) = LOWER($2) OR id::text = $2) LIMIT 1',
      [gymId, planName]
    );

    if (planQuery.rows.length > 0) {
      planId = planQuery.rows[0].id;
      planName = planQuery.rows[0].name;
      durationDays = Number(planQuery.rows[0].duration_days) || 30;
      planPrice = planQuery.rows[0].price ? parseFloat(planQuery.rows[0].price) : 0;
    }

    // Backend-verified membership end date
    const memberJoinDate = joinDate ? String(joinDate).split('T')[0] : new Date().toISOString().split('T')[0];
    const memberExpiryDate = calculateMembershipEndDate(memberJoinDate, durationDays);

    // 4. Generate URL-safe unique member slug
    const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'member';
    const existingSlugs = await db.query(
      'SELECT slug FROM members WHERE gym_id = $1 AND (slug = $2 OR slug LIKE $3)',
      [gymId, baseSlug, `${baseSlug}-%`]
    );

    let memberSlug = baseSlug;
    if (existingSlugs.rows.length > 0) {
      const slugSet = new Set(existingSlugs.rows.map((r) => r.slug));
      let counter = 2;
      while (slugSet.has(`${baseSlug}-${counter}`)) {
        counter++;
      }
      memberSlug = `${baseSlug}-${counter}`;
    }

    // 5. Generate secure member record ID and initial random password hash
    const memberId = `MEM${Date.now().toString().slice(-4)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const initialPlaceholderPass = crypto.randomBytes(32).toString('hex');
    const placeholderHash = await bcrypt.hash(initialPlaceholderPass, 10);

    const insertSql = `
      INSERT INTO members (
        id, gym_id, full_name, phone, email, current_plan_id, current_plan_name,
        join_date, expiry_date, status, slug, password_hash, must_change_password,
        invitation_status, invitation_sent_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, 'pending', CURRENT_TIMESTAMP)
      RETURNING 
        id, gym_id AS "gymId", full_name AS name, phone, email, slug,
        current_plan_name AS plan, current_plan_id AS "planId",
        TO_CHAR(join_date, 'YYYY-MM-DD') AS "joinDate",
        TO_CHAR(expiry_date, 'YYYY-MM-DD') AS "expiryDate",
        status, total_visits AS visits,
        invitation_status AS "invitationStatus",
        invitation_sent_at AS "invitationSentAt";
    `;

    const result = await db.query(insertSql, [
      memberId,
      gymId,
      name.trim(),
      phone.trim(),
      normalizedEmail,
      planId,
      planName,
      memberJoinDate,
      memberExpiryDate,
      status || 'active',
      memberSlug,
      placeholderHash
    ]);

    const createdMember = result.rows[0];

    // 6. Generate official PDF Membership Receipt & Registration Acknowledgement
    const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    let pdfBuffer = null;
    let receiptRecord = null;

    try {
      pdfBuffer = await generateMembershipReceiptPdf({
        gym: {
          name: gym.name,
          address: gym.address,
          city: gym.city,
          state: gym.state,
          postal_code: gym.postal_code,
          phone: gym.phone,
          email: gym.email,
          logo_url: gym.logo_url
        },
        member: {
          id: createdMember.id,
          name: createdMember.name,
          email: createdMember.email,
          phone: createdMember.phone,
          slug: createdMember.slug
        },
        plan: {
          name: planName,
          durationDays,
          durationLabel: `${durationDays} Days`,
          price: planPrice
        },
        receipt: {
          receiptNumber,
          issuedDate: memberJoinDate,
          joinDate: memberJoinDate,
          expiryDate: memberExpiryDate,
          amount: planPrice,
          paymentStatus: 'PAYMENT_PENDING',
          receiptType: 'REGISTRATION_ACKNOWLEDGEMENT',
          paymentReference: 'PENDING_CONFIRMATION',
          paymentMode: 'UNPAID'
        }
      });

      // Upload to private Supabase Storage & local backup
      const uploadResult = await uploadReceiptPdf({
        gymId,
        memberId: createdMember.id,
        receiptNumber,
        pdfBuffer
      });

      // Insert record into membership_receipts
      const receiptInsertSql = `
        INSERT INTO membership_receipts (
          receipt_number, gym_id, member_id, plan_name, amount,
          payment_status, receipt_type, storage_path, issued_date,
          payment_reference, payment_mode
        )
        VALUES ($1, $2, $3, $4, $5, 'PAYMENT_PENDING', 'REGISTRATION_ACKNOWLEDGEMENT', $6, $7, 'PENDING_CONFIRMATION', 'UNPAID')
        RETURNING id, receipt_number AS "receiptNumber", amount, payment_status AS "paymentStatus", receipt_type AS "receiptType";
      `;
      const receiptRes = await db.query(receiptInsertSql, [
        receiptNumber,
        gymId,
        createdMember.id,
        planName,
        planPrice,
        uploadResult.storagePath,
        memberJoinDate
      ]);
      receiptRecord = receiptRes.rows[0];
    } catch (pdfErr) {
      console.error('[Receipt PDF Generation/Storage Error]:', pdfErr.message);
    }

    // 7. Generate secure single-use account activation / password setup token
    const rawActivationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [createdMember.id, tokenHash, tokenExpiry]
    );

    // 8. Construct dynamic URLs using FRONTEND_URL
    const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
    const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
    const loginUrl = `${frontendUrl}/gym/${gymSlug}/${memberSlug}/login`;
    const activationUrl = `${frontendUrl}/gym/${gymSlug}/${memberSlug}/setup-password?token=${rawActivationToken}`;

    // 9. Send transactional invitation email via Brevo with PDF Receipt Attachment
    let emailStatus = 'pending';
    let emailError = null;

    try {
      const emailResult = await sendMemberInvitationEmail({
        to: normalizedEmail,
        gymName: gym.name,
        gymLogoUrl: gym.logo_url,
        memberName: createdMember.name,
        planName,
        joinDate: createdMember.joinDate,
        expiryDate: createdMember.expiryDate,
        loginUrl,
        activationUrl,
        expiryDays: 7,
        receiptPdfBuffer: pdfBuffer,
        receiptNumber
      });

      if (emailResult.success) {
        emailStatus = 'sent';
        await db.query("UPDATE members SET invitation_status = 'sent', invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $1", [createdMember.id]);
        createdMember.invitationStatus = 'sent';
      } else {
        emailStatus = 'failed';
        emailError = emailResult.error || emailResult.message || 'Brevo delivery unconfigured';
        await db.query("UPDATE members SET invitation_status = 'failed' WHERE id = $1", [createdMember.id]);
        createdMember.invitationStatus = 'failed';
      }
    } catch (err) {
      console.error('[Member Invitation Email Exception]:', err.message);
      emailStatus = 'failed';
      emailError = err.message;
      await db.query("UPDATE members SET invitation_status = 'failed' WHERE id = $1", [createdMember.id]);
      createdMember.invitationStatus = 'failed';
    }

    return ApiResponse.success(res, {
      ...createdMember,
      receipt: receiptRecord,
      loginUrl,
      activationUrl,
      emailStatus,
      emailError
    }, emailStatus === 'sent'
      ? `Member registered, official receipt generated, and invitation email sent to ${normalizedEmail}!`
      : `Member registered and receipt generated! Email delivery notice: ${emailError || 'Pending dispatch'}. You can resend the invitation at any time.`,
      201
    );
  } catch (error) {
    next(error);
  }
});

// POST /api/members/:id/resend-invitation
router.post('/:id/resend-invitation', async (req, res, next) => {
  try {
    const { id } = req.params;
    const gymId = await resolveGymId(req);

    const memRes = await db.query(
      `SELECT m.id, m.full_name AS name, m.email, m.slug, m.current_plan_name AS plan,
              TO_CHAR(m.join_date, 'YYYY-MM-DD') AS "joinDate",
              TO_CHAR(m.expiry_date, 'YYYY-MM-DD') AS "expiryDate",
              g.name AS "gymName", g.slug AS "gymSlug", g.logo_url AS "gymLogoUrl"
       FROM members m
       JOIN gyms g ON g.id = m.gym_id
       WHERE m.id = $1 AND m.gym_id = $2
       LIMIT 1`,
      [id, gymId]
    );

    if (memRes.rows.length === 0) {
      return ApiResponse.error(res, 'Member not found or not belonging to this gym', 404);
    }

    const member = memRes.rows[0];
    if (!member.email) {
      return ApiResponse.error(res, 'Member does not have a registered email address to receive invitations', 400);
    }

    // Invalidate prior unused tokens
    await db.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL', [member.id]);

    // Generate fresh single-use activation token
    const rawActivationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [member.id, tokenHash, tokenExpiry]
    );

    const rawFrontendUrl = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://fiftyfiftygym.vercel.app' : 'http://localhost:5173');
    const frontendUrl = rawFrontendUrl.replace(/\/$/, '');
    const gymSlug = member.gymSlug || '5050-fitness-club';
    const memberSlug = member.slug || 'member';
    const loginUrl = `${frontendUrl}/gym/${gymSlug}/${memberSlug}/login`;
    const activationUrl = `${frontendUrl}/gym/${gymSlug}/${memberSlug}/setup-password?token=${rawActivationToken}`;

    const emailResult = await sendMemberInvitationEmail({
      to: member.email,
      gymName: member.gymName,
      gymLogoUrl: member.gymLogoUrl,
      memberName: member.name,
      planName: member.plan || 'Standard Membership',
      joinDate: member.joinDate,
      expiryDate: member.expiryDate,
      loginUrl,
      activationUrl,
      expiryDays: 7
    });

    if (emailResult.success) {
      await db.query("UPDATE members SET invitation_status = 'sent', invitation_sent_at = CURRENT_TIMESTAMP WHERE id = $1", [member.id]);
      return ApiResponse.success(res, {
        invitationStatus: 'sent',
        loginUrl,
        activationUrl
      }, `Invitation successfully resent to ${member.email}!`);
    } else {
      await db.query("UPDATE members SET invitation_status = 'failed' WHERE id = $1", [member.id]);
      return ApiResponse.error(res, `Failed to dispatch invitation email: ${emailResult.error || emailResult.message || 'Unknown error'}`, 502);
    }
  } catch (error) {
    next(error);
  }
});

// PUT /api/members/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, plan, status } = req.body || {};

    const updateSql = `
      UPDATE members 
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email),
          current_plan_name = COALESCE($4, current_plan_name),
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING 
        id, gym_id AS "gymId", full_name AS name, phone, email, slug,
        current_plan_name AS plan, current_plan_id AS "planId",
        TO_CHAR(join_date, 'YYYY-MM-DD') AS "joinDate",
        TO_CHAR(expiry_date, 'YYYY-MM-DD') AS "expiryDate",
        status, total_visits AS visits,
        invitation_status AS "invitationStatus",
        invitation_sent_at AS "invitationSentAt";
    `;
    const result = await db.query(updateSql, [name, phone, email, plan, status, id]);
    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Member not found', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Member updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM members WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Member not found', 404);
    }

    return ApiResponse.success(res, { id }, 'Member deleted successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/members/:memberId/receipts
router.get('/:memberId/receipts', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const gymId = await resolveGymId(req);

    let memberQuery = 'SELECT id, gym_id, full_name, email FROM members WHERE id = $1';
    const params = [memberId];
    if (gymId) {
      memberQuery += ' AND gym_id = $2';
      params.push(gymId);
    }
    const memRes = await db.query(memberQuery, params);
    if (memRes.rows.length === 0) {
      return ApiResponse.error(res, 'Member not found', 404);
    }

    const member = memRes.rows[0];

    // Check user role authorization
    if (req.user) {
      const userRole = req.user.role;
      const isSuperAdmin = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PLATFORM_ADMIN || userRole === 'super_admin';
      if (!isSuperAdmin) {
        if (userRole === ROLES.GYM_OWNER && req.user.gymId !== member.gym_id) {
          return ApiResponse.error(res, 'Forbidden: You cannot access receipts belonging to another gym', 403);
        }
        if (userRole === ROLES.MEMBER && req.user.memberId !== member.id && req.user.id !== member.id) {
          return ApiResponse.error(res, 'Forbidden: You can only access your own receipts', 403);
        }
      }
    }

    const result = await db.query(`
      SELECT 
        r.id, r.receipt_number AS "receiptNumber", r.gym_id AS "gymId", r.member_id AS "memberId",
        r.membership_subscription_id AS "subscriptionId", r.payment_id AS "paymentId",
        r.plan_name AS "planName", r.amount, r.payment_status AS "paymentStatus",
        r.receipt_type AS "receiptType", r.storage_path AS "storagePath",
        TO_CHAR(r.issued_date, 'YYYY-MM-DD') AS "issuedDate",
        r.payment_reference AS "paymentReference", r.payment_mode AS "paymentMode",
        r.created_at AS "createdAt",
        m.full_name AS "memberName", m.email AS "memberEmail",
        g.name AS "gymName"
      FROM membership_receipts r
      JOIN members m ON m.id = r.member_id
      JOIN gyms g ON g.id = r.gym_id
      WHERE r.member_id = $1
      ORDER BY r.created_at DESC;
    `, [memberId]);

    const enrichedReceipts = await Promise.all(
      result.rows.map(async (row) => {
        const urls = await generateReceiptSignedUrls({
          receiptId: row.id,
          storagePath: row.storagePath,
          expiresInSeconds: 900
        });
        return {
          ...row,
          previewUrl: urls.previewUrl,
          downloadUrl: urls.downloadUrl
        };
      })
    );

    return ApiResponse.success(res, enrichedReceipts, 'Member receipts retrieved successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
