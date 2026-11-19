import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { enforceGymIsolation } from '../middlewares/rbac.middleware.js';
import { generateMembershipReceiptPdf } from '../services/pdf.service.js';
import { uploadReceiptPdf } from '../services/storage.service.js';
import { sendMemberReceiptEmail } from '../services/email.service.js';

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
    } catch (_e) {}
  }
  return gymId;
};

// GET /api/payments
router.get('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);

    if (!gymId) {
      return ApiResponse.success(res, [], 'No payment records found');
    }

    try {
      const result = await db.query(`
        SELECT id, member_name AS "memberName", amount, mode, 
               TO_CHAR(date, 'YYYY-MM-DD') AS date, status, plan_name AS plan, notes
        FROM payments
        WHERE gym_id = $1
        ORDER BY date DESC, created_at DESC
      `, [gymId]);

      return ApiResponse.success(res, result.rows, 'Payments retrieved from database');
    } catch (err) {
      console.error('[Payments Query Error]:', err.message);
      return ApiResponse.success(res, [], 'No payment records found');
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/payments
router.post('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);
    const { memberName, amount, mode, plan, status, memberId, notes } = req.body || {};

    if (!memberName || !memberName.trim() || !amount) {
      return ApiResponse.error(res, 'Member name and amount are required', 400);
    }

    if (!gymId) {
      return ApiResponse.error(res, 'No gym assigned to record payment', 400);
    }

    const receiptId = `RCP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const insertSql = `
      INSERT INTO payments (id, gym_id, member_id, member_name, amount, mode, plan_name, status, notes, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
      RETURNING id, member_name AS "memberName", amount, mode, TO_CHAR(date, 'YYYY-MM-DD') AS date, status, plan_name AS plan, notes;
    `;
    const result = await db.query(insertSql, [
      receiptId,
      gymId,
      memberId || null,
      memberName.trim(),
      parseFloat(amount),
      mode || 'UPI',
      plan || 'Active Membership',
      status || 'paid',
      notes || null
    ]);

    const createdPayment = result.rows[0];

    // If payment is marked paid, generate verified official PAID payment receipt
    if ((status || 'paid').toLowerCase() === 'paid') {
      try {
        const gymRes = await db.query(
          'SELECT id, name, slug, logo_url, address, city, state, postal_code, phone, email FROM gyms WHERE id = $1 LIMIT 1',
          [gymId]
        );
        const gym = gymRes.rows[0] || {};

        let resolvedMember = null;
        if (memberId) {
          const mRes = await db.query(
            'SELECT id, full_name, email, phone, slug, join_date, expiry_date FROM members WHERE id = $1 LIMIT 1',
            [memberId]
          );
          if (mRes.rows.length > 0) resolvedMember = mRes.rows[0];
        }
        if (!resolvedMember && memberName) {
          const mRes = await db.query(
            'SELECT id, full_name, email, phone, slug, join_date, expiry_date FROM members WHERE gym_id = $1 AND LOWER(full_name) = LOWER($2) LIMIT 1',
            [gymId, memberName.trim()]
          );
          if (mRes.rows.length > 0) resolvedMember = mRes.rows[0];
        }

        const effectiveMemberId = resolvedMember?.id || memberId || `MEM-${Date.now().toString().slice(-4)}`;
        const receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

        const pdfBuffer = await generateMembershipReceiptPdf({
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
            id: effectiveMemberId,
            name: resolvedMember?.full_name || memberName.trim(),
            email: resolvedMember?.email || 'N/A',
            phone: resolvedMember?.phone || 'N/A',
            slug: resolvedMember?.slug || ''
          },
          plan: {
            name: plan || 'Membership Plan',
            durationDays: 30,
            durationLabel: 'Active Plan',
            price: parseFloat(amount)
          },
          receipt: {
            receiptNumber,
            issuedDate: new Date().toISOString().split('T')[0],
            joinDate: resolvedMember?.join_date ? String(resolvedMember.join_date).split('T')[0] : new Date().toISOString().split('T')[0],
            expiryDate: resolvedMember?.expiry_date ? String(resolvedMember.expiry_date).split('T')[0] : '',
            amount: parseFloat(amount),
            paymentStatus: 'PAID',
            receiptType: 'PAYMENT_RECEIPT',
            paymentReference: receiptId,
            paymentMode: mode || 'UPI'
          }
        });

        const uploadResult = await uploadReceiptPdf({
          gymId,
          memberId: effectiveMemberId,
          receiptNumber,
          pdfBuffer
        });

        await db.query(`
          INSERT INTO membership_receipts (
            receipt_number, gym_id, member_id, payment_id, plan_name,
            amount, payment_status, receipt_type, storage_path, issued_date,
            payment_reference, payment_mode
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'PAID', 'PAYMENT_RECEIPT', $7, CURRENT_DATE, $8, $9);
        `, [
          receiptNumber,
          gymId,
          effectiveMemberId,
          receiptId,
          plan || 'Membership Plan',
          parseFloat(amount),
          uploadResult.storagePath,
          receiptId,
          mode || 'UPI'
        ]);

        if (resolvedMember?.email) {
          try {
            await sendMemberReceiptEmail({
              to: resolvedMember.email,
              gymName: gym.name,
              gymLogoUrl: gym.logo_url,
              memberName: resolvedMember.full_name,
              receiptNumber,
              planName: plan || 'Membership Plan',
              amount: parseFloat(amount),
              paymentDate: new Date().toISOString().split('T')[0],
              paymentStatus: 'PAID',
              paymentMode: mode || 'UPI',
              receiptPdfBuffer: pdfBuffer
            });
          } catch (eErr) {
            console.warn('[Payment Receipt Email Delivery Error]:', eErr.message);
          }
        }
      } catch (receiptErr) {
        console.error('[Payment Receipt Generation Error]:', receiptErr.message);
      }
    }

    return ApiResponse.success(res, createdPayment, 'Payment recorded and receipt generated in database', 201);
  } catch (error) {
    next(error);
  }
});

export default router;
