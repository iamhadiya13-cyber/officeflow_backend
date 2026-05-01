import express from 'express';
import { exportController } from '../controllers/exportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/expenses/excel', exportController.exportExpenses);
router.get('/leave/excel', exportController.exportLeave);
router.get('/trips/excel', exportController.exportTrips);

export default router;
