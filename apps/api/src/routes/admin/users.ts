// skool-clone/apps/api/src/routes/admin/users.ts
import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { requirePermission } from '../../middleware/admin';
import { userManagementController } from '../../controllers/admin/userManagementController';

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

const validateUserSearch = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Search query must be 1-100 characters'),
  query('role').optional().isIn(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']).withMessage('Invalid role'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
  query('sortBy').optional().isIn(['username', 'email', 'createdAt', 'lastActive']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc'),
  handleValidationErrors,
];

const validateCreateUser = [
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must be 3-30 chars, alphanumeric + underscore'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('role').optional().isIn(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']).withMessage('Invalid role'),
  handleValidationErrors,
];

const validateUpdateUser = [
  body('firstName').optional().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('role').optional().isIn(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors,
];

const validateBanUser = [
  body('reason').isLength({ min: 1, max: 500 }).withMessage('Ban reason is required (1-500 chars)'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be positive integer (hours)'),
  body('appealAllowed').optional().isBoolean().withMessage('appealAllowed must be boolean'),
  handleValidationErrors,
];

const validateDeleteUser = [
  body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
  body('permanent').optional().isBoolean().withMessage('permanent must be boolean'),
  handleValidationErrors,
];

const router: Router = Router();

// GET /api/admin/users - Get paginated users list
router.get(
  '/',
  requirePermission('users.view'),
  validateUserSearch,
  userManagementController.getUsers.bind(userManagementController)
);

// GET /api/admin/users/stats - Get user statistics
router.get(
  '/stats',
  requirePermission('users.view'),
  userManagementController.getUserStats.bind(userManagementController)
);

// GET /api/admin/users/:userId - Get detailed user information
router.get(
  '/:userId',
  requirePermission('users.view'),
  [
    param('userId').isUUID().withMessage('Valid user ID required'),
    handleValidationErrors,
  ],
  userManagementController.getUser.bind(userManagementController)
);

// POST /api/admin/users - Create new user
router.post(
  '/',
  requirePermission('users.create'),
  validateCreateUser,
  userManagementController.createUser.bind(userManagementController)
);

// PUT /api/admin/users/:userId - Update user
router.put(
  '/:userId',
  requirePermission('users.update'),
  [
    param('userId').isUUID().withMessage('Valid user ID required'),
    handleValidationErrors,
  ],
  validateUpdateUser,
  userManagementController.updateUser.bind(userManagementController)
);

// DELETE /api/admin/users/:userId - Delete user (super admin only)
router.delete(
  '/:userId',
  requirePermission('users.delete'),
  [
    param('userId').isUUID().withMessage('Valid user ID required'),
    handleValidationErrors,
  ],
  validateDeleteUser,
  userManagementController.deleteUser.bind(userManagementController)
);

// POST /api/admin/users/:userId/ban - Ban user
router.post(
  '/:userId/ban',
  requirePermission('users.ban'),
  [
    param('userId').isUUID().withMessage('Valid user ID required'),
    handleValidationErrors,
  ],
  validateBanUser,
  userManagementController.banUser.bind(userManagementController)
);

// POST /api/admin/users/:userId/unban - Unban user
router.post(
  '/:userId/unban',
  requirePermission('users.ban'), // Same permission for unban as ban
  [
    param('userId').isUUID().withMessage('Valid user ID required'),
    handleValidationErrors,
  ],
  [
    body('reason').optional().isLength({ min: 1, max: 500 }).withMessage('Reason must be 1-500 characters'),
    handleValidationErrors,
  ],
  userManagementController.unbanUser.bind(userManagementController)
);

export default router;