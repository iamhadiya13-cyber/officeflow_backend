import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);

router.get('/all', userController.getAll);
router.get('/', userController.getAll);
router.post('/', userController.create);
// Accessible to all roles — used for employee dropdowns in filters/modals
router.get('/employees', userController.getEmployeeList);
router.get('/:id', userController.getOne);
router.put('/:id', userController.update);
router.delete('/:id', userController.deactivate);
router.post('/invite', authorize('SUPER_ADMIN'), userController.invite);
router.get('/invites', authorize('SUPER_ADMIN'), userController.getInvites);
router.delete('/invites/:id', authorize('SUPER_ADMIN'), userController.cancelInvite);
router.post('/invites/:id/resend', authorize('SUPER_ADMIN'), userController.resendInvite);
router.put('/:id/reset-password', authorize('SUPER_ADMIN'), userController.resetPassword);
router.put('/:id/extra-leaves', authorize('SUPER_ADMIN', 'MANAGER'), userController.addExtraLeaves);

export default router;
