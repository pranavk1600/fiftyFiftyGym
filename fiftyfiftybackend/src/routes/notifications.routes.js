import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

let fallbackAlerts = [
  {
    id: 1,
    type: 'EXPIRY',
    title: '3 Memberships Expiring in 48 Hours',
    description: 'Rahul Sharma, Sneha Gupta, and Arjun Das have memberships expiring soon.',
    time: '2 hours ago',
    level: 'warning',
    isUnread: true
  },
  {
    id: 2,
    type: 'DUE',
    title: 'Pending Balance Alert: ₹2,500',
    description: 'Priya Patel has an outstanding partial payment balance for Quarterly Pro plan.',
    time: '5 hours ago',
    level: 'danger',
    isUnread: true
  },
  {
    id: 3,
    type: 'EXPIRED',
    title: 'Membership Expired: Vikram Singh',
    description: 'Monthly Standard plan expired on 2026-03-24. Membership status updated to inactive.',
    time: 'Yesterday',
    level: 'info',
    isUnread: false
  }
];

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';

    try {
      const result = await db.query(`
        SELECT id, type, title, description, level, is_unread AS "isUnread",
               TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS time
        FROM notifications
        WHERE gym_id = $1
        ORDER BY created_at DESC
      `, [gymId]);

      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows, 'Notifications retrieved from database');
      }
    } catch (_dbErr) {
      // DB unconfigured; return fallback
    }

    return ApiResponse.success(res, fallbackAlerts, 'Notifications retrieved');
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';

    try {
      await db.query('UPDATE notifications SET is_unread = false WHERE gym_id = $1', [gymId]);
    } catch (_dbErr) {
      // DB unconfigured; update fallback
    }

    fallbackAlerts = fallbackAlerts.map((a) => ({ ...a, isUnread: false }));
    return ApiResponse.success(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await db.query('DELETE FROM notifications WHERE id = $1', [id]);
    } catch (_dbErr) {
      // DB unconfigured; update fallback
    }

    fallbackAlerts = fallbackAlerts.filter((a) => a.id !== Number(id));
    return ApiResponse.success(res, { id }, 'Notification dismissed');
  } catch (error) {
    next(error);
  }
});

export default router;
