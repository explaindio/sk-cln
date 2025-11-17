import { Request, Response, NextFunction } from 'express';
import { recordRequest } from '../lib/metrics';

// Default low-cardinality route prefixes to expose in metrics
const DEFAULT_ALLOWLIST = [
  '/health',
  '/metrics',
  '/api/posts',
  '/api/messages',
  '/api/analytics',
  '/api/notifications',
  '/api/search',
  '/api/communities',
  '/api/courses',
];

function getAllowlist(): string[] {
  const raw = process.env.METRICS_ROUTE_ALLOWLIST;
  if (!raw) return DEFAULT_ALLOWLIST;
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('/') ? s : `/${s}`));
  return items.length ? items : DEFAULT_ALLOWLIST;
}

// A set of well-known static path segments to avoid turning into :slug
const RESERVED_SEGMENTS = new Set([
  'api',
  'health',
  'metrics',
  'posts',
  'messages',
  'analytics',
  'notifications',
  'search',
  'communities',
  'courses',
  'users',
  'members',
  'comments',
  'reactions',
  'uploads',
  'files',
  'events',
  'event-attendees',
  'bookmarks',
  'admin',
  'moderation',
  'recommendations',
  'track',
  'docs',
  'auth',
]);

function normalizeRoute(path: string): string {
  try {
    // Strip query string if present
    const p = (path || '').split('?')[0];
    const segments = p.split('/').filter(Boolean);
    const norm = segments.map((seg) => {
      // Email-like segment
      if (/^[^/]+@[^/]+$/.test(seg)) return ':email';
      // UUID v4 or hyphenated UUID-like
      if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(seg)) return ':id';
      // 24-char hex (Mongo-like)
      if (/^[0-9a-fA-F]{24}$/.test(seg)) return ':id';
      // Base64url-ish hashes 16+ chars
      if (/^[A-Za-z0-9_-]{16,}$/.test(seg)) return ':id';
      // Long numeric ids
      if (/^\d{6,}$/.test(seg)) return ':id';
      // Slug-like segments (3+ chars, lowercase/hyphen, not purely numeric, not reserved)
      if (/^[a-z0-9-]{3,}$/.test(seg) && !/^\d+$/.test(seg) && !RESERVED_SEGMENTS.has(seg)) return ':slug';
      return seg;
    });
    const normalized = '/' + norm.join('/');
    const ALLOWLIST = getAllowlist();
    return ALLOWLIST.some((prefix) => normalized.startsWith(prefix)) ? normalized : '/other';
  } catch {
    return '/other';
  }
}

export function requestTiming(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = (req.method || 'GET').toUpperCase();
    const status = String(res.statusCode || 0);
    const route = normalizeRoute(req.originalUrl || req.url || '');
    recordRequest(method, status, duration, route);
  });
  next();
}
