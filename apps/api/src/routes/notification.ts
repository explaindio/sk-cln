import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { validateNotificationPreferences, validateNotificationHistory, validateArchiveNotifications } from '../middleware/validation';

const router = Router();
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);

router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', validateNotificationPreferences, notificationController.updatePreferences);

router.post('/push-subscribe', notificationController.subscribePush);
router.post('/push-unsubscribe', notificationController.unsubscribePush);

// Add this route, protected by an admin middleware
router.post('/test', requireAdmin, notificationController.sendTestNotification);

// Notification history and archiving
router.get('/history', validateNotificationHistory, notificationController.getNotificationHistory);
router.post('/archive', validateArchiveNotifications, notificationController.archiveOldNotifications);
router.get('/archived', validateNotificationHistory, notificationController.getArchivedNotifications);

export default router;