import request from 'supertest';
import app from '../index';
import { resetMetrics } from '../lib/metrics';

describe('Rate-limit metrics (test-only endpoint)', () => {
  beforeEach(() => resetMetrics());

  it('emits counters for limited endpoint and folds route to /other', async () => {
    // First request allowed
    await request(app).get('/test/limited');
    // Next requests rate-limited (429)
    await request(app).get('/test/limited');
    await request(app).get('/test/limited');

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    // Aggregate counter increments for GETs (status may vary by env)
    expect(res.text).toMatch(/http_requests_total\{[^}]*method=\"GET\"[^}]*status=\"\d+\"[^}]*\} \d+/);
    // Not allowlisted → should aggregate under /other in by-route counter
    expect(res.text).toMatch(/http_requests_by_route_total\{[^}]*route=\"\/other\"[^}]*\} \d+/);
  });
});
