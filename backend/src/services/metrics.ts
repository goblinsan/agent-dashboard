// Simple in-memory metrics collector (Phase 5 initial slice)
// Not intended for production scale; no persistence or high-cardinality protection yet.

export interface HttpMetricsSnapshot {
  totalRequests: number;
  totalErrors: number;
  inFlight: number;
  perRoute: Record<string, { count: number; errors: number; totalLatencyMs: number }>;
  cache: { statusAggHits: number; statusAggMisses: number };
  generatedAt: number;
}

const metricsState = {
  totalRequests: 0,
  totalErrors: 0,
  inFlight: 0,
  perRoute: new Map<string, { count: number; errors: number; totalLatencyMs: number }>(),
  cache: { statusAggHits: 0, statusAggMisses: 0 }
};

export function recordRequestStart(routeKey: string) {
  metricsState.totalRequests += 1;
  metricsState.inFlight += 1;
  if (!metricsState.perRoute.has(routeKey)) metricsState.perRoute.set(routeKey, { count: 0, errors: 0, totalLatencyMs: 0 });
  const r = metricsState.perRoute.get(routeKey)!; r.count += 1;
}
export function recordRequestEnd(routeKey: string, latencyMs: number, errored: boolean) {
  metricsState.inFlight = Math.max(0, metricsState.inFlight - 1);
  const r = metricsState.perRoute.get(routeKey);
  if (r) {
    r.totalLatencyMs += latencyMs;
    if (errored) { r.errors += 1; metricsState.totalErrors += 1; }
  } else if (errored) {
    metricsState.totalErrors += 1;
  }
}
export function recordCacheHit() { metricsState.cache.statusAggHits += 1; }
export function recordCacheMiss() { metricsState.cache.statusAggMisses += 1; }

export function snapshotMetrics(): HttpMetricsSnapshot {
  const perRoute: HttpMetricsSnapshot['perRoute'] = {};
  metricsState.perRoute.forEach((v, k) => { perRoute[k] = { ...v }; });
  return {
    totalRequests: metricsState.totalRequests,
    totalErrors: metricsState.totalErrors,
    inFlight: metricsState.inFlight,
    perRoute,
    cache: { ...metricsState.cache },
    generatedAt: Date.now()
  };
}

export function resetMetrics() {
  metricsState.totalRequests = 0;
  metricsState.totalErrors = 0;
  metricsState.inFlight = 0;
  metricsState.perRoute.clear();
  metricsState.cache.statusAggHits = 0;
  metricsState.cache.statusAggMisses = 0;
}
