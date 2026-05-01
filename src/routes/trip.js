import express from 'express';
import { tripController } from '../controllers/tripController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();
router.use(authenticate);

router.get('/', tripController.getAll);
router.post('/', tripController.create);
router.get('/:id', tripController.getOne);
router.put('/:id', tripController.update);
router.delete('/:id', tripController.cancel);
router.put('/:id/review', authorize('SUPER_ADMIN','MANAGER'), tripController.review);
router.put('/:id/complete', authorize('SUPER_ADMIN','MANAGER'), tripController.complete);
router.get('/:id/expenses', tripController.getExpenses);

export default router;
