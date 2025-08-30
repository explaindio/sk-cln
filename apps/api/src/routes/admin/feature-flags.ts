// skool-clone/apps/api/src/routes/admin/feature-flags.ts
import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { requirePermission } from '../../middleware/admin';
import { featureFlagsController } from '../../controllers/admin/featureFlags.controller';

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

const validateFeatureFlagSearch = [
  query('includeArchived').optional().isIn(['true', 'false']).withMessage('includeArchived must be true or false'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'key', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidationErrors,
];

const validateCreateFeatureFlag = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('key').isLength({ min: 1, max: 50 }).matches(/^[a-zA-Z0-9_-]+$/).withMessage('Key must be 1-50 chars, alphanumeric + dashes/underscores'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('value').exists().withMessage('Value is required'),
  body('defaultValue').exists().withMessage('Default value is required'),
  body('rolloutPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Rollout percentage must be 0-100'),
  body('userIds').optional().isArray().withMessage('User IDs must be an array'),
  body('userIds.*').optional().isUUID().withMessage('Each user ID must be a valid UUID'),
  body('conditions').optional().isObject().withMessage('Conditions must be an object'),
  handleValidationErrors,
];

const validateUpdateFeatureFlag = [
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('value').optional().withMessage('Value is required'),
  body('defaultValue').optional().withMessage('Default value is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('rolloutPercentage').optional().isInt({ min: 0, max: 100 }).withMessage('Rollout percentage must be 0-100'),
  body('userIds').optional().isArray().withMessage('User IDs must be an array'),
  body('userIds.*').optional().isUUID().withMessage('Each user ID must be a valid UUID'),
  body('conditions').optional().isObject().withMessage('Conditions must be an object'),
  handleValidationErrors,
];

const validateCreateExperiment = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Experiment name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('featureFlagId').isUUID().withMessage('Valid feature flag ID required'),
  body('variants').isArray({ min: 1, max: 10 }).withMessage('Variants must be array with 1-10 items'),
  body('variants.*.name').isLength({ min: 1, max: 50 }).withMessage('Variant name must be 1-50 characters'),
  body('variants.*.value').exists().withMessage('Variant value is required'),
  body('variants.*.percentage').isInt({ min: 0, max: 100 }).withMessage('Variant percentage must be 0-100'),
  body('targetAudience').optional().isLength({ max: 500 }).withMessage('Target audience cannot exceed 500 characters'),
  body('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601'),
  body('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601'),
  handleValidationErrors,
];

const validateUpdateExperimentStatus = [
  body('status').isIn(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).withMessage('Invalid experiment status'),
  handleValidationErrors,
];

const validateAddSegment = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Segment name must be 1-100 characters'),
  body('type').isIn(['location', 'device', 'behavior', 'custom']).withMessage('Invalid segment type'),
  body('conditions').isObject().withMessage('Conditions must be an object'),
  body('priority').optional().isInt({ min: 0, max: 100 }).withMessage('Priority must be 0-100'),
  handleValidationErrors,
];

const validateAnalytics = [
  query('start').optional().isISO8601().withMessage('Start date must be valid ISO 8601'),
  query('end').optional().isISO8601().withMessage('End date must be valid ISO 8601'),
  handleValidationErrors,
];

const router: Router = Router();

// FEATURE FLAG CRUD OPERATIONS

// GET /api/admin/feature-flags - Get paginated feature flags
router.get(
  '/',
  requirePermission('feature-flags.view'),
  validateFeatureFlagSearch,
  featureFlagsController.getFeatureFlags.bind(featureFlagsController)
);

// GET /api/admin/feature-flags/:flagId - Get feature flag details
router.get(
  '/:flagId',
  requirePermission('feature-flags.view'),
  [
    param('flagId').isUUID().withMessage('Valid feature flag ID required'),
    handleValidationErrors,
  ],
  featureFlagsController.getFeatureFlag.bind(featureFlagsController)
);

// GET /api/admin/feature-flags/key/:key - Get feature flag by key
router.get(
  '/key/:key',
  requirePermission('feature-flags.view'),
  [
    param('key').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Invalid feature flag key format'),
    handleValidationErrors,
  ],
  featureFlagsController.getFeatureFlagByKey.bind(featureFlagsController)
);

// POST /api/admin/feature-flags - Create feature flag
router.post(
  '/',
  requirePermission('feature-flags.create'),
  validateCreateFeatureFlag,
  featureFlagsController.createFeatureFlag.bind(featureFlagsController)
);

// PUT /api/admin/feature-flags/:flagId - Update feature flag
router.put(
  '/:flagId',
  requirePermission('feature-flags.update'),
  [
    param('flagId').isUUID().withMessage('Valid feature flag ID required'),
    handleValidationErrors,
  ],
  validateUpdateFeatureFlag,
  featureFlagsController.updateFeatureFlag.bind(featureFlagsController)
);

