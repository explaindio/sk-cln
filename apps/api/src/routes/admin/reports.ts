// skool-clone/apps/api/src/routes/admin/reports.ts
import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { requirePermission } from '../../middleware/admin';
import { reportManagementController } from '../../controllers/admin/reportManagementController';

// Validation helpers
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateReportSearch = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('targetType').optional().isIn(['post', 'comment', 'user', 'message']).withMessage('Invalid target type'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('status').optional().isIn(['pending', 'approved', 'dismissed', 'escalated']).withMessage('Invalid status'),
  handleValidationErrors,
];

const validateReviewReport = [
  body('decision').isIn(['approve', 'dismiss', 'escalate']).withMessage('Decision must be approve, dismiss, or escalate'),
  body('resolution').optional().isLength({ min: 1, max: 1000 }).withMessage('Resolution must be 1-1000 characters'),
  body('moderationAction').optional().isIn(['ban_user', 'delete_content', 'hide_content']).withMessage('Invalid moderation action'),
  body('actionParams').optional().isObject().withMessage('Action params must be an object'),
  handleValidationErrors,
];

const validateBulkReview = [
  body('reportIds').isArray({ min: 1, max: 50 }).withMessage('reportIds must be array with 1-50 items'),
  body('reportIds.*').isUUID().withMessage('Each report ID must be a valid UUID'),
  body('decision').isIn(['approve', 'dismiss', 'escalate']).withMessage('Decision must be approve, dismiss, or escalate'),
  body('resolution').optional().isLength({ min: 1, max: 1000 }).withMessage('Resolution must be 1-1000 characters'),
  body('moderationAction').optional().isIn(['ban_user', 'delete_content', 'hide_content']).withMessage('Invalid moderation action'),
  handleValidationErrors,
];

const validateQuickAction = [
  body('targetType').isIn(['post', 'comment', 'user', 'message']).withMessage('Invalid target type'),
  body('targetId').isUUID().withMessage('Valid target ID required'),
  body('action').isIn(['ban_user', 'delete_content', 'hide_content', 'warn_user']).withMessage('Invalid action'),
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer (hours)'),
  handleValidationErrors,
];

const router: Router = Router();

// GET /api/admin/reports - Get paginated reports list
router.get(
  '/',
  requirePermission('reports.view'),
  validateReportSearch,
  reportManagementController.getReports.bind(reportManagementController)
);

// GET /api/admin/reports/stats - Get report statistics
router.get(
  '/stats',
  requirePermission('reports.view'),
  [
    query('timeframe').optional().isIn(['day', 'week', 'month', 'all']).withMessage('Invalid timeframe'),
    handleValidationErrors,
  ],
  reportManagementController.getReportStats.bind(reportManagementController)
);

// GET /api/admin/reports/:reportId - Get detailed report information
router.get(
  '/:reportId',
  requirePermission('reports.view'),
  [
    param('reportId').isUUID().withMessage('Valid report ID required'),
    handleValidationErrors,
  ],
  reportManagementController.getReport.bind(reportManagementController)
);

// POST /api/admin/reports/:reportId/review - Review and take action on report
router.post(
  '/:reportId/review',
  requirePermission('reports.review'),
  [
    param('reportId').isUUID().withMessage('Valid report ID required'),
    handleValidationErrors,
  ],
  validateReviewReport,
  reportManagementController.reviewReport.bind(reportManagementController)
);

// POST /api/admin/reports/bulk-review - Review multiple reports
router.post(
  '/bulk-review',
  requirePermission('reports.review'),
  validateBulkReview,
  reportManagementController.bulkReviewReports.bind(reportManagementController)
);

// POST /api/admin/reports/quick-action - Quick moderation actions
router.post(
  '/quick-action',
  requirePermission('reports.moderate'),
  validateQuickAction,
  reportManagementController.quickAction.bind(reportManagementController)
);

// GET /api/admin/reports/queue - Get admin review queue
router.get(
  '/queue',
  requirePermission('reports.view'),
  reportManagementController.getReviewQueue.bind(reportManagementController)
);

export default router;