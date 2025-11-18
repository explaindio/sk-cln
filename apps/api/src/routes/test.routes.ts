import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

// Test-only rate-limited endpoint to deterministically produce 429s
const testLimiter = rateLimit({
  windowMs: 30 * 1000,
  limit: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: () => 'test-key',
});

router.get('/test/limited', testLimiter, (_req, res) => {
  res.json({ ok: true, limited: false });
});

export default router;
