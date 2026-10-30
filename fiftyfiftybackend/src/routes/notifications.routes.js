import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { enforceGymIsolation } from '../middlewares/rbac.middleware.js';

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

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);

    if (!gymId) {
      return ApiResponse.success(res, [], 'No notifications found');
    }

    try {
      const result = await db.query(`
        SELECT id, type, title, description, level, is_unread AS "isUnread",
               TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS time
        FROM notifications
        WHERE gym_id = $1
        ORDER BY created_at DESC
      `, [gymId]);

      return ApiResponse.success(res, result.rows, 'Notifications retrieved from database');
    } catch (err) {
      console.error('[Notifications Query Error]:', err.message);
      return ApiResponse.success(res, [], 'No notifications found');
    }
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);

    if (gymId) {
      await db.query('UPDATE notifications SET is_unread = false WHERE gym_id = $1', [gymId]).catch(() => {});
    }

    return ApiResponse.success(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const gymId = await resolveGymId(req);

    if (gymId) {
      await db.query('DELETE FROM notifications WHERE id = $1 AND gym_id = $2', [id, gymId]).catch(() => {});
    } else {
      await db.query('DELETE FROM notifications WHERE id = $1', [id]).catch(() => {});
    }

    return ApiResponse.success(res, { id }, 'Notification dismissed');
  } catch (error) {
    next(error);
  }
});

export default router;
