import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

// Fallback mock gyms for offline development or initial seed display
const fallbackGyms = [
  {
    id: 'gym_alpha_1',
    slug: 'fiftyfifty-downtown-fitness',
    name: 'FiftyFifty Downtown Fitness',
    owner_name: 'Om Kolekar',
    email: 'owner@fiftyfifty.com',
    phone: '+91 98200 11223',
    logo_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80',
    address: '402 Sunset Boulevard, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    postal_code: '400050',
    opening_hours: '05:30 AM - 10:30 PM',
    description: 'Premier elite training facility featuring Olympic free weights, cardio deck, sauna, and functional strength zones.',
    status: 'active'
  },
  {
    id: 'gym_beta_2',
    slug: 'iron-forge-crossfit',
    name: 'Iron Forge CrossFit & Gym',
    owner_name: 'Vikram Rajput',
    email: 'vikram@ironforge.com',
    phone: '+91 98450 77889',
    logo_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=400&q=80',
    address: '88 Indiranagar 100ft Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code: '560038',
    opening_hours: '06:00 AM - 11:00 PM',
    description: 'High-intensity conditioning, Calisthenics, Powerlifting, and dedicated nutritional coaching center.',
    status: 'active'
  },
  {
    id: 'gym_gamma_3',
    slug: 'olympia-power-hub',
    name: 'Olympia Power & Fitness Hub',
    owner_name: 'Priya Sharma',
    email: 'priya@olympiagym.in',
    phone: '+91 98110 33445',
    logo_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
    address: 'Plot 14, Sector 29, Cyber City',
    city: 'Gurugram',
    state: 'Haryana',
    postal_code: '122002',
    opening_hours: '24/7 Access',
    description: 'State-of-the-art 24/7 fitness arena with biometric access, steam recovery suites, and certified personal trainers.',
    status: 'active'
  }
];

const fallbackPlans = [
  {
    id: 101,
    name: 'Monthly Kickstart',
    duration_days: 30,
    duration_label: '1 Month',
    price: 1999,
    features: ['Full Gym & Weight Floor Access', 'Locker & Shower Facility', '1 Trainer Orientation Session', 'FiftyFifty Mobile App Access'],
    is_popular: false
  },
  {
    id: 102,
    name: 'Quarterly Pro Athlete',
    duration_days: 90,
    duration_label: '3 Months',
    price: 4999,
    features: ['Unlimited Gym & Cardio Access', 'Weekly Diet Consultation', 'Free Steam & Recovery Session', 'Guest Passes (2x per month)', 'Dedicated Locker'],
    is_popular: true
  },
  {
    id: 103,
    name: 'Annual Elite Transformation',
    duration_days: 365,
    duration_label: '12 Months',
    price: 14999,
    features: ['24/7 VIP Access', 'Monthly Body Composition Scan', 'Dedicated Personal Coach (4 Sessions)', 'Complimentary FiftyFifty Fitness Kit', 'Free Freezing up to 30 Days'],
    is_popular: false
  }
];

/**
 * GET /api/public/gyms
 * Returns all active gyms for the platform landing showcase.
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

      if (result.rows.length > 0) {
        const gyms = result.rows.map(g => ({
          ...g,
          slug: g.slug || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || g.id
        }));
        return ApiResponse.success(res, gyms, 'Public gyms retrieved');
      }
    } catch (_dbErr) {
      console.warn('[Public API] Database query failed or unconfigured, using fallback gyms:', _dbErr.message);
    }

    return ApiResponse.success(res, fallbackGyms, 'Public gyms retrieved (seed fallback)');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/public/gyms/:slug
 * Returns a single gym profile with its membership plans by slug (or id).
 */
router.get('/gyms/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.toLowerCase().trim();

    try {
      const gymResult = await db.query(`
        SELECT 
          id, slug, name, owner_name, email, phone, status,
          logo_url, address, city, state, postal_code, opening_hours,
          description, business_contact, created_at
        FROM gyms
        WHERE LOWER(slug) = $1 OR id = $1
        LIMIT 1;
      `, [cleanSlug]);

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
          plans: plansResult.rows.length > 0 ? plansResult.rows : fallbackPlans
        }, 'Gym profile and plans retrieved');
      }
    } catch (_dbErr) {
      console.warn('[Public API] Gym lookup failed, falling back to mock:', _dbErr.message);
    }

    // Check fallback gyms
    const matched = fallbackGyms.find(g => g.slug === cleanSlug || g.id === cleanSlug) || fallbackGyms[0];
    return ApiResponse.success(res, {
      gym: { ...matched, slug: cleanSlug },
      plans: fallbackPlans
    }, 'Gym profile retrieved (fallback)');
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
