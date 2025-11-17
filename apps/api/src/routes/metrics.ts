import { Router } from 'express';
import { renderPrometheus } from '../lib/metrics';

const router = Router();

router.get('/metrics', (_req, res) => {
  const body = renderPrometheus();
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(body);
});

export default router;

