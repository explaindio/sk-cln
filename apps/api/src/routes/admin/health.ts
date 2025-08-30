// skool-clone/apps/api/src/routes/admin/health.ts
import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { requirePermission } from '../../middleware/admin';
import { systemHealthController } from '../../controllers/admin/systemHealth.controller';

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

const validateHealthFilters = [
  query('includeDetails').optional().isIn(['true', 'false']).withMessage('includeDetails must be true or false'),
  query('checkServices').optional().isIn(['true', 'false']).withMessage('checkServices must be true or false'),
  query('checkPerformance').optional().isIn(['true', 'false']).withMessage('checkPerformance must be true or false'),
  handleValidationErrors,
];

const validateHealthCheck = [
  body('checkType').isIn(['system', 'database', 'services', 'performance', 'overview']).withMessage('Invalid check type'),
  body('options').optional().isObject().withMessage('Options must be an object'),
  handleValidationErrors,
];

const router: Router = Router();

// GET /api/admin/health/overview - Get complete system health overview
router.get(
  '/overview',
  requirePermission('health.view'),
  validateHealthFilters,
  systemHealthController.getHealthOverview.bind(systemHealthController)
);

// GET /api/admin/health/summary - Get brief health summary
router.get(
  '/summary',
  requirePermission('health.view'),
  systemHealthController.getHealthSummary.bind(systemHealthController)
);

// POST /api/admin/health/check - Run a specific health check
router.post(
  '/check',
  requirePermission('health.manage'),
  validateHealthCheck,
  systemHealthController.runHealthCheck.bind(systemHealthController)
);

// System Metrics Routes

// GET /api/admin/health/system-metrics - Get system metrics (CPU, memory, disk)
router.get(
  '/system-metrics',
  requirePermission('health.view'),
  systemHealthController.getSystemMetrics.bind(systemHealthController)
);

// GET /api/admin/health/cpu - Get detailed CPU metrics
router.get(
  '/cpu',
  requirePermission('health.view'),
  systemHealthController.getCpuMetrics.bind(systemHealthController)
);

// GET /api/admin/health/memory - Get detailed memory metrics
router.get(
  '/memory',
  requirePermission('health.view'),
  systemHealthController.getMemoryMetrics.bind(systemHealthController)
);

// GET /api/admin/health/disk - Get detailed disk usage metrics
router.get(
  '/disk',
  requirePermission('health.view'),
  systemHealthController.getDiskMetrics.bind(systemHealthController)
);

// Component Health Routes

// GET /api/admin/health/database - Get database health status
router.get(
  '/database',
  requirePermission('health.view'),
  systemHealthController.getDatabaseHealth.bind(systemHealthController)
);

// GET /api/admin/health/services - Get external services health status
router.get(
  '/services',
  requirePermission('health.view'),
  systemHealthController.getServicesHealth.bind(systemHealthController)
);

// GET /api/admin/health/performance - Get performance metrics
router.get(
  '/performance',
  requirePermission('health.view'),
  systemHealthController.getPerformanceMetrics.bind(systemHealthController)
);

// GET /api/admin/health/dependencies - Get dependency health checks
router.get(
  '/dependencies',
  requirePermission('health.view'),
  systemHealthController.getDependencyHealth.bind(systemHealthController)
);

export default router;