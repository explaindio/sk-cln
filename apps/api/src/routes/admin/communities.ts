// skool-clone/apps/api/src/routes/admin/communities.ts
import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { requirePermission } from '../../middleware/admin';
import { communityManagementController } from '../../controllers/admin/communityManagementController';

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

const validateCommunitySearch = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search query must be 1-100 characters'),
  query('isPublic').optional().isIn(['true', 'false']).withMessage('isPublic must be true or false'),
  query('isPaid').optional().isIn(['true', 'false']).withMessage('isPaid must be true or false'),
  query('sortBy').optional().isIn(['name', 'createdAt', 'memberCount']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidationErrors,
];

const validateCreateCommunity = [
  body('name').isLength({ min: 1, max: 100 }).withMessage('Community name must be 1-100 characters'),
  body('slug').isLength({ min: 1, max: 50 }).matches(/^[a-zA-Z0-9-_]+$/).withMessage('Slug must be 1-50 chars, alphanumeric + dashes/underscores'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('ownerId').isUUID().withMessage('Valid owner ID required'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
  body('isPaid').optional().isBoolean().withMessage('isPaid must be boolean'),
  body('priceMonthly').optional().isFloat({ min: 0 }).withMessage('Monthly price must be non-negative'),
  body('priceYearly').optional().isFloat({ min: 0 }).withMessage('Yearly price must be non-negative'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  handleValidationErrors,
];

const validateUpdateCommunity = [
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('Community name must be 1-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be boolean'),
  body('isPaid').optional().isBoolean().withMessage('isPaid must be boolean'),
  body('priceMonthly').optional().isFloat({ min: 0 }).withMessage('Monthly price must be non-negative'),
  body('priceYearly').optional().isFloat({ min: 0 }).withMessage('Yearly price must be non-negative'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  handleValidationErrors,
];

const validateDeleteCommunity = [
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
  body('permanent').optional().isBoolean().withMessage('permanent must be boolean'),
  handleValidationErrors,
];

const validateTransferOwnership = [
  body('newOwnerId').isUUID().withMessage('Valid new owner ID required'),
  handleValidationErrors,
];

const router: Router = Router();

// GET /api/admin/communities - Get paginated communities list
router.get(
  '/',
  requirePermission('communities.view'),
  validateCommunitySearch,
  communityManagementController.getCommunities.bind(communityManagementController)
);

// GET /api/admin/communities/stats - Get community statistics
router.get(
  '/stats',
  requirePermission('communities.view'),
  communityManagementController.getCommunityStats.bind(communityManagementController)
);

// GET /api/admin/communities/:communityId - Get detailed community information
router.get(
  '/:communityId',
  requirePermission('communities.view'),
  [
    param('communityId').isUUID().withMessage('Valid community ID required'),
    handleValidationErrors,
  ],
  communityManagementController.getCommunity.bind(communityManagementController)
);

// POST /api/admin/communities - Create new community
router.post(
  '/',
  requirePermission('communities.create'),
  validateCreateCommunity,
  communityManagementController.createCommunity.bind(communityManagementController)
);

// PUT /api/admin/communities/:communityId - Update community
router.put(
  '/:communityId',
  requirePermission('communities.update'),
  [
    param('communityId').isUUID().withMessage('Valid community ID required'),
    handleValidationErrors,
  ],
  validateUpdateCommunity,
  communityManagementController.updateCommunity.bind(communityManagementController)
);

// DELETE /api/admin/communities/:communityId - Delete community (super admin only)
router.delete(
  '/:communityId',
  requirePermission('communities.delete'),
  [
    param('communityId').isUUID().withMessage('Valid community ID required'),
    handleValidationErrors,
  ],
  validateDeleteCommunity,
  communityManagementController.deleteCommunity.bind(communityManagementController)
);

// POST /api/admin/communities/:communityId/transfer - Transfer community ownership
router.post(
  '/:communityId/transfer',
  requirePermission('communities.update'),
  [
    param('communityId').isUUID().withMessage('Valid community ID required'),
    handleValidationErrors,
  ],
  validateTransferOwnership,
  communityManagementController.transferOwnership.bind(communityManagementController)
);

export default router;