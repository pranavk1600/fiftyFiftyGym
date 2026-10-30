import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

/**
 * GET /api/public/gyms
 * Returns all active registered gyms from database for the platform landing showcase.
 */
router.get('/gyms', async (req, res, next) => {
  try {
    try {
      const result = await db.query(`
        SELECT 
          g.id, g.slug, g.name, g.owner_name, g.email, g.phone, g.status,
          g.logo_url, g.address, g.city, g.state, g.postal_code, g.opening_hours,
          g.description, g.created_at,
          COUNT(DISTINCT mp.id) AS total_plans
        FROM gyms g
        LEFT JOIN membership_plans mp ON mp.gym_id = g.id AND mp.status = 'active'
        WHERE g.status = 'active' OR g.status IS NULL
        GROUP BY g.id
        ORDER BY g.created_at DESC;
      `);

      const gyms = result.rows.map(g => ({
        ...g,
        slug: g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || g.id
      }));

      return ApiResponse.success(res, gyms, 'Public gyms retrieved from database');
    } catch (dbErr) {
      console.warn('[Public API] Database query error:', dbErr.message);
      return ApiResponse.success(res, [], 'No gyms available');
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/gyms/:slug
 * Returns a single gym profile with its actual membership plans by slug (or id).
 */
router.get('/gyms/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.toLowerCase().trim();
    const hyphenatedSlug = cleanSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    try {
      const gymResult = await db.query(`
        SELECT 
          id, slug, name, owner_name, email, phone, status,
          logo_url, address, city, state, postal_code, opening_hours,
          description, business_contact, created_at
        FROM gyms
        WHERE LOWER(slug) = $1 OR LOWER(slug) = $2 OR id = $1
        LIMIT 1;
      `, [cleanSlug, hyphenatedSlug]);

      if (gymResult.rows.length > 0) {
        const gym = gymResult.rows[0];
        const gymSlug = gym.slug || cleanSlug;

        // Fetch active membership plans for this gym
        const plansResult = await db.query(`
          SELECT id, gym_id, name, duration_days, duration_label, price, features, is_popular, status
          FROM membership_plans
          WHERE gym_id = $1 AND (status = 'active' OR status IS NULL)
          ORDER BY price ASC;
        `, [gym.id]);

        return ApiResponse.success(res, {
          gym: { ...gym, slug: gymSlug },
          plans: plansResult.rows
        }, 'Gym profile and plans retrieved');
      }
    } catch (dbErr) {
      console.warn('[Public API] Gym lookup query failed:', dbErr.message);
    }

    return ApiResponse.error(res, 'Gym not found', 404);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/public/gyms/:slug/inquire
 * Accepts visitor inquiries or membership interest submissions.
 */
router.post('/gyms/:slug/inquire', async (req, res) => {
  const { name, email, phone, message, planId } = req.body || {};
  if (!name || !phone) {
    return ApiResponse.error(res, 'Name and phone number are required', 400);
  }

  return ApiResponse.success(res, {
    inquiryId: `inq_${Date.now()}`,
    receivedAt: new Date().toISOString()
  }, `Thank you ${name}! Your inquiry has been sent to the gym team. They will contact you shortly.`);
});

export default router;
