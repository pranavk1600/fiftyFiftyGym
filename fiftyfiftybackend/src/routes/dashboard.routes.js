import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { optionalAuthenticate } from '../middlewares/auth.middleware.js';
import { enforceGymIsolation } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(optionalAuthenticate, enforceGymIsolation);

const getDashboardData = async (req, res, next) => {
  try {
    let gymId = req.gymId || req.user?.gymId || req.headers['x-gym-id'];

    if (!gymId) {
      try {
        const primaryGym = await db.query('SELECT id FROM gyms ORDER BY created_at ASC LIMIT 1');
        if (primaryGym.rows.length > 0) {
          gymId = primaryGym.rows[0].id;
        }
      } catch (_e) {
        // DB not available
      }
    }

    const defaultStats = {
      totalMembers: 0,
      activeMembers: 0,
      expiredMembers: 0,
      todayAttendance: 0,
      monthlyCollections: 0,
      expiringSoonCount: 0
    };

    // Calculate last 7 calendar days template
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyAttendanceData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayIndex = d.getDay();
      weeklyAttendanceData.push({
        date: d.toISOString().split('T')[0],
        day: dayNames[dayIndex],
        fullDay: fullDayNames[dayIndex],
        count: 0
      });
    }

    if (!gymId) {
      return ApiResponse.success(res, {
        stats: defaultStats,
        recentCheckIns: [],
        expiringMemberships: [],
        weeklyAttendanceData,
        gymId: null
      }, 'Dashboard statistics retrieved (clean system)');
    }

    try {
      // 1. KPI Counts
      const statsRes = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM members WHERE gym_id = $1) AS total_members,
          (SELECT COUNT(*) FROM members WHERE gym_id = $1 AND status = 'active') AS active_members,
          (SELECT COUNT(*) FROM members WHERE gym_id = $1 AND status = 'expired') AS expired_members,
          (SELECT COUNT(*) FROM attendance WHERE gym_id = $1 AND date = CURRENT_DATE) AS today_attendance,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE gym_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)) AS monthly_collections,
          (SELECT COUNT(*) FROM members WHERE gym_id = $1 AND expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')) AS expiring_soon_count
      `, [gymId]);

      // 2. Recent Check-ins for Today
      const checkinsRes = await db.query(`
        SELECT id, member_name AS name, TO_CHAR(check_in_time, 'HH24:MI') AS time, plan_name AS plan, status
        FROM attendance 
        WHERE gym_id = $1 AND date = CURRENT_DATE 
        ORDER BY check_in_time DESC 
        LIMIT 5
      `, [gymId]);

      // 3. Expiring Memberships in next 7 days
      const expiringRes = await db.query(`
        SELECT id, full_name AS name, phone, current_plan_name AS plan,
               (expiry_date - CURRENT_DATE) AS "daysLeft"
        FROM members
        WHERE gym_id = $1 AND expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
        ORDER BY expiry_date ASC
        LIMIT 5
      `, [gymId]);

      // 4. Weekly Attendance aggregation
      const weekRes = await db.query(`
        SELECT date::text AS date_str, COUNT(*) AS count
        FROM attendance
        WHERE gym_id = $1 AND date >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY date
      `, [gymId]);

      const countsByDate = {};
      for (const row of weekRes.rows) {
        countsByDate[row.date_str] = parseInt(row.count, 10);
      }

      for (const item of weeklyAttendanceData) {
        if (countsByDate[item.date]) {
          item.count = countsByDate[item.date];
        }
      }

      const row = statsRes.rows[0] || {};
      const stats = {
        totalMembers: parseInt(row.total_members || '0', 10),
        activeMembers: parseInt(row.active_members || '0', 10),
        expiredMembers: parseInt(row.expired_members || '0', 10),
        todayAttendance: parseInt(row.today_attendance || '0', 10),
        monthlyCollections: parseFloat(row.monthly_collections || '0'),
        expiringSoonCount: parseInt(row.expiring_soon_count || '0', 10)
      };

      const recentCheckIns = checkinsRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        time: r.time,
        plan: r.plan,
        status: r.status === 'IN_GYM' ? 'active' : 'info'
      }));

      const expiringMemberships = expiringRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        plan: r.plan,
        daysLeft: parseInt(r.daysLeft || '0', 10),
        isUrgent: parseInt(r.daysLeft || '0', 10) <= 2
      }));

      return ApiResponse.success(res, {
        stats,
        recentCheckIns,
        expiringMemberships,
        weeklyAttendanceData,
        gymId
      }, 'Dashboard statistics retrieved from database');
    } catch (err) {
      console.error('[Dashboard Query Error]:', err.message);
      return ApiResponse.success(res, {
        stats: defaultStats,
        recentCheckIns: [],
        expiringMemberships: [],
        weeklyAttendanceData,
        gymId
      }, 'Empty dashboard statistics retrieved');
    }
  } catch (error) {
    next(error);
  }
};

router.get('/', getDashboardData);
router.get('/dashboard', getDashboardData);

export default router;
