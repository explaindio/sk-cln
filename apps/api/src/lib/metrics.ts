type Method = string;
type Status = string;

const requestCounters: Map<string, number> = new Map(); // key: method|status
const routeCounters: Map<string, number> = new Map();   // key: method|status|route
const socketEventCounters: Map<string, number> = new Map(); // key: eventType
let reqDurationMsSum = 0;
let reqDurationCount = 0;
// Histogram buckets (milliseconds)
const DURATION_BUCKETS = [50, 100, 250, 500, 1000, 2000, 5000];
const bucketCounts: Map<number, number> = new Map(DURATION_BUCKETS.map((b) => [b, 0] as [number, number]));

// Reset all in-memory metrics to support deterministic tests
export function resetMetrics(): void {
  requestCounters.clear();
  routeCounters.clear();
  socketEventCounters.clear();
  reqDurationMsSum = 0;
  reqDurationCount = 0;
  // Clear histogram counts; renderPrometheus guards with `|| 0`
  for (const b of DURATION_BUCKETS) {
    bucketCounts.set(b, 0);
  }
}

export function recordRequest(method: Method, status: Status, durationMs: number, route?: string) {
  const key = `${method}|${status}`;
  requestCounters.set(key, (requestCounters.get(key) || 0) + 1);
  if (route) {
    const rkey = `${method}|${status}|${route}`;
    routeCounters.set(rkey, (routeCounters.get(rkey) || 0) + 1);
  }
  reqDurationMsSum += durationMs;
  reqDurationCount += 1;
  // Increment histogram bucket (cumulative buckets will be emitted later)
  for (const b of DURATION_BUCKETS) {
    if (durationMs <= b) {
      bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);
      break;
    }
  }
}

// Record a socket event by type (e.g., connect, disconnect, message)
export function recordSocketEvent(eventType: string) {
  const key = eventType || 'unknown';
  socketEventCounters.set(key, (socketEventCounters.get(key) || 0) + 1);
}

export function renderPrometheus(): string {
  const lines: string[] = [];
  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, val] of requestCounters.entries()) {
    const [method, status] = key.split('|');
    lines.push(`http_requests_total{method="${method}",status="${status}"} ${val}`);
  }

  // By-route variant to keep low-cardinality route labels
  if (routeCounters.size > 0) {
    lines.push('# HELP http_requests_by_route_total Total HTTP requests by route');
    lines.push('# TYPE http_requests_by_route_total counter');
    for (const [key, val] of routeCounters.entries()) {
      const [method, status, route] = key.split('|');
      lines.push(`http_requests_by_route_total{method="${method}",status="${status}",route="${route}"} ${val}`);
    }
  }

  lines.push('# HELP http_request_duration_ms Summary of request durations in milliseconds');
  lines.push('# TYPE http_request_duration_ms summary');
  lines.push(`http_request_duration_ms_sum ${reqDurationMsSum}`);
  lines.push(`http_request_duration_ms_count ${reqDurationCount}`);

  // Histogram (cumulative) for durations
  lines.push('# HELP http_request_duration_ms_bucket Histogram of request durations in milliseconds');
  lines.push('# TYPE http_request_duration_ms_bucket histogram');
  let cumulative = 0;
  for (const b of DURATION_BUCKETS) {
    cumulative += bucketCounts.get(b) || 0;
    lines.push(`http_request_duration_ms_bucket{le="${b}"} ${cumulative}`);
  }
  // +Inf bucket equals total count
  lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${reqDurationCount}`);
  lines.push(`http_request_duration_ms_sum ${reqDurationMsSum}`);
  lines.push(`http_request_duration_ms_count ${reqDurationCount}`);

  // Basic process metrics (gauges)
  const mem = process.memoryUsage();
  lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${mem.rss}`);

  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${process.uptime()}`);

  // Build info
  let version = 'unknown';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    version = pkg?.version || version;
  } catch {}
  const nodeVersion = process.versions?.node || 'unknown';
  lines.push('# HELP build_info Application build information');
  lines.push('# TYPE build_info gauge');
  lines.push(`build_info{version="${version}",node_version="${nodeVersion}"} 1`);

  // Socket events by type (if any recorded)
  if (socketEventCounters.size > 0) {
    lines.push('# HELP socket_events_total Total socket events by type');
    lines.push('# TYPE socket_events_total counter');
    for (const [eventType, val] of socketEventCounters.entries()) {
      lines.push(`socket_events_total{event="${eventType}"} ${val}`);
    }
  }

  return lines.join('\n') + '\n';
}
