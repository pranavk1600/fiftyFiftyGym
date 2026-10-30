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

// GET /api/attendance
router.get('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);

    if (!gymId) {
      return ApiResponse.success(res, [], 'No attendance records found');
    }

    try {
      const result = await db.query(`
        SELECT id, member_name AS "memberName", phone, plan_name AS plan,
               TO_CHAR(check_in_time, 'HH12:MI AM') AS "checkInTime",
               TO_CHAR(check_out_time, 'HH12:MI AM') AS "checkOutTime",
               status
        FROM attendance
        WHERE gym_id = $1 AND date = CURRENT_DATE
        ORDER BY check_in_time DESC
      `, [gymId]);

      return ApiResponse.success(res, result.rows, 'Attendance retrieved from database');
    } catch (err) {
      console.error('[Attendance Query Error]:', err.message);
      return ApiResponse.success(res, [], 'No attendance records found');
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/check-in
router.post('/check-in', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);
    const { memberName, phone, plan, memberId } = req.body || {};

    if (!memberName || !memberName.trim()) {
      return ApiResponse.error(res, 'Member name is required', 400);
    }

    if (!gymId) {
      return ApiResponse.error(res, 'No gym assigned to record check-in', 400);
    }

    // Try finding member by name or phone if memberId not provided
    let resolvedMemberId = memberId || null;
    let resolvedPhone = phone || null;
    let resolvedPlan = plan || 'Active Member';

    try {
      const memberLookup = await db.query(
        'SELECT id, phone, current_plan_name FROM members WHERE gym_id = $1 AND (LOWER(full_name) = $2 OR phone = $3) LIMIT 1',
        [gymId, memberName.trim().toLowerCase(), phone || '']
      );
      if (memberLookup.rows.length > 0) {
        resolvedMemberId = memberLookup.rows[0].id;
        resolvedPhone = memberLookup.rows[0].phone;
        resolvedPlan = memberLookup.rows[0].current_plan_name || resolvedPlan;
      }
    } catch (_lookupErr) {}

    const insertSql = `
      INSERT INTO attendance (gym_id, member_id, member_name, phone, plan_name, check_in_time, status, date)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'IN_GYM', CURRENT_DATE)
      RETURNING id, member_name AS "memberName", phone, plan_name AS plan,
                TO_CHAR(check_in_time, 'HH12:MI AM') AS "checkInTime",
                TO_CHAR(check_out_time, 'HH12:MI AM') AS "checkOutTime",
                status;
    `;
    const result = await db.query(insertSql, [
      gymId,
      resolvedMemberId,
      memberName.trim(),
      resolvedPhone,
      resolvedPlan
    ]);

    // Increment member total_visits if member was matched
    if (resolvedMemberId) {
      await db.query('UPDATE members SET total_visits = COALESCE(total_visits, 0) + 1 WHERE id = $1', [resolvedMemberId]).catch(() => {});
    }

    return ApiResponse.success(res, result.rows[0], 'Check-in recorded in database', 201);
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/check-out
router.post('/check-out', async (req, res, next) => {
  try {
    const { id } = req.body || {};

    if (!id) {
      return ApiResponse.error(res, 'Attendance log ID is required', 400);
    }

    const updateSql = `
      UPDATE attendance
      SET check_out_time = CURRENT_TIMESTAMP,
          status = 'COMPLETED'
      WHERE id = $1
      RETURNING id, member_name AS "memberName", phone, plan_name AS plan,
                TO_CHAR(check_in_time, 'HH12:MI AM') AS "checkInTime",
                TO_CHAR(check_out_time, 'HH12:MI AM') AS "checkOutTime",
                status;
    `;
    const result = await db.query(updateSql, [id]);
    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Attendance record not found', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Check-out recorded in database');
  } catch (error) {
    next(error);
  }
});

export default router;
