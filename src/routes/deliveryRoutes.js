import express from 'express';
import {
  getDeliveriesByMonth,
  updateDailyDelivery,
  deleteDailyDelivery,
  updateDeliveryPrice
} from '../controllers/deliveryController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getDeliveriesByMonth);
router.post('/', authorize('MANAGER', 'SUPER_ADMIN'), updateDailyDelivery);
router.delete('/:date', authorize('MANAGER', 'SUPER_ADMIN'), deleteDailyDelivery);
router.post('/price', authorize('MANAGER', 'SUPER_ADMIN'), updateDeliveryPrice);

export default router;
