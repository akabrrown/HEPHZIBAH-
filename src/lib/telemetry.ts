import { AsyncLocalStorage } from "node:async_hooks";

/**
 * In-Memory Telemetry & Performance Monitoring
 *
 * Lightweight, zero-cost observability for Next.js and PostgreSQL.
 * Tracks:
 * - Most frequently called API routes
 * - Slowest API endpoints (avg, p95, and max latency)
 * - Requests Per Minute (RPM) sliding window
 * - Database query duration and slowest queries
 * - CPU and memory consumption per function execution
 * - Per-request AsyncLocalStorage DB timing for Server-Timing headers
 */

interface RequestTelemetryContext {
  dbMs: number;
  dbCount: number;
}

const requestTelemetryStorage = new AsyncLocalStorage<RequestTelemetryContext>();

interface RouteMetric {
  route: string;
  count: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  samples: number[];
  lastCalledAt: string;
}

interface DbQueryMetric {
  querySummary: string;
  durationMs: number;
  timestamp: string;
}

interface TelemetryStore {
  routes: Map<string, RouteMetric>;
  requestTimestamps: number[]; // For RPM calculation
  dbQueries: {
    totalCount: number;
    totalDurationMs: number;
    slowestQueries: DbQueryMetric[];
  };
  serverStartedAt: number;
}

const MAX_RPM_WINDOW_MS = 60_000; // 1 minute window for current RPM
const MAX_SLOW_QUERIES_STORED = 20;
const MAX_ROUTE_SAMPLES = 100;
const MAX_TRACKED_ROUTES = 200;

const store: TelemetryStore = {
  routes: new Map<string, RouteMetric>(),
  requestTimestamps: [],
  dbQueries: {
    totalCount: 0,
    totalDurationMs: 0,
    slowestQueries: [],
  },
  serverStartedAt: Date.now(),
};

function computeP95(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round((sorted[idx] ?? 0) * 100) / 100;
}

export function attachServerTiming<T extends Response>(
  res: T,
  metrics: { appMs: number; dbMs: number; cpuMs: number }
): T {
  const header = `app;dur=${metrics.appMs.toFixed(2)}, db;dur=${metrics.dbMs.toFixed(2)}, cpu;dur=${metrics.cpuMs.toFixed(2)}`;
  try {
    res.headers.set("Server-Timing", header);
    return res;
  } catch {
    const headers = new Headers(res.headers);
    headers.set("Server-Timing", header);
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    }) as T;
  }
}

export async function withApiTelemetry<T extends Response>(
  method: string,
  routePattern: string,
  handler: () => Promise<T>
): Promise<T> {
  const ctx: RequestTelemetryContext = { dbMs: 0, dbCount: 0 };
  const startMs = performance.now();
  const startCpu = process.cpuUsage();

  return await requestTelemetryStorage.run(ctx, async () => {
    try {
      const response = await handler();
      const appMs = Math.max(0, performance.now() - startMs);
      const cpuDelta = process.cpuUsage(startCpu);
      const cpuMs = Math.max(0, (cpuDelta.user + cpuDelta.system) / 1000);
      recordApiRequest(method, routePattern, appMs);
      return attachServerTiming(response, { appMs, dbMs: ctx.dbMs, cpuMs });
    } catch (err) {
      const appMs = Math.max(0, performance.now() - startMs);
      recordApiRequest(method, routePattern, appMs);
      throw err;
    }
  });
}

/**
 * Records an HTTP API request execution with latency.
 */
export function recordApiRequest(
  method: string,
  pathname: string,
  durationMs: number,
  nowMs: number = Date.now()
): void {
  const routeKey = `${method.toUpperCase()} ${pathname}`;

  // Track RPM timestamps
  store.requestTimestamps.push(nowMs);
  const cutoff = nowMs - MAX_RPM_WINDOW_MS;
  // Prune older timestamps
  while (store.requestTimestamps.length > 0 && (store.requestTimestamps[0] ?? 0) < cutoff) {
    store.requestTimestamps.shift();
  }

  // Update route metrics
  const existing = store.routes.get(routeKey);
  if (!existing) {
    if (store.routes.size >= MAX_TRACKED_ROUTES) {
      const oldestKey = store.routes.keys().next().value;
      if (oldestKey) store.routes.delete(oldestKey);
    }
    store.routes.set(routeKey, {
      route: routeKey,
      count: 1,
      totalDurationMs: durationMs,
      minDurationMs: durationMs,
      maxDurationMs: durationMs,
      samples: [durationMs],
      lastCalledAt: new Date(nowMs).toISOString(),
    });
  } else {
    existing.count += 1;
    existing.totalDurationMs += durationMs;
    existing.minDurationMs = Math.min(existing.minDurationMs, durationMs);
    existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
    if (existing.samples.length >= MAX_ROUTE_SAMPLES) {
      existing.samples.shift();
    }
    existing.samples.push(durationMs);
    existing.lastCalledAt = new Date(nowMs).toISOString();
  }
}

/**
 * Records a database query execution time.
 */
