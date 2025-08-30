import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { searchService } from '../services/searchService';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { searchAnalyticsService } from '../services/searchAnalytics.service';

const router: Router = Router();

const searchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['all', 'communities', 'posts', 'courses', 'users']).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.string().optional(),
 sortOrder: z.enum(['asc', 'desc']).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  searchFields: z.array(z.string()).optional(),
  searchOperator: z.enum(['and', 'or']).optional(),
  phraseSearch: z.boolean().optional(),
 proximityTerms: z.array(z.string()).optional(),
 proximityDistance: z.number().optional()
});

const clickSchema = z.object({
  searchId: z.string(),
  resultId: z.string(),
  resultType: z.string(),
});

router.get('/search', authenticate, validateRequest(searchSchema), async (req: Request, res: Response) => {
  try {
    const {
      query = '',
      type = 'all',
      page = 1,
      limit = 20,
      sortBy,
      sortOrder,
      filters = {},
      searchFields,
      searchOperator,
      phraseSearch,
      proximityTerms,
      proximityDistance
    } = req.query;

    // Build proximity search options if provided
    let proximitySearch: { distance: number; terms: string[] } | undefined;
    if (Array.isArray(proximityTerms) && proximityTerms.length > 0 && proximityDistance) {
      // Filter out non-string values and convert to string array
      const stringTerms = proximityTerms.filter((term): term is string => typeof term === 'string');
      if (stringTerms.length > 0) {
        proximitySearch = {
          distance: Number(proximityDistance),
          terms: stringTerms
        };
      }
    }

    // Handle phrase search parameter
    let isPhraseSearch = false;
    if (phraseSearch === true || phraseSearch === 'true' || (Array.isArray(phraseSearch) && phraseSearch.includes('true'))) {
      isPhraseSearch = true;
    }

    const startTime = Date.now();
    const results = await searchService.search({
      query: query as string,
      type: type as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      filters: filters as Record<string, any>,
      searchFields: searchFields as string[],
      searchOperator: searchOperator as 'and' | 'or',
      phraseSearch: isPhraseSearch,
      proximitySearch
    });
    const took = Date.now() - startTime;

    // Log search analytics
    await searchAnalyticsService.logSearch({
      userId: req.user?.id,
      query: query as string,
      filters: { type, ...(filters as Record<string, any>) },
      page: parseInt(page as string),
      resultsCount: results.total,
      took,
    });

    res.json({
      success: true,
      data: {
        ...results,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        took
      }
    });
 } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

router.get('/search/suggest', authenticate, async (req: Request, res: Response) => {
  try {
    const { query = '', type = 'all' } = req.query;
    
    if (!query || (query as string).length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const indices = type === 'all' 
      ? ['communities', 'posts', 'courses', 'users'] 
      : [type as string];
    
    const field = type === 'users' ? 'username' : 'title';
    
    const suggestions = await searchService.suggest(
      indices,
      query as string,
      field
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Suggest error:', error);
    res.status(500).json({
      success: false,
      error: 'Suggest failed'
    });
  }
});

router.get('/search/related/:type/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const { limit = 5 } = req.query;
    
    const results = await searchService.findSimilar({
      index: type,
      id,
      maxResults: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: results.hits
    });
  } catch (error) {
    console.error('Related search error:', error);
    res.status(500).json({
      success: false,
      error: 'Related search failed'
    });
  }
});

router.post('/search/admin/sync', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { type } = req.body;
    
    // Start sync in background
    if (type === 'all') {
      searchService.syncAll().catch(console.error);
    } else {
      searchService.syncIndex(type).catch(console.error);
    }

    res.json({
      success: true,
      message: 'Sync started'
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed'
    });
  }
});

router.post('/search/analytics/click', authenticate, validateRequest(clickSchema), async (req: Request, res: Response) => {
  const { searchId, resultId, resultType } = req.body;

  try {
    await searchAnalyticsService.logClick(searchId, resultId, resultType);
    res.json({ success: true, message: 'Click logged successfully' });
  } catch (error) {
    console.error('Error logging search click:', error);
    res.status(500).json({ success: false, message: 'Failed to log click' });
  }
});

export default router;