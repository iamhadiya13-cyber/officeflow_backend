import express from 'express';
import { leaveController } from '../controllers/leaveController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);

router.get('/types', leaveController.getTypes);
router.get('/balances', leaveController.getUserBalance);
router.get('/balances/me', leaveController.getMyBalance);
router.get('/balances/:userId', authorize('SUPER_ADMIN','MANAGER'), leaveController.getUserBalance);
router.put('/balance/:userId/extra', authorize('SUPER_ADMIN'), leaveController.addExtraLeaves);
router.put('/balance/:userId/adjust', authorize('SUPER_ADMIN'), leaveController.adjustExtraLeaves);
router.put('/balances/bulk-extra', authorize('SUPER_ADMIN'), leaveController.addExtraLeavesBulk);
router.get('/requests', leaveController.getRequests);
router.post('/requests', leaveController.createRequest);
router.get('/requests/:id', leaveController.getOne);
router.delete('/requests/:id', leaveController.deleteRequest);
router.put('/requests/:id/review', authorize('SUPER_ADMIN','MANAGER'), leaveController.review);
router.get('/other-requests', leaveController.getOtherRequests);
router.post('/other-requests', leaveController.createOtherRequest);
router.put('/other-requests/:id/review', authorize('SUPER_ADMIN','MANAGER'), leaveController.reviewOther);

export default router;
