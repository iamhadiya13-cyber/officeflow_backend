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
router.post('/', authorize('SUPER_ADMIN', 'MANAGER', 'HR'), updateDailyDelivery);
router.delete('/:date', authorize('SUPER_ADMIN', 'MANAGER', 'HR'), deleteDailyDelivery);
router.post('/price', authorize('SUPER_ADMIN', 'MANAGER', 'HR'), updateDeliveryPrice);

export default router;
