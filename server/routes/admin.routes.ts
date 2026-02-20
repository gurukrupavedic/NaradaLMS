/**
 * Admin Routes
 * Audit logging and system settings management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../shared/middleware/auth';
import { jwtAuth } from '../middleware/jwt-auth.middleware';
import { getAdminService } from '../modules/system-admin/service';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

/**
 * GET /api/admin/audit-logs
 * List audit logs with pagination and filters
 */
router.get('/audit-logs', jwtAuth, requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const adminService = getAdminService();

  const filters = {
    userId: req.query.userId as string | undefined,
    action: req.query.action as string | undefined,
    resourceType: req.query.resourceType as string | undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
    offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
  };

  const { rows, total } = await adminService.getAuditLogs(filters);

  res.json({
    success: true,
    data: rows,
    pagination: {
      total,
      limit: filters.limit,
      offset: filters.offset,
    },
  });
}));

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/settings', jwtAuth, requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const adminService = getAdminService();
  const settings = await adminService.getAllSettings();

  res.json({
    success: true,
    data: settings,
  });
}));

/**
 * GET /api/admin/settings/:key
 * Get single setting
 */
router.get('/settings/:key', jwtAuth, requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const adminService = getAdminService();
  const value = await adminService.getSetting(req.params.key);

  if (value === null) {
    return res.status(404).json({
      success: false,
      error: 'Setting not found',
    });
  }

  res.json({
    success: true,
    key: req.params.key,
    value,
  });
}));

/**
 * PUT /api/admin/settings/:key
 * Update system setting
 */
router.put('/settings/:key', jwtAuth, requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const { value } = req.body;

  if (!value) {
    return res.status(400).json({
      success: false,
      error: 'value is required',
    });
  }

  const adminService = getAdminService();
  const userId = (req as any).user?.id;

  await adminService.setSetting(req.params.key, String(value), userId);

  res.json({
    success: true,
    key: req.params.key,
    value: String(value),
  });
}));

export const adminRouter = router;

/**
 * GET /api/admin/stats
 * Aggregated metrics for Admin Dashboard
 */
router.get('/stats', jwtAuth, requireAdmin, catchAsync(async (req: Request, res: Response) => {
  const adminService = getAdminService();
  const recentLimit = req.query.recentLimit ? parseInt(req.query.recentLimit as string) : 10;
  const stats = await adminService.getAdminStats(recentLimit);

  res.json({
    success: true,
    data: stats,
  });
}));
