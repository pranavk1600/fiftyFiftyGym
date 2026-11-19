import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

/**
 * GET /api/gyms/slug/:slug
 * Public endpoint to fetch gym branding and profile by unique slug.
 * Returns 404 if no matching gym is found.
 */
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!slug || !slug.trim()) {
      return ApiResponse.error(res, 'Gym slug is required', 400);
    }

    const cleanSlug = slug.toLowerCase().trim();
    const hyphenatedSlug = cleanSlug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    try {
      const result = await db.query(`
        SELECT 
          id, slug, name, owner_name, email, phone, status,
          logo_url, address, city, state, postal_code, opening_hours,
          description, business_contact, created_at
        FROM gyms
        WHERE LOWER(slug) = $1 OR LOWER(slug) = $2 OR id = $1
        LIMIT 1;
      `, [cleanSlug, hyphenatedSlug]);

      if (result.rows.length === 0) {
        // Fallback for default demo gym if not found in database
        if (cleanSlug === '5050-fitness-club' || hyphenatedSlug === '5050-fitness-club') {
          return ApiResponse.success(res, {
            id: 'gym-5050-fitness-club',
            name: '5050 Fitness Club',
            slug: '5050-fitness-club',
            owner_name: 'Gym Administrator',
            email: 'owner@pranavfitness.com',
            phone: '+91 98765 43210',
            status: 'active',
            opening_hours: '06:00 AM - 10:00 PM',
            description: 'Welcome to 5050 Fitness Club',
            created_at: new Date().toISOString()
          }, 'Gym details retrieved successfully (default)');
        }
        return ApiResponse.error(res, `Gym with slug "${cleanSlug}" was not found`, 404);
      }

      const gym = result.rows[0];

      // Sanitize and return public profile
      return ApiResponse.success(res, {
        id: gym.id,
        name: gym.name,
        slug: gym.slug || cleanSlug,
        owner_name: gym.owner_name,
        email: gym.email,
        phone: gym.phone,
        logo_url: gym.logo_url,
        address: gym.address,
        city: gym.city,
        state: gym.state,
        postal_code: gym.postal_code,
        opening_hours: gym.opening_hours,
        description: gym.description,
        status: gym.status,
        created_at: gym.created_at
      }, 'Gym details retrieved successfully');
    } catch (dbErr) {
      console.warn('[Gyms API] Database query error:', dbErr.message);
      // Graceful fallback for the flagship default gym if database is paused / offline
      if (cleanSlug === '5050-fitness-club' || hyphenatedSlug === '5050-fitness-club') {
        return ApiResponse.success(res, {
          id: 'gym-5050-fitness-club',
          name: '5050 Fitness Club',
          slug: '5050-fitness-club',
          owner_name: 'Gym Administrator',
          email: 'owner@pranavfitness.com',
          phone: '+91 98765 43210',
          status: 'active',
          opening_hours: '06:00 AM - 10:00 PM',
          description: 'Welcome to 5050 Fitness Club',
          created_at: new Date().toISOString()
        }, 'Gym details retrieved successfully (offline fallback)');
      }
      return ApiResponse.error(res, 'Database temporarily unavailable: ' + dbErr.message, 503);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gyms/:id
 * Public endpoint to fetch gym by ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim();

    const result = await db.query(`
      SELECT 
        id, slug, name, owner_name, email, phone, status,
        logo_url, address, city, state, postal_code, opening_hours,
        description, business_contact, created_at
      FROM gyms
      WHERE id = $1 OR LOWER(slug) = LOWER($1)
      LIMIT 1;
    `, [cleanId]);

    if (result.rows.length === 0) {
      return ApiResponse.error(res, 'Gym not found', 404);
    }

    const gym = result.rows[0];
    return ApiResponse.success(res, gym, 'Gym details retrieved');
  } catch (error) {
    next(error);
  }
});

export default router;