export function recordDbQuery(
  sqlText: string,
  durationMs: number,
  nowMs: number = Date.now()
): void {
  const activeReq = requestTelemetryStorage.getStore();
  if (activeReq) {
    activeReq.dbMs += durationMs;
    activeReq.dbCount += 1;
  }

  store.dbQueries.totalCount += 1;
  store.dbQueries.totalDurationMs += durationMs;

  const slowList = store.dbQueries.slowestQueries;
  const minSlow = slowList[slowList.length - 1]?.durationMs ?? -1;
  if (slowList.length >= MAX_SLOW_QUERIES_STORED && durationMs <= minSlow) {
    return;
  }

  // Clean / normalize query string for telemetry (collapse whitespace, strip long values)
  const normalized = sqlText.replace(/\s+/g, " ").trim().slice(0, 160);

  slowList.push({
    querySummary: normalized,
    durationMs: Math.round(durationMs * 100) / 100,
    timestamp: new Date(nowMs).toISOString(),
  });

  // Keep top slowest sorted descending
  slowList.sort((a, b) => b.durationMs - a.durationMs);
  if (slowList.length > MAX_SLOW_QUERIES_STORED) {
    slowList.pop();
  }
}

/**
 * Measures the CPU consumption and wall-clock execution time of an asynchronous function.
 * Uses Node.js `process.cpuUsage()` to report user and system CPU time in microseconds.
 */
export async function measureFunctionExecution<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{
  result: T;
  label: string;
  durationMs: number;
  cpuMicroseconds: {
    user: number;
    system: number;
    total: number;
  };
}> {
  const startCpu = process.cpuUsage();
  const startHr = process.hrtime.bigint();

  try {
    const result = await fn();
    const endHr = process.hrtime.bigint();
    const cpuDiff = process.cpuUsage(startCpu);
    const durationMs = Number(endHr - startHr) / 1_000_000;

    return {
      result,
      label,
      durationMs: Math.round(durationMs * 100) / 100,
      cpuMicroseconds: {
        user: cpuDiff.user,
        system: cpuDiff.system,
        total: cpuDiff.user + cpuDiff.system,
      },
    };
  } catch (error) {
    throw error;
  }
}

export interface TelemetrySummary {
  uptimeSeconds: number;
  requests: {
    total: number;
    currentRpm: number;
    mostFrequentlyCalled: Array<{
      route: string;
      count: number;
      avgDurationMs: number;
      lastCalledAt: string;
    }>;
    slowestEndpoints: Array<{
      route: string;
      count: number;
      avgDurationMs: number;
      p95DurationMs: number;
      maxDurationMs: number;
      minDurationMs: number;
    }>;
  };
  database: {
    totalQueries: number;
    avgQueryDurationMs: number;
    slowestQueries: DbQueryMetric[];
  };
  system: {
    memory: {
      rssMb: number;
      heapTotalMb: number;
      heapUsedMb: number;
    };
    cpu: {
      userMs: number;
      systemMs: number;
    };
  };
}

/**
 * Returns a complete snapshot of telemetry and performance metrics.
 */
export function getTelemetryMetrics(nowMs: number = Date.now()): TelemetrySummary {
  // Prune timestamps for accurate RPM
  const cutoff = nowMs - MAX_RPM_WINDOW_MS;
  const activeRequests = store.requestTimestamps.filter((ts) => ts > cutoff);
  const currentRpm = activeRequests.length;

  const routesArray = Array.from(store.routes.values());
  const totalRequests = routesArray.reduce((acc, r) => acc + r.count, 0);

  // Most frequently called (sorted descending by count)
  const mostFrequentlyCalled = [...routesArray]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((r) => ({
      route: r.route,
      count: r.count,
      avgDurationMs: Math.round((r.totalDurationMs / r.count) * 100) / 100,
      lastCalledAt: r.lastCalledAt,
    }));

  // Slowest endpoints (sorted descending by maxDurationMs, then avgDurationMs)
  const slowestEndpoints = [...routesArray]
    .sort((a, b) => {
      const avgA = a.totalDurationMs / a.count;
      const avgB = b.totalDurationMs / b.count;
      return b.maxDurationMs !== a.maxDurationMs ? b.maxDurationMs - a.maxDurationMs : avgB - avgA;
    })
    .slice(0, 10)
    .map((r) => ({
      route: r.route,
      count: r.count,
      avgDurationMs: Math.round((r.totalDurationMs / r.count) * 100) / 100,
      p95DurationMs: computeP95(r.samples),
      maxDurationMs: Math.round(r.maxDurationMs * 100) / 100,
      minDurationMs: Math.round(r.minDurationMs * 100) / 100,
    }));

  const avgQueryDurationMs =
    store.dbQueries.totalCount > 0
      ? Math.round(
          (store.dbQueries.totalDurationMs / store.dbQueries.totalCount) * 100
        ) / 100
      : 0;

  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();

  return {
    uptimeSeconds: Math.floor((nowMs - store.serverStartedAt) / 1000),
    requests: {
      total: totalRequests,
      currentRpm,
      mostFrequentlyCalled,
      slowestEndpoints,
    },
    database: {
      totalQueries: store.dbQueries.totalCount,
      avgQueryDurationMs,
      slowestQueries: [...store.dbQueries.slowestQueries],
    },
    system: {
      memory: {
        rssMb: Math.round((mem.rss / (1024 * 1024)) * 10) / 10,
        heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 10) / 10,
      },
      cpu: {
        userMs: Math.round(cpu.user / 1000),
        systemMs: Math.round(cpu.system / 1000),
      },
    },
  };
}

/**
 * Resets all telemetry stores (used in test suites).
 */
export function resetTelemetryStore(): void {
  store.routes.clear();
  store.requestTimestamps = [];
  store.dbQueries.totalCount = 0;
  store.dbQueries.totalDurationMs = 0;
  store.dbQueries.slowestQueries = [];
  store.serverStartedAt = Date.now();
}
