import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

let fallbackPlans = [
  {
    id: 1,
    name: 'Monthly Standard',
    duration: '30 Days',
    durationDays: 30,
    price: 1800,
    activeSubscribers: 48,
    status: 'active',
    features: ['Full gym equipment access', 'Locker facilities', 'General trainer assistance']
  },
  {
    id: 2,
    name: 'Quarterly Pro',
    duration: '90 Days',
    durationDays: 90,
    price: 4500,
    activeSubscribers: 62,
    status: 'active',
    isPopular: true,
    features: ['Full gym equipment access', '1 Diet Consultation', 'Free Steam Bath (2/mo)', 'Body composition analysis']
  },
  {
    id: 3,
    name: 'Annual Gold Elite',
    duration: '365 Days',
    durationDays: 365,
    price: 14000,
    activeSubscribers: 22,
    status: 'active',
    features: ['Unlimited all-hours access', 'Monthly diet reviews', 'Free gym kit & shaker', 'Guest pass x 4']
  }
];

// GET /api/plans
router.get('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';

    try {
      const result = await db.query(`
        SELECT p.id, p.name, p.duration_label AS duration, p.duration_days AS "durationDays", 
               p.price, p.features, p.is_popular AS "isPopular", p.status,
               COALESCE((SELECT COUNT(*) FROM members m WHERE m.current_plan_id = p.id AND m.status = 'active'), 0) AS "activeSubscribers"
        FROM membership_plans p
        WHERE p.gym_id = $1
        ORDER BY p.price ASC
      `, [gymId]);

      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows, 'Plans retrieved from database');
      }
    } catch (_dbErr) {
      // DB unconfigured; return fallback
    }

    return ApiResponse.success(res, fallbackPlans, 'Plans retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/plans
router.post('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';
    const { name, durationDays, price, features, status } = req.body;

    if (!name || !price) {
      return ApiResponse.error(res, 'Plan name and price are required', 400);
    }

    try {
      const insertSql = `
        INSERT INTO membership_plans (gym_id, name, duration_days, duration_label, price, features, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, duration_label AS duration, duration_days AS "durationDays", price, features, status;
      `;
      const result = await db.query(insertSql, [
        gymId,
        name,
        durationDays || 30,
        `${durationDays || 30} Days`,
        price,
        features || [],
        status || 'active'
      ]);

      return ApiResponse.success(res, result.rows[0], 'Plan created in database', 201);
    } catch (_dbErr) {
      const created = {
        id: Date.now(),
        name,
        duration: `${durationDays || 30} Days`,
        durationDays: Number(durationDays || 30),
        price: Number(price),
        features: features || [],
        status: status || 'active',
        activeSubscribers: 0
      };
      fallbackPlans.push(created);
      return ApiResponse.success(res, created, 'Plan created successfully', 201);
    }
  } catch (error) {
    next(error);
  }
});

// PUT /api/plans/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, duration, status } = req.body;

    try {
      const updateSql = `
        UPDATE membership_plans
        SET name = COALESCE($1, name),
            price = COALESCE($2, price),
            duration_label = COALESCE($3, duration_label),
            status = COALESCE($4, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, name, price, duration_label AS duration, status;
      `;
      const result = await db.query(updateSql, [name, price, duration, status, id]);
      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows[0], 'Plan updated in database');
      }
    } catch (_dbErr) {
      // DB unconfigured; update fallback
    }

    fallbackPlans = fallbackPlans.map((p) =>
      p.id === Number(id) ? { ...p, ...req.body } : p
    );

    const updated = fallbackPlans.find((p) => p.id === Number(id));
    return ApiResponse.success(res, updated, 'Plan updated successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
