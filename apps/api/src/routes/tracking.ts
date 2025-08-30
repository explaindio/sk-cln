import { Router } from 'express';
import * as trackingController from '../controllers/trackingController';

const router = Router();
router.get('/notifications/:id/open.gif', trackingController.trackNotificationOpen);
router.get('/notifications/:id/click', trackingController.trackNotificationClick);
export default router;