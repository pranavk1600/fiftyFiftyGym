import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

let fallbackAttendance = [
  { id: 1, memberName: 'Rahul Sharma', phone: '+91 98765 43210', checkInTime: '07:15 AM', checkOutTime: null, plan: 'Quarterly Pro', status: 'IN_GYM' },
  { id: 2, memberName: 'Ananya Roy', phone: '+91 98111 22334', checkInTime: '07:45 AM', checkOutTime: '08:50 AM', plan: 'Annual Gold Elite', status: 'COMPLETED' },
  { id: 3, memberName: 'Vikram Singh', phone: '+91 98333 44556', checkInTime: '08:20 AM', checkOutTime: null, plan: 'Monthly Standard', status: 'IN_GYM' },
  { id: 4, memberName: 'Priya Patel', phone: '+91 98444 55667', checkInTime: '09:05 AM', checkOutTime: '10:15 AM', plan: 'Annual Gold Elite', status: 'COMPLETED' },
  { id: 5, memberName: 'Karan Mehra', phone: '+91 98555 66778', checkInTime: '09:30 AM', checkOutTime: null, plan: 'Monthly Standard', status: 'IN_GYM' }
];

// GET /api/attendance
router.get('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';

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

      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows, 'Attendance retrieved from database');
      }
    } catch (_dbErr) {
      // DB unconfigured; return fallback
    }

    return ApiResponse.success(res, fallbackAttendance, 'Attendance retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/check-in
router.post('/check-in', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';
    const { memberName, phone, plan } = req.body;

    if (!memberName) {
      return ApiResponse.error(res, 'Member name is required', 400);
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const insertSql = `
        INSERT INTO attendance (gym_id, member_id, member_name, phone, plan_name, check_in_time, status, date)
        VALUES ($1, 'MEM001', $2, $3, $4, CURRENT_TIMESTAMP, 'IN_GYM', CURRENT_DATE)
        RETURNING id, member_name AS "memberName", phone, plan_name AS plan,
                  TO_CHAR(check_in_time, 'HH12:MI AM') AS "checkInTime", status;
      `;
      const result = await db.query(insertSql, [gymId, memberName, phone || '+91 98000 12345', plan || 'Active Member']);
      return ApiResponse.success(res, result.rows[0], 'Check-in recorded in database', 201);
    } catch (_dbErr) {
      const newLog = {
        id: Date.now(),
        memberName,
        phone: phone || '+91 98000 12345',
        checkInTime: timeStr,
        checkOutTime: null,
        plan: plan || 'Active Member',
        status: 'IN_GYM'
      };
      fallbackAttendance = [newLog, ...fallbackAttendance];
      return ApiResponse.success(res, newLog, 'Check-in recorded successfully', 201);
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/attendance/check-out
router.post('/check-out', async (req, res, next) => {
  try {
    const { id } = req.body;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const updateSql = `
        UPDATE attendance
        SET check_out_time = CURRENT_TIMESTAMP,
            status = 'COMPLETED'
        WHERE id = $1
        RETURNING id, member_name AS "memberName", TO_CHAR(check_out_time, 'HH12:MI AM') AS "checkOutTime", status;
      `;
      const result = await db.query(updateSql, [id]);
      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows[0], 'Check-out recorded in database');
      }
    } catch (_dbErr) {
      // DB unconfigured; update fallback
    }

    fallbackAttendance = fallbackAttendance.map((log) =>
      log.id === Number(id) ? { ...log, checkOutTime: timeNow, status: 'COMPLETED' } : log
    );

    return ApiResponse.success(res, { id, checkOutTime: timeNow, status: 'COMPLETED' }, 'Check-out recorded');
  } catch (error) {
    next(error);
  }
});

export default router;
