import express from 'express';
import { fundController } from '../controllers/fundController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);

// Everyone can view team fund status? The user said "admin or manager complete select payment", but didn't specify who can view. Let's let all see, but only admin/manager can collect.
router.get('/', fundController.getTeamFundStatus);
router.post('/collect', authorize('SUPER_ADMIN', 'MANAGER'), fundController.collectFund);

export default router;
