import { Router, Request, Response } from 'express';
import { body, param, query, oneOf } from 'express-validator';
import { moderationController } from '../controllers/moderationController';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission } from '../middleware/admin';
import { handleValidationErrors } from '../middleware/validation';

const router: Router = Router();

// ========== PUBLIC AND AUTHENTICATED ENDPOINTS ==========

// Content validation middleware for moderation checks
const validateContentCheck = [
  body('content')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be 1-10000 characters'),
  body('contentType')
    .isIn(['post', 'comment', 'message'])
    .withMessage('Invalid content type'),
  handleValidationErrors,
];

// Auto-moderation check (public but authenticated)
const validateAutoModerationCheck = [
  body('content')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be 1-10000 characters'),
  body('contentType')
    .isIn(['post', 'comment', 'message'])
    .withMessage('Invalid content type'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  handleValidationErrors,
];

/**
 * POST /api/moderation/check-content
 * Check content against moderation filters (authenticated endpoint)
 */
router.post(
  '/check-content',
  authenticate,
  validateContentCheck,
  moderationController.checkContent
);

/**
 * POST /api/moderation/auto-check
 * Process content through auto-moderation
 */
router.post(
  '/auto-check',
  authenticate,
  validateAutoModerationCheck,
  moderationController.autoModerationCheck
);

// ========== ADMIN/MODERATOR ONLY ENDPOINTS ==========

// Dashboard and analytics
const validateStatsQuery = [
  query('timeframe')
    .optional()
    .isIn(['day', 'week', 'month', ''])
    .withMessage('Timeframe must be day, week, month, or empty'),
  handleValidationErrors,
];

/**
 * GET /api/moderation/dashboard
 * Get moderation dashboard data (admin/mod only)
 */
router.get(
  '/dashboard',
  requireAdmin,
  requirePermission('content.moderate'),
  moderationController.getDashboard
);

/**
 * GET /api/moderation/stats
 * Get moderation statistics (admin/mod only)
 */
router.get(
  '/stats',
  requireAdmin,
  requirePermission('content.moderate'),
  validateStatsQuery,
  moderationController.getStats
);

// Content moderation actions
const validateContentModeration = [
  body('targetId')
    .isUUID()
    .withMessage('Target ID must be a valid UUID'),
  body('targetType')
    .isIn(['post', 'comment', 'message'])
    .withMessage('Invalid target type'),
  body('action')
    .isIn([
      'APPROVE', 'DELETE', 'HIDE', 'FLAG', 'WARN', 'MUTE', 'BAN', 'UNBAN'
    ])
    .withMessage('Invalid moderation action'),
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be 1-500 characters'),
  body('notes')
    .optional()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 525600 })
    .withMessage('Duration must be 1-525600 minutes'),
  handleValidationErrors,
];

/**
 * POST /api/moderation/moderate
 * Moderate specific content (admin/mod only)
 */
router.post(
  '/moderate',
  requireAdmin,
  requirePermission('content.moderate'),
  validateContentModeration,
  moderationController.moderateContent
);

// Bulk moderation
const validateBulkModeration = [
  body('targetIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Target IDs must be an array of 1-50 items'),
  body('targetIds.*')
    .isUUID()
    .withMessage('All target IDs must be valid UUIDs'),
  body('targetType')
    .isIn(['post', 'comment', 'message'])
    .withMessage('Invalid target type'),
  body('action')
    .isIn([
      'APPROVE', 'DELETE', 'HIDE', 'FLAG', 'WARN', 'MUTE', 'BAN', 'UNBAN'
    ])
    .withMessage('Invalid moderation action'),
  body('reason')
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be 1-500 characters'),
  body('notes')
    .optional()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 525600 })
    .withMessage('Duration must be 1-525600 minutes'),
  handleValidationErrors,
];

/**
 * POST /api/moderation/bulk
 * Bulk moderate multiple items (admin/mod only)
 */
router.post(
  '/bulk',
  requireAdmin,
  requirePermission('content.moderate'),
  validateBulkModeration,
  moderationController.bulkModerate
);

// Content filter management
const validateCreateContentFilter = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('type')
    .isIn(['profanity', 'spam', 'toxicity', 'custom'])
    .withMessage('Type must be profanity, spam, toxicity, or custom'),
  body('pattern')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Pattern must be 1-1000 characters'),
  body('severity')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Severity must be low, medium, or high'),
  body('action')
    .isIn(['FLAG', 'HIDE', 'DELETE', 'WARN'])
    .withMessage('Action must be FLAG, HIDE, DELETE, or WARN'),
  handleValidationErrors,
];

