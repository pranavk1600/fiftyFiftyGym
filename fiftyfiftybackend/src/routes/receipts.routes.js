import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { optionalAuthenticate, authenticate } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/roles.constant.js';
import {
  getReceiptPdfBuffer,
  generateReceiptSignedUrls,
  verifySignedDownloadToken
} from '../services/storage.service.js';
import { sendMemberReceiptEmail } from '../services/email.service.js';

const router = Router();

/**
 * Helper to verify tenant ownership for receipt access.
 * Returns receipt record if authorized, or throws/returns null.
 */
const verifyReceiptAccess = async (req, receiptId) => {
  const result = await db.query(`
    SELECT 
      r.id, r.receipt_number AS "receiptNumber", r.gym_id AS "gymId", r.member_id AS "memberId",
      r.membership_subscription_id AS "subscriptionId", r.payment_id AS "paymentId",
      r.plan_name AS "planName", r.amount, r.payment_status AS "paymentStatus",
      r.receipt_type AS "receiptType", r.storage_path AS "storagePath",
      TO_CHAR(r.issued_date, 'YYYY-MM-DD') AS "issuedDate",
      r.payment_reference AS "paymentReference", r.payment_mode AS "paymentMode",
      r.created_at AS "createdAt",
      m.full_name AS "memberName", m.email AS "memberEmail", m.phone AS "memberPhone",
      TO_CHAR(m.join_date, 'YYYY-MM-DD') AS "joinDate",
      TO_CHAR(m.expiry_date, 'YYYY-MM-DD') AS "expiryDate",
      g.name AS "gymName", g.logo_url AS "gymLogoUrl", g.slug AS "gymSlug"
    FROM membership_receipts r
    JOIN members m ON m.id = r.member_id
    JOIN gyms g ON g.id = r.gym_id
    WHERE r.id = $1 OR r.receipt_number = $1
    LIMIT 1;
  `, [receiptId]);

  if (result.rows.length === 0) {
    return { receipt: null, error: 'Receipt not found', status: 404 };
  }

  const receipt = result.rows[0];

  // If user is authenticated, check role authorization
  if (req.user) {
    const userRole = req.user.role;
    const isSuperAdmin = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PLATFORM_ADMIN || userRole === 'super_admin';

    if (isSuperAdmin) {
      return { receipt };
    }

    if (userRole === ROLES.GYM_OWNER) {
      if (req.user.gymId !== receipt.gymId) {
        return { receipt: null, error: 'Forbidden: Access denied to receipt of another gym tenant', status: 403 };
      }
      return { receipt };
    }

    if (userRole === ROLES.MEMBER) {
      if (req.user.memberId !== receipt.memberId && req.user.id !== receipt.memberId) {
        return { receipt: null, error: 'Forbidden: You can only access your own receipts', status: 403 };
      }
      return { receipt };
    }

    return { receipt: null, error: 'Forbidden: Unauthorized access', status: 403 };
  }

  return { receipt, isUnauthenticated: true };
};

/**
 * GET /api/receipts/member/:memberId
 * Fetches all receipts for a specific member.
 * Accessible by:
 * - Gym Owner (of that gym)
 * - Authenticated Member (for their own memberId)
 * - Super Admin
 */
