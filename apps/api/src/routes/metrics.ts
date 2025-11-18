import { Router } from 'express';
import { renderPrometheus } from '../lib/metrics';
import zlib from 'zlib';

const router = Router();

router.get('/metrics', (req, res) => {
  const accept = String(req.headers['accept'] || '');
  const ae = String(req.headers['accept-encoding'] || '');
  const wantsOpenMetrics =
    String(req.query?.format).toLowerCase() === 'openmetrics' ||
    accept.includes('application/openmetrics-text');

  let body = renderPrometheus();
  if (wantsOpenMetrics) {
    // Minimal OpenMetrics compatibility: set content-type and EOF trailer
    res.setHeader('Content-Type', 'application/openmetrics-text; version=1.0.0; charset=utf-8');
    if (!body.endsWith('\n')) body += '\n';
    if (!body.endsWith('# EOF\n')) body += '# EOF\n';
  } else {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  }

  // Gzip if requested
  if (ae.includes('gzip')) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    const gz = zlib.gzipSync(Buffer.from(body, 'utf8'));
    res.send(gz);
    return;
  }

  res.send(body);
});

export default router;
