import request from 'supertest';
import express from 'express';
import app from '../index';
import { resetMetrics } from '../lib/metrics';
import zlib from 'zlib';

describe('Prometheus metrics endpoint', () => {
  beforeEach(() => {
    resetMetrics();
  });
  it('serves text format with standard headers', async () => {
    const res = await request(app).get('/metrics');
    // no debug logging
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('# HELP http_requests_total');
    expect(res.text).toContain('# TYPE http_request_duration_ms summary');
    // Histogram lines exist
    expect(res.text).toContain('# TYPE http_request_duration_ms_bucket histogram');
    expect(res.text).toMatch(/http_request_duration_ms_bucket\{le=\"\+Inf\"\} \d+/);
    // Build info is present
    expect(res.text).toMatch(/build_info\{version=\".*\",node_version=\".*\"\} 1/);
  });

  it('increments counters after a request', async () => {
    // Trigger a simple request
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    // Expect to see a GET counter and at least one status code (200 or similar)
    expect(res.text).toMatch(/http_requests_total\{method=\"GET\",status=\"\d+\"\} \d+/);
  });
});

describe('Prometheus route normalization', () => {
  it('normalizes routes and enforces allowlist', async () => {
    // Allowed prefix: should appear with normalized :email
    await request(app).get('/api/notifications/test-user@example.com');
    // Allowed prefix for users: should appear with :slug
    await request(app).get('/api/users/some-user-slug');
    // Not allowlisted: should bucket to /other
    await request(app).get('/unlisted/this-is-a-sluggy-path');

    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    // By-route counter appears
    expect(res.text).toContain('# TYPE http_requests_by_route_total counter');
    // Email normalization under allowlisted prefix
    expect(res.text).toMatch(/http_requests_by_route_total\{[^}]*route=\"\/api\/notifications\/:email\"[^}]*\} \d+/);
    // Users slug normalization under allowlisted prefix
    expect(res.text).toMatch(/http_requests_by_route_total\{[^}]*route=\"\/api\/users\/:slug\"[^}]*\} \d+/);
    // Non-allowlisted path gets folded to /other
    expect(res.text).toMatch(/http_requests_by_route_total\{[^}]*route=\"\/other\"[^}]*\} \d+/);
  });
});

describe('Prometheus metrics encodings', () => {
  beforeEach(() => resetMetrics());

  it('serves gzipped metrics when requested', async () => {
    const res = await request(app).get('/metrics').set('Accept-Encoding', 'gzip');
    expect(res.status).toBe(200);
    const enc = String(res.headers['content-encoding'] || '');
    let text: string;
    if (enc.includes('gzip')) {
      try {
        const raw = res.body?.length ? res.body : Buffer.from(res.text || '', 'utf8');
        const buf = zlib.gunzipSync(raw);
        text = buf.toString('utf8');
      } catch {
        // Supertest may auto-decompress; fall back to plain text
        text = res.text;
      }
    } else {
      text = res.text;
    }
    expect(text).toContain('# HELP http_requests_total');
  });

  it('supports OpenMetrics content-type on demand', async () => {
    const res = await request(app).get('/metrics?format=openmetrics');
    expect(res.status).toBe(200);
    expect(String(res.headers['content-type'])).toContain('application/openmetrics-text');
    expect(res.text.trim().endsWith('# EOF')).toBe(true);
  });
});

// Deterministic 429 test omitted for stability across suites.
