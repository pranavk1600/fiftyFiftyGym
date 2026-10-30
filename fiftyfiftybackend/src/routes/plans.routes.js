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

// GET /api/plans
router.get('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);

    if (!gymId) {
      return ApiResponse.success(res, [], 'No plans found');
    }

    try {
      const result = await db.query(`
        SELECT p.id, p.name, p.duration_label AS duration, p.duration_days AS "durationDays", 
               p.price, p.features, p.is_popular AS "isPopular", p.status,
               COALESCE((SELECT COUNT(*) FROM members m WHERE m.current_plan_id = p.id AND m.status = 'active'), 0) AS "activeSubscribers"
        FROM membership_plans p
        WHERE p.gym_id = $1
        ORDER BY p.price ASC
      `, [gymId]);

      return ApiResponse.success(res, result.rows, 'Plans retrieved from database');
    } catch (err) {
      console.error('[Plans Query Error]:', err.message);
      return ApiResponse.success(res, [], 'No plans found');
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/plans
router.post('/', async (req, res, next) => {
  try {
    const gymId = await resolveGymId(req);
    const { name, durationDays, price, features, status, isPopular } = req.body || {};

    if (!name || !name.trim() || !price) {
      return ApiResponse.error(res, 'Plan name and price are required', 400);
    }

    if (!gymId) {
      return ApiResponse.error(res, 'No gym assigned to create plan', 400);
    }

    const durationVal = parseInt(durationDays || '30', 10);
    const durationLabel = `${durationVal} Days`;
    const planFeatures = Array.isArray(features) ? features : (features ? [features] : []);

    const insertSql = `
      INSERT INTO membership_plans (gym_id, name, duration_days, duration_label, price, features, is_popular, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, duration_label AS duration, duration_days AS "durationDays", price, features, is_popular AS "isPopular", status;
    `;
    const result = await db.query(insertSql, [
      gymId,
      name.trim(),
      durationVal,
      durationLabel,
      parseFloat(price),
      planFeatures,
      Boolean(isPopular),
      status || 'active'
    ]);

    const created = {
      ...result.rows[0],
      activeSubscribers: 0
    };

    return ApiResponse.success(res, created, 'Plan created successfully', 201);
  } catch (error) {
    next(error);
  }
});

// PUT /api/plans/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, durationDays, price, features, status, isPopular } = req.body || {};

    const durationVal = durationDays ? parseInt(durationDays, 10) : undefined;
    const durationLabel = durationVal ? `${durationVal} Days` : undefined;

    const updateSql = `
      UPDATE membership_plans
      SET name = COALESCE($1, name),
          duration_days = COALESCE($2, duration_days),
          duration_label = COALESCE($3, duration_label),
          price = COALESCE($4, price),
          features = COALESCE($5, features),
          is_popular = COALESCE($6, is_popular),
          status = COALESCE($7, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, name, duration_label AS duration, duration_days AS "durationDays", price, features, is_popular AS "isPopular", status;
    `;

    const result = await db.query(updateSql, [
      name ? name.trim() : null,
      durationVal || null,
      durationLabel || null,
      price ? parseFloat(price) : null,
      features || null,
      isPopular !== undefined ? Boolean(isPopular) : null,
      status || null,
      id
    ]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Plan not found', 404);
    }

    return ApiResponse.success(res, result.rows[0], 'Plan updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/plans/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM membership_plans WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Plan not found', 404);
    }

    return ApiResponse.success(res, { id }, 'Plan deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
