import { Router } from 'express';
import { ApiResponse } from '../utils/apiResponse.js';
import { checkDatabaseHealth } from '../config/db.js';

import authRoutes from './auth.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import membersRoutes from './members.routes.js';
import plansRoutes from './plans.routes.js';
import attendanceRoutes from './attendance.routes.js';
import paymentsRoutes from './payments.routes.js';
import notificationsRoutes from './notifications.routes.js';
import adminRoutes from './admin.routes.js';
import publicRoutes from './public.routes.js';
import gymsRoutes from './gyms.routes.js';
import receiptsRoutes from './receipts.routes.js';

const router = Router();

// Health check endpoint with safe database probe
router.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  return ApiResponse.success(res, {
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
    timestamp: new Date().toISOString()
  }, 'FiftyFifty Gym API is operating normally');
});

// Mount module routers
router.use('/public', publicRoutes);
router.use('/gyms', gymsRoutes);
router.use('/auth', authRoutes);
router.use('/owner', dashboardRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/members', membersRoutes);
router.use('/plans', plansRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/payments', paymentsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/admin', adminRoutes);
router.use('/receipts', receiptsRoutes);

export default router;
