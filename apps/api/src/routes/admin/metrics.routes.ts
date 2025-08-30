// skool-clone/apps/api/src/routes/admin/metrics.routes.ts
import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/admin';
import { prisma } from '../../lib/prisma';
import { subDays, startOfDay } from 'date-fns';

const router = Router();

// All routes in this file require admin access
router.use(requireAdmin);

/**
 * GET /api/admin/metrics/overview
 * Get overview metrics for the admin dashboard
 */
router.get('/overview', requirePermission('analytics.view'), async (req, res) => {
  try {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const last30Days = subDays(today, 30);

    const totalUsers = await prisma.user.count();
    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: startOfDay(today) } }
    });
    const newUsersYesterday = await prisma.user.count({
        where: {
            createdAt: {
                gte: startOfDay(yesterday),
                lt: startOfDay(today)
            }
        }
    });

    const growth = newUsersYesterday > 0 ? ((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100 : (newUsersToday > 0 ? 100 : 0);

    // Dummy data for other metrics
    const metrics = {
      users: {
        total: totalUsers,
        active: 1250, // Dummy
        new: newUsersToday,
        growth: parseFloat(growth.toFixed(1))
      },
      revenue: {
        total: 7500000, // Dummy
        mrr: 625000, // Dummy
        growth: 5.2 // Dummy
      },
      content: {
        posts: 1024, // Dummy
        comments: 4096, // Dummy
        courses: 64 // Dummy
      },
      engagement: {
        dau: 800, // Dummy
        mau: 4500, // Dummy
        avgSessionTime: 15.5 // Dummy
      }
    };

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Failed to get dashboard metrics:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard metrics' });
  }
});

/**
 * GET /api/admin/metrics/activity-chart
 * Get data for the user activity chart
 */
router.get('/activity-chart', requirePermission('analytics.view'), async (req, res) => {
    try {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const count = await prisma.user.count({
                where: {
                    lastActive: {
                        gte: startOfDay(date),
                        lt: startOfDay(subDays(new Date(), i-1))
                    }
                }
            });
            data.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                active: count
            });
        }
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to get activity chart data:', error);
        res.status(500).json({ success: false, error: 'Failed to get activity chart data' });
    }
});

/**
 * GET /api/admin/metrics/revenue-chart
 * Get data for the revenue chart
 */
router.get('/revenue-chart', requirePermission('analytics.view'), async (req, res) => {
    try {
        // Dummy data for revenue chart
        const data = [
            { date: 'Jan', revenue: 400000 },
            { date: 'Feb', revenue: 300000 },
            { date: 'Mar', revenue: 500000 },
            { date: 'Apr', revenue: 450000 },
            { date: 'May', revenue: 600000 },
            { date: 'Jun', revenue: 550000 },
            { date: 'Jul', revenue: 650000 }
        ];
        res.json({ success: true, data });
    } catch (error) {
        console.error('Failed to get revenue chart data:', error);
        res.status(500).json({ success: false, error: 'Failed to get revenue chart data' });
    }
});

export default router;