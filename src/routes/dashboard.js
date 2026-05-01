import express from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.get('/stats', authenticate, dashboardController.getStats);
router.get('/all-stats', authenticate, authorize('SUPER_ADMIN', 'MANAGER'), dashboardController.getAllStats);
router.get('/all-leave', authenticate, authorize('SUPER_ADMIN', 'MANAGER'), dashboardController.getAllLeave);
router.get('/all-expense-trend', authenticate, authorize('SUPER_ADMIN', 'MANAGER'), dashboardController.getAllExpenseTrend);

export default router;
