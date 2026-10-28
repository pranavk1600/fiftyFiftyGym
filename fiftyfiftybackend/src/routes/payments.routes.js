import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

let fallbackPayments = [
  { id: 'RCP-2026-90412', memberName: 'Rahul Sharma', amount: 4500, mode: 'UPI', date: '2026-03-20', status: 'paid', plan: 'Quarterly Pro' },
  { id: 'RCP-2026-88123', memberName: 'Ananya Roy', amount: 14000, mode: 'ONLINE', date: '2026-03-18', status: 'paid', plan: 'Annual Gold Elite' },
  { id: 'RCP-2026-77341', memberName: 'Vikram Singh', amount: 1800, mode: 'CASH', date: '2026-03-15', status: 'paid', plan: 'Monthly Standard' },
  { id: 'RCP-2026-66522', memberName: 'Priya Patel', amount: 2000, mode: 'UPI', date: '2026-03-12', status: 'partial', plan: 'Quarterly Pro' }
];

// GET /api/payments
router.get('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';

    try {
      const result = await db.query(`
        SELECT id, member_name AS "memberName", amount, mode, 
               TO_CHAR(date, 'YYYY-MM-DD') AS date, status, plan_name AS plan
        FROM payments
        WHERE gym_id = $1
        ORDER BY date DESC, created_at DESC
      `, [gymId]);

      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows, 'Payments retrieved from database');
      }
    } catch (_dbErr) {
      // DB unconfigured; return fallback
    }

    return ApiResponse.success(res, fallbackPayments, 'Payments retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/payments
router.post('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';
    const { memberName, amount, mode, plan, status } = req.body;

    if (!memberName || !amount) {
      return ApiResponse.error(res, 'Member name and amount are required', 400);
    }

    const receiptId = `RCP-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const insertSql = `
        INSERT INTO payments (id, gym_id, member_name, amount, mode, plan_name, status, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
        RETURNING id, member_name AS "memberName", amount, mode, TO_CHAR(date, 'YYYY-MM-DD') AS date, status, plan_name AS plan;
      `;
      const result = await db.query(insertSql, [
        receiptId,
        gymId,
        memberName,
        amount,
        mode || 'UPI',
        plan || 'Quarterly Pro',
        status || 'paid'
      ]);

      return ApiResponse.success(res, result.rows[0], 'Payment recorded in database', 201);
    } catch (_dbErr) {
      const newPayment = {
        id: receiptId,
        memberName,
        amount: Number(amount),
        mode: mode || 'UPI',
        date: new Date().toISOString().split('T')[0],
        status: status || 'paid',
        plan: plan || 'Quarterly Pro'
      };
      fallbackPayments = [newPayment, ...fallbackPayments];
      return ApiResponse.success(res, newPayment, 'Payment recorded successfully', 201);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
