import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

// Fallback in-memory store if DB is unconfigured
let fallbackMembers = [
  { id: 'MEM001', name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul.s@gmail.com', plan: 'Quarterly Pro', joinDate: '2026-01-15', status: 'active', visits: 28 },
  { id: 'MEM002', name: 'Ananya Roy', phone: '+91 98111 22334', email: 'ananya.roy@yahoo.com', plan: 'Annual Gold Elite', joinDate: '2025-11-01', status: 'active', visits: 54 },
  { id: 'MEM003', name: 'Vikram Singh', phone: '+91 98333 44556', email: 'vikram.singh@outlook.com', plan: 'Monthly Standard', joinDate: '2026-02-10', status: 'expired', visits: 12 },
  { id: 'MEM004', name: 'Priya Patel', phone: '+91 98444 55667', email: 'priya.patel@gmail.com', plan: 'Annual Gold Elite', joinDate: '2025-08-20', status: 'active', visits: 72 },
  { id: 'MEM005', name: 'Karan Mehra', phone: '+91 98555 66778', email: 'karan.mehra@gmail.com', plan: 'Monthly Standard', joinDate: '2026-03-01', status: 'active', visits: 16 }
];

// GET /api/members
router.get('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';
    const { search, status } = req.query;

    try {
      let queryText = 'SELECT id, full_name AS name, phone, email, current_plan_name AS plan, join_date AS "joinDate", status, total_visits AS visits FROM members WHERE gym_id = $1';
      const params = [gymId];

      if (status && status !== 'ALL') {
        params.push(status.toLowerCase());
        queryText += ` AND status = $${params.length}`;
      }

      if (search) {
        params.push(`%${search}%`);
        queryText += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR id ILIKE $${params.length})`;
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await db.query(queryText, params);
      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows, 'Members retrieved from database');
      }
    } catch (_dbErr) {
      // DB unconfigured; proceed to fallback
    }

    let filtered = [...fallbackMembers];
    if (search) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search) ||
        m.id.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter((m) => m.status.toUpperCase() === status.toUpperCase());
    }

    return ApiResponse.success(res, filtered, 'Members retrieved');
  } catch (error) {
    next(error);
  }
});

// POST /api/members
router.post('/', async (req, res, next) => {
  try {
    const gymId = req.headers['x-gym-id'] || 'gym_alpha_1';
    const { name, phone, email, plan, joinDate, status } = req.body;

    if (!name || !phone) {
      return ApiResponse.error(res, 'Name and phone are required', 400);
    }

    const memberId = `MEM00${Date.now().toString().slice(-3)}`;

    try {
      const insertSql = `
        INSERT INTO members (id, gym_id, full_name, phone, email, current_plan_name, join_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, full_name AS name, phone, email, current_plan_name AS plan, join_date AS "joinDate", status;
      `;
      const result = await db.query(insertSql, [
        memberId,
        gymId,
        name,
        phone,
        email || null,
        plan || 'Quarterly Pro',
        joinDate || new Date(),
        status || 'active'
      ]);

      return ApiResponse.success(res, result.rows[0], 'Member created successfully in database', 201);
    } catch (_dbErr) {
      // DB unconfigured; update in-memory
      const created = {
        id: memberId,
        name,
        phone,
        email: email || '',
        plan: plan || 'Quarterly Pro',
        joinDate: joinDate || new Date().toISOString().split('T')[0],
        status: status || 'active',
        visits: 0
      };
      fallbackMembers = [created, ...fallbackMembers];
      return ApiResponse.success(res, created, 'Member registered successfully', 201);
    }
  } catch (error) {
    next(error);
  }
});

// PUT /api/members/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, plan, status } = req.body;

    try {
      const updateSql = `
        UPDATE members 
        SET full_name = COALESCE($1, full_name),
            phone = COALESCE($2, phone),
            email = COALESCE($3, email),
            current_plan_name = COALESCE($4, current_plan_name),
            status = COALESCE($5, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, full_name AS name, phone, email, current_plan_name AS plan, status;
      `;
      const result = await db.query(updateSql, [name, phone, email, plan, status, id]);
      if (result.rows.length > 0) {
        return ApiResponse.success(res, result.rows[0], 'Member updated in database');
      }
    } catch (_dbErr) {
      // DB unconfigured; update in-memory
    }

    fallbackMembers = fallbackMembers.map((m) =>
      m.id === id ? { ...m, ...req.body } : m
    );

    const updated = fallbackMembers.find((m) => m.id === id);
    return ApiResponse.success(res, updated, 'Member updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      await db.query('DELETE FROM members WHERE id = $1', [id]);
    } catch (_dbErr) {
      // DB unconfigured; delete from fallback
    }

    fallbackMembers = fallbackMembers.filter((m) => m.id !== id);
    return ApiResponse.success(res, { id }, 'Member deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