const validateUpdateContentFilter = [
  param('id')
    .isUUID()
    .withMessage('Filter ID must be a valid UUID'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('type')
    .optional()
    .isIn(['profanity', 'spam', 'toxicity', 'custom'])
    .withMessage('Type must be profanity, spam, toxicity, or custom'),
  body('pattern')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Pattern must be 1-1000 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Severity must be low, medium, or high'),
  body('action')
    .optional()
    .isIn(['FLAG', 'HIDE', 'DELETE', 'WARN'])
    .withMessage('Action must be FLAG, HIDE, DELETE, or WARN'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
];

// Report Management Routes
const validateCreateReport = [
  body('targetType')
    .isIn(['post', 'comment', 'user', 'message'])
    .withMessage('Invalid target type'),
  body('targetId')
    .isUUID()
    .withMessage('Target ID must be a valid UUID'),
  body('reason')
    .isIn([
      'SPAM', 'HARASSMENT', 'HATE_SPEECH', 'INAPPROPRIATE_CONTENT',
      'COPYRIGHT', 'FAKE_NEWS', 'ABUSE', 'OTHER'
    ])
    .withMessage('Invalid report reason'),
  body('description')
    .optional()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  handleValidationErrors,
];

const validateReportReview = [
  body('decision')
    .isIn(['approve', 'dismiss', 'escalate'])
    .withMessage('Invalid decision'),
  body('resolution')
    .optional()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Resolution must be less than 1000 characters'),
  handleValidationErrors,
];

const validateReportsQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'reviewing', 'resolved', 'dismissed', 'all'])
    .withMessage('Invalid status'),
  query('targetType')
    .optional()
    .isIn(['post', 'comment', 'user', 'message'])
    .withMessage('Invalid target type'),
  query('severity')
    .optional()
    .isIn(['all', 'high', 'medium', 'low'])
    .withMessage('Invalid severity'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),
  handleValidationErrors,
];

/**
 * POST /api/moderation/reports
 * Create a new report (authenticated endpoint)
 */
router.post(
  '/reports',
  authenticate,
  validateCreateReport,
  moderationController.createReport
);

/**
 * GET /api/moderation/reports
 * Get reports (admin/mod only)
 */
router.get(
  '/reports',
  requireAdmin,
  requirePermission('reports.view'),
  validateReportsQuery,
  moderationController.getReports
);

/**
 * POST /api/moderation/reports/:id/review
 * Review and resolve a report (admin/mod only)
 */
router.post(
  '/reports/:id/review',
  requireAdmin,
  requirePermission('reports.manage'),
  param('id').isUUID().withMessage('Report ID must be a valid UUID'),
  validateReportReview,
  moderationController.reviewReport
);

/**
 * GET /api/moderation/report-stats
 * Get report statistics (admin only)
 */
router.get(
  '/report-stats',
  requireAdmin,
  requirePermission('reports.view'),
  query('timeframe')
    .optional()
    .isIn(['day', 'week', 'month', 'all'])
    .withMessage('Invalid timeframe'),
  handleValidationErrors,
  moderationController.getReportStats
);

const validateContentFiltersQuery = [
  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('activeOnly must be a boolean'),
  handleValidationErrors,
];

/**
 * GET /api/moderation/filters
 * Get all content filters (admin/mod only)
 */
router.get(
  '/filters',
  requireAdmin,
  requirePermission('content.moderate'),
  validateContentFiltersQuery,
  moderationController.getContentFilters
);

/**
 * POST /api/moderation/filters
 * Create a new content filter (admin only)
 */
router.post(
  '/filters',
  requireAdmin,
  requirePermission('settings.edit'),
  validateCreateContentFilter,
  moderationController.createContentFilter
);

/**
 * PUT /api/moderation/filters/:id
 * Update a content filter (admin only)
 */
router.put(
  '/filters/:id',
  requireAdmin,
  requirePermission('settings.edit'),
  validateUpdateContentFilter,
  moderationController.updateContentFilter
);

/**
 * DELETE /api/moderation/filters/:id
 * Delete a content filter (admin only)
 */
router.delete(
  '/filters/:id',
  requireAdmin,
  requirePermission('settings.edit'),
  param('id').isUUID().withMessage('Filter ID must be a valid UUID'),
  handleValidationErrors,
  moderationController.deleteContentFilter
);

// Health check endpoint for monitoring
/**
 * GET /api/moderation/health
 * Moderation service health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'moderation',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;