// DELETE /api/admin/feature-flags/:flagId - Delete feature flag
router.delete(
  '/:flagId',
  requirePermission('feature-flags.delete'),
  [
    param('flagId').isUUID().withMessage('Valid feature flag ID required'),
    handleValidationErrors,
  ],
  featureFlagsController.deleteFeatureFlag.bind(featureFlagsController)
);

// PATCH /api/admin/feature-flags/:flagId/toggle - Toggle feature flag status
router.patch(
  '/:flagId/toggle',
  requirePermission('feature-flags.update'),
  [
    param('flagId').isUUID().withMessage('Valid feature flag ID required'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
    handleValidationErrors,
  ],
  featureFlagsController.toggleFeatureFlag.bind(featureFlagsController)
);

// A/B TESTING EXPERIMENT MANAGEMENT

// GET /api/admin/feature-flags/experiments - Get all experiments
router.get(
  '/experiments',
  requirePermission('feature-flags.view'),
  featureFlagsController.getExperiments.bind(featureFlagsController)
);

// POST /api/admin/feature-flags/experiments - Create experiment
router.post(
  '/experiments',
  requirePermission('feature-flags.create'),
  validateCreateExperiment,
  featureFlagsController.createExperiment.bind(featureFlagsController)
);

// PATCH /api/admin/feature-flags/experiments/:experimentId/status - Update experiment status
router.patch(
  '/experiments/:experimentId/status',
  requirePermission('feature-flags.update'),
  [
    param('experimentId').isUUID().withMessage('Valid experiment ID required'),
    handleValidationErrors,
  ],
  validateUpdateExperimentStatus,
  featureFlagsController.updateExperimentStatus.bind(featureFlagsController)
);

// USER SEGMENTATION

// POST /api/admin/feature-flags/:flagId/segments - Add segment to feature flag
router.post(
  '/:flagId/segments',
  requirePermission('feature-flags.update'),
  [
    param('flagId').isUUID().withMessage('Valid feature flag ID required'),
    handleValidationErrors,
  ],
  validateAddSegment,
  featureFlagsController.addSegment.bind(featureFlagsController)
);

// PUT /api/admin/feature-flags/segments/:segmentId - Update segment
router.put(
  '/segments/:segmentId',
  requirePermission('feature-flags.update'),
  [
    param('segmentId').isUUID().withMessage('Valid segment ID required'),
    handleValidationErrors,
  ],
  validateAddSegment, // Reuse the same validation
  featureFlagsController.updateSegment.bind(featureFlagsController)
);

// DELETE /api/admin/feature-flags/segments/:segmentId - Delete segment
router.delete(
  '/segments/:segmentId',
  requirePermission('feature-flags.update'),
  [
    param('segmentId').isUUID().withMessage('Valid segment ID required'),
    handleValidationErrors,
  ],
  featureFlagsController.deleteSegment.bind(featureFlagsController)
);

// ANALYTICS AND REPORTING

// GET /api/admin/feature-flags/:key/analytics - Get feature flag analytics
router.get(
  '/:key/analytics',
  requirePermission('feature-flags.view'),
  [
    param('key').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Invalid feature flag key format'),
    handleValidationErrors,
  ],
  validateAnalytics,
  featureFlagsController.getFeatureFlagAnalytics.bind(featureFlagsController)
);

// GET /api/admin/feature-flags/experiments/:experimentId/analytics - Get experiment analytics
router.get(
  '/experiments/:experimentId/analytics',
  requirePermission('feature-flags.view'),
  [
    param('experimentId').isUUID().withMessage('Valid experiment ID required'),
    handleValidationErrors,
  ],
  featureFlagsController.getExperimentAnalytics.bind(featureFlagsController)
);

// PUBLIC FEATURE EVALUATION (for client-side usage)

// GET /api/admin/feature-flags/evaluate/:key - Evaluate feature flag
router.get(
  '/evaluate/:key',
  [ // No permission required for evaluation
    param('key').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Invalid feature flag key format'),
    query('userId').optional().isUUID().withMessage('Valid user ID required'),
    handleValidationErrors,
  ],
  featureFlagsController.evaluateFeatureFlag.bind(featureFlagsController)
);

// POST /api/admin/feature-flags/record-usage - Record feature flag usage
router.post(
  '/record-usage',
  [ // No permission required for usage recording
    body('key').matches(/^[a-zA-Z0-9_-]+$/).withMessage('Invalid feature flag key format'),
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('variant').optional().isLength({ max: 100 }).withMessage('Variant cannot exceed 100 characters'),
    body('metadata.action').isLength({ min: 1, max: 100 }).withMessage('Action is required (1-100 chars)'),
    handleValidationErrors,
  ],
  featureFlagsController.recordUsage.bind(featureFlagsController)
);

export default router;