router.get('/member/:memberId', authenticate, async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const userRole = req.user.role;
    const isSuperAdmin = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PLATFORM_ADMIN || userRole === 'super_admin';

    // Verify member exists
    const memRes = await db.query(
      'SELECT id, gym_id, full_name, email FROM members WHERE id = $1 LIMIT 1',
      [memberId]
    );

    if (memRes.rows.length === 0) {
      return ApiResponse.error(res, 'Member not found', 404);
    }

    const member = memRes.rows[0];

    // Enforce tenant authorization
    if (!isSuperAdmin) {
      if (userRole === ROLES.GYM_OWNER && req.user.gymId !== member.gym_id) {
        return ApiResponse.error(res, 'Forbidden: You cannot access receipts belonging to another gym', 403);
      }
      if (userRole === ROLES.MEMBER && req.user.memberId !== member.id && req.user.id !== member.id) {
        return ApiResponse.error(res, 'Forbidden: You can only access your own receipts', 403);
      }
    }

    const result = await db.query(`
      SELECT 
        r.id, r.receipt_number AS "receiptNumber", r.gym_id AS "gymId", r.member_id AS "memberId",
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

    // Attach short-lived signed URLs for each receipt
    const enrichedReceipts = await Promise.all(
      result.rows.map(async (row) => {
        const urls = await generateReceiptSignedUrls({
          receiptId: row.id,
          storagePath: row.storagePath,
          expiresInSeconds: 900 // 15 mins
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

/**
 * GET /api/receipts/:receiptId
 * Fetches single receipt metadata with signed URLs.
 */
router.get('/:receiptId', authenticate, async (req, res, next) => {
  try {
    const { receiptId } = req.params;
    const { receipt, error, status } = await verifyReceiptAccess(req, receiptId);

    if (error) {
      return ApiResponse.error(res, error, status || 400);
    }

    const urls = await generateReceiptSignedUrls({
      receiptId: receipt.id,
      storagePath: receipt.storagePath,
      expiresInSeconds: 900
    });

    return ApiResponse.success(res, {
      ...receipt,
      previewUrl: urls.previewUrl,
      downloadUrl: urls.downloadUrl
    }, 'Receipt details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/receipts/:receiptId/preview
 * Streams the PDF directly for browser preview (Content-Disposition: inline).
 * Supports both JWT authentication and HMAC signed token query (?token=...).
 */
router.get('/:receiptId/preview', optionalAuthenticate, async (req, res, next) => {
  try {
    const { receiptId } = req.params;
    const { token } = req.query;

    const { receipt, error, status } = await verifyReceiptAccess(req, receiptId);
    if (!receipt) {
      return ApiResponse.error(res, error || 'Receipt not found', status || 404);
    }

    // If not authenticated via JWT, verify signed token
    if (!req.user) {
      if (!token || !verifySignedDownloadToken(receipt.id, token)) {
        return ApiResponse.error(res, 'Invalid or expired preview token. Please refresh your session.', 401);
      }
    }

    const pdfBuffer = await getReceiptPdfBuffer(receipt.storagePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${receipt.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300');

    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/receipts/:receiptId/download
 * Streams the PDF directly as a file download (Content-Disposition: attachment).
 * Supports both JWT authentication and HMAC signed token query (?token=...).
 */
router.get('/:receiptId/download', optionalAuthenticate, async (req, res, next) => {
  try {
    const { receiptId } = req.params;
    const { token } = req.query;

    const { receipt, error, status } = await verifyReceiptAccess(req, receiptId);
    if (!receipt) {
      return ApiResponse.error(res, error || 'Receipt not found', status || 404);
    }

    // If not authenticated via JWT, verify signed token
    if (!req.user) {
      if (!token || !verifySignedDownloadToken(receipt.id, token)) {
        return ApiResponse.error(res, 'Invalid or expired download token. Please refresh your session.', 401);
      }
    }

    const pdfBuffer = await getReceiptPdfBuffer(receipt.storagePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300');

    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/receipts/:receiptId/resend
 * Resends the receipt PDF as an email attachment via Brevo.
 * Accessible by Gym Owner (of that gym) or Super Admin.
 */
router.post('/:receiptId/resend', authenticate, async (req, res, next) => {
  try {
    const { receiptId } = req.params;
    const { receipt, error, status } = await verifyReceiptAccess(req, receiptId);

    if (error) {
      return ApiResponse.error(res, error, status || 400);
    }

    if (!receipt.memberEmail) {
      return ApiResponse.error(res, 'Member does not have a registered email address to receive receipts', 400);
    }

    // 1. Retrieve the stored PDF buffer (reusing existing PDF without duplicating)
    const pdfBuffer = await getReceiptPdfBuffer(receipt.storagePath);

    // 2. Dispatch email via Brevo
    const emailResult = await sendMemberReceiptEmail({
      to: receipt.memberEmail,
      gymName: receipt.gymName,
      gymLogoUrl: receipt.gymLogoUrl,
      memberName: receipt.memberName,
      planName: receipt.planName,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
      paymentStatus: receipt.paymentStatus,
      joinDate: receipt.joinDate,
      expiryDate: receipt.expiryDate,
      pdfBuffer
    });

    if (emailResult.success) {
      return ApiResponse.success(res, {
        delivered: true,
        receiptNumber: receipt.receiptNumber,
        recipient: receipt.memberEmail
      }, `Receipt ${receipt.receiptNumber} was successfully sent to ${receipt.memberEmail}`);
    } else {
      return ApiResponse.error(res, `Failed to dispatch email via Brevo: ${emailResult.error || emailResult.message || 'Delivery error'}`, 502);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
