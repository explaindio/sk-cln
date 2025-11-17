API Observability

Overview
- Endpoint: `/metrics` serves Prometheus text format.
- Counters: `http_requests_total`, `http_requests_by_route_total` (low-cardinality),
  `http_request_duration_ms_count`.
- Summaries/Histograms: `http_request_duration_ms_sum`, `http_request_duration_ms_count`,
  `http_request_duration_ms_bucket` (ms buckets).
- Gauges: `process_resident_memory_bytes`, `process_uptime_seconds`, `build_info`.

Route Normalization
- Replacements (applied per path segment):
  - Email-like: `user@example.com` → `:email`
  - UUID v4 / 24-hex / 16+ base64url-ish / 6+ digits: → `:id`
  - Slug-like (lowercase/hyphen, ≥3 chars, not all digits, not reserved): → `:slug`
- Reserved segments (examples): `api, health, metrics, posts, messages, analytics, notifications, search, communities, courses, users, ...` are preserved.
- Example: `/api/notifications/jane.doe@example.com` → `/api/notifications/:email`
- Example: `/api/posts/community/6f1d32c4-4a95-4f0a-8e0d-5e0d1b9f9c3a` → `/api/posts/community/:id`

Allowlist
- Only allowlisted prefixes emit `http_requests_by_route_total` labels; others fold to `/other`.
- Default: `/health,/metrics,/api/posts,/api/messages,/api/analytics,/api/notifications,/api/search,/api/communities,/api/courses`.
- Override via env: `METRICS_ROUTE_ALLOWLIST="/health,/metrics,/api/posts,..."`.

Grafana Dashboard
- Import `skool-clone/apps/api/docs/observability/grafana-api-dashboard.json`.
- Uses Prometheus queries:
  - Requests by status (5m): `sum(increase(http_requests_total[5m])) by (status)`
  - Top routes (5m): `topk(10, sum(increase(http_requests_by_route_total[5m])) by (route))`
  - Latency p50/p90/p99: `histogram_quantile(quantile, sum(rate(http_request_duration_ms_bucket[5m])) by (le))`
  - RPS: `sum(rate(http_request_duration_ms_count[1m]))`
  - Memory, Uptime, Build info: `process_resident_memory_bytes`, `process_uptime_seconds`, `build_info`
- Datasource variable: select your Prometheus as `DS_PROM` during import if prompted.

Testing
- Targeted metrics test:
  - `cd skool-clone/apps/api && TEST_QUIET=true pnpm test -- src/__tests__/routes.metrics.test.ts --runInBand`
- Validations covered:
  - Prometheus format, histograms, build info
  - Route normalization (`:email`, `:slug`, `:id`) and `/other` bucketing

