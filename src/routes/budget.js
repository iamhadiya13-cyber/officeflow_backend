import express from 'express';
import { budgetController } from '../controllers/budgetController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);

// Current quarter budget + personal usage (all roles)
router.get('/current', budgetController.getCurrent);

// Set monthly budget amount (Super Admin only)
router.post('/set', authorize('SUPER_ADMIN'), budgetController.setBudget);

// Budget page usage breakdown
router.get('/quarterly/usage', budgetController.getUsage);
router.get('/quarterly/current', budgetController.getCurrent);
router.get('/quarterly', budgetController.getQuarterly);
router.post('/quarterly', authorize('SUPER_ADMIN', 'MANAGER'), budgetController.setBudget);

// History
router.get('/history', budgetController.getHistory);

// Fund endpoints
router.get('/fund', authorize('SUPER_ADMIN', 'MANAGER'), budgetController.getFund);
router.post('/fund/adjust', authorize('SUPER_ADMIN'), budgetController.adjustFund);
router.get('/fund/adjustments', authorize('SUPER_ADMIN'), budgetController.getFundAdjustments);

export default router;
