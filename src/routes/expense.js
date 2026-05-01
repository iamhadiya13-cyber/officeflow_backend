import express from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);
router.get('/settle-preview', expenseController.settlePreview);
router.get('/summary', expenseController.getSummary);
router.get('/person-summary', expenseController.getPersonSummary);
router.get('/settlement-employees', authorize('SUPER_ADMIN','MANAGER'), expenseController.getSettlementEmployees);
router.get('/settlements', authorize('SUPER_ADMIN','MANAGER'), expenseController.getSettlements);
router.get('/archived', authorize('SUPER_ADMIN'), expenseController.getArchived);

router.get('/', expenseController.getAll);
router.post('/', expenseController.create);
router.get('/:id', expenseController.getOne);
router.put('/:id', expenseController.update);
router.put('/:id/settle', authorize('SUPER_ADMIN','MANAGER'), expenseController.toggleSettle);
router.put('/:id/archive', expenseController.archive);
router.put('/:id/restore', authorize('SUPER_ADMIN'), expenseController.restore);
// Accessible to all (restricted by scoped database filters)
router.post('/settle-month', expenseController.settleMonth);
router.patch('/settlements/batch', expenseController.batchSettle);

export default router;
