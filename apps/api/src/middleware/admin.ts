import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: UserRole;
    permissions: string[];
  };
}

/**
 * Verify admin access
 */
export const requireAdmin = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== UserRole.ADMIN && req.user?.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  req.admin = {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    permissions: getAdminPermissions(req.user.role)
  };
  
  next();
};

/**
 * Require specific admin permission
 */
export const requirePermission = (permission: string) => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return requireAdmin(req, res, () => {
        if (!req.admin?.permissions.includes(permission)) {
          return res.status(403).json({
            success: false,
            error: `Permission required: ${permission}`,
            code: 'INSUFFICIENT_PERMISSION'
          });
        }
        next();
      });
    }
    
    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission required: ${permission}`,
        code: 'INSUFFICIENT_PERMISSION'
      });
    }
    
    next();
  };
};

/**
 * Get permissions based on role
 */
function getAdminPermissions(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    [UserRole.USER]: [],
    [UserRole.MODERATOR]: [
      'content.view',
      'content.moderate',
      'users.view',
      'reports.view'
    ],
    [UserRole.ADMIN]: [
      'content.view',
      'content.moderate',
      'content.delete',
      'users.view',
      'users.edit',
      'users.ban',
      'communities.manage',
      'reports.view',
      'reports.manage',
      'analytics.view',
      'settings.view'
    ],
    [UserRole.SUPER_ADMIN]: [
      'content.view',
      'content.moderate',
      'content.delete',
      'users.view',
      'users.edit',
      'users.ban',
      'users.delete',
      'communities.manage',
      'reports.view',
      'reports.manage',
      'analytics.view',
      'analytics.export',
      'settings.view',
      'settings.edit',
      'system.manage',
      'payments.manage',
      'audit.view'
    ]
  };
  
  return permissions[role] || [];
}

/**
 * Log admin actions
 */
export const logAdminAction = async (
  req: AdminRequest,
  action: string,
  target?: string,
  details?: any
) => {
  // This would require a prisma instance, but we'll leave it as a placeholder
  // since we don't have access to prisma in this middleware file
  console.log(`Admin action: ${action}`, { userId: req.admin?.id, target, details });
};