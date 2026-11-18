import { describe, expect, it, beforeEach } from "vitest";
import { dedupeRequest, getDedupeStats, resetDedupeStore } from "@/lib/dedupe";
import {
  checkSlidingWindowLimit,
  isBotOrMaliciousCrawler,
  protectEndpoint,
  resetRateLimitBuckets,
} from "@/lib/rate-limit";
import {
  getTelemetryMetrics,
  measureFunctionExecution,
  recordApiRequest,
  recordDbQuery,
  resetTelemetryStore,
} from "@/lib/telemetry";
import { getDbConnectionStatus } from "@/lib/db";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("Performance & Resilience (Deduplication, Rate Limiting, Telemetry, DB Management)", () => {
  beforeEach(() => {
    resetDedupeStore();
    resetRateLimitBuckets();
    resetTelemetryStore();
  });

  describe("A & B: Request Deduplication & Endpoint Protection", () => {
    it("coalesces concurrent identical async requests into a single execution", async () => {
      let executionCount = 0;

      const expensiveOperation = async () => {
        executionCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: "studio-availability-july" };
      };

      // 5 concurrent requests with identical key
      const results = await Promise.all([
        dedupeRequest("availability:2027-07", expensiveOperation),
        dedupeRequest("availability:2027-07", expensiveOperation),
        dedupeRequest("availability:2027-07", expensiveOperation),
        dedupeRequest("availability:2027-07", expensiveOperation),
        dedupeRequest("availability:2027-07", expensiveOperation),
      ]);

      // All 5 callers got the exact same data
      for (const res of results) {
        expect(res).toEqual({ data: "studio-availability-july" });
      }

      // But the expensive operation only ran ONCE!
      expect(executionCount).toBe(1);

      // Verify stats recorded deduplication
      const stats = getDedupeStats();
      expect(stats.totalDeduplicated).toBe(4);
      expect(stats.inFlightCount).toBe(0); // Cleaned up when finished
    });

    it("runs subsequent requests after the first has completed without deadlock", async () => {
      let executionCount = 0;
      const operation = async () => {
        executionCount++;
        return `run-${executionCount}`;
      };

      const first = await dedupeRequest("task-key", operation);
      const second = await dedupeRequest("task-key", operation);

      expect(first).toBe("run-1");
      expect(second).toBe("run-2");
      expect(executionCount).toBe(2);
    });

    it("enforces sliding window limits and rejects excessive requests", () => {
      const key = "test-client-ip";
      const max = 3;
      const windowMs = 60_000;
      const now = 1_000_000;

      expect(checkSlidingWindowLimit(key, max, windowMs, now).allowed).toBe(true);
      expect(checkSlidingWindowLimit(key, max, windowMs, now + 1000).allowed).toBe(true);
      expect(checkSlidingWindowLimit(key, max, windowMs, now + 2000).allowed).toBe(true);

      // 4th request within window is blocked
      const blocked = checkSlidingWindowLimit(key, max, windowMs, now + 3000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("protectEndpoint throws 429 when rate limit exceeded", () => {
      const makeReq = () =>
        new NextRequest("http://localhost:3000/api/test", {
          headers: { "x-forwarded-for": "192.168.1.100", "user-agent": "Mozilla/5.0" },
        });

      const options = {
        keyPrefix: "test-ep",
        maxRequests: 2,
        windowMs: 60_000,
      };

      expect(() => protectEndpoint(makeReq(), options)).not.toThrow();
      expect(() => protectEndpoint(makeReq(), options)).not.toThrow();

      // 3rd request throws ProblemError with 429
      expect(() => protectEndpoint(makeReq(), options)).toThrowError();
    });

    it("identifies and blocks malicious scanner user agents", () => {
      expect(isBotOrMaliciousCrawler("sqlmap/1.5")).toBe(true);
      expect(isBotOrMaliciousCrawler("Nikto/2.1")).toBe(true);
      expect(isBotOrMaliciousCrawler("masscan/1.0")).toBe(true);
      expect(isBotOrMaliciousCrawler("")).toBe(true);
      expect(isBotOrMaliciousCrawler(null)).toBe(true);
      expect(isBotOrMaliciousCrawler("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
    });
  });

  describe("C: Database Connection Management & Serverless Resilience", () => {
    it("reports singleton connection status and active reuse", () => {
      const status = getDbConnectionStatus();
      expect(status.engine).toBe("pglite");
      expect(status.reusedSingleton).toBe(true);
    });

    it("has all required migration and seed SQL fallbacks embedded for serverless environments", async () => {
      const { EMBEDDED_SQL_FILES } = await import("@/lib/schema-sql");
      const migration0001 = EMBEDDED_SQL_FILES["supabase/migrations/0001_hephzibah_schema.sql"];
      expect(migration0001).toBeDefined();
      expect(migration0001?.length).toBeGreaterThan(1000);
      expect(EMBEDDED_SQL_FILES["supabase/seed.sql"]).toBeDefined();
    });
  });

  describe("D: Logging, Metrics & Telemetry", () => {
    it("tracks most frequently called API routes and calculates current RPM", () => {
      const baseTime = 2_000_000;

      // Simulate 10 requests to availability, 3 to bookings, 1 to pricing
      for (let i = 0; i < 10; i++) {
        recordApiRequest("GET", "/api/availability", 12.5, baseTime + i * 100);
      }
      for (let i = 0; i < 3; i++) {
        recordApiRequest("POST", "/api/bookings", 45.0, baseTime + 2000 + i * 100);
      }
      recordApiRequest("GET", "/pricing", 5.0, baseTime + 3000);

      const metrics = getTelemetryMetrics(baseTime + 4000);

      expect(metrics.requests.total).toBe(14);
      expect(metrics.requests.currentRpm).toBe(14);
      expect(metrics.requests.mostFrequentlyCalled[0]?.route).toBe("GET /api/availability");
      expect(metrics.requests.mostFrequentlyCalled[0]?.count).toBe(10);
      expect(metrics.requests.mostFrequentlyCalled[1]?.route).toBe("POST /api/bookings");
      expect(metrics.requests.mostFrequentlyCalled[1]?.count).toBe(3);
    });

    it("ranks the slowest API endpoints by maximum and average duration", () => {
      recordApiRequest("GET", "/api/fast", 2.0);
      recordApiRequest("GET", "/api/fast", 3.0);
      recordApiRequest("POST", "/api/heavy-computation", 120.0);
      recordApiRequest("POST", "/api/heavy-computation", 90.0);

      const metrics = getTelemetryMetrics();
      const slowest = metrics.requests.slowestEndpoints;

      expect(slowest[0]?.route).toBe("POST /api/heavy-computation");
      expect(slowest[0]?.maxDurationMs).toBe(120);
      expect(slowest[0]?.avgDurationMs).toBe(105);
    });

    it("records database query execution durations and tracks slowest queries", () => {
      recordDbQuery("select * from site_settings where id = 1", 3.2);
      recordDbQuery("select * from bookings where status = 'confirmed'", 28.7);
      recordDbQuery("select 1", 0.8);

      const metrics = getTelemetryMetrics();

      expect(metrics.database.totalQueries).toBe(3);
      expect(metrics.database.avgQueryDurationMs).toBeGreaterThan(0);
      expect(metrics.database.slowestQueries[0]?.durationMs).toBe(28.7);
      expect(metrics.database.slowestQueries[0]?.querySummary).toContain("bookings");
    });

    it("measures CPU consumption and wall-clock execution for functions", async () => {
      const measured = await measureFunctionExecution("test-hash-cpu", async () => {
        let sum = 0;
        for (let i = 0; i < 100_000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      });

      expect(measured.label).toBe("test-hash-cpu");
      expect(measured.durationMs).toBeGreaterThanOrEqual(0);
      expect(measured.cpuMicroseconds.total).toBeGreaterThanOrEqual(0);
      expect(measured.result).toBeGreaterThan(0);
    });
  });

  describe("E: Next.js Middleware Route Controls", () => {
    it("blocks scanner bot user agents at the edge with 403 Forbidden", () => {
      const botReq = new NextRequest("http://localhost:3000/api/bookings", {
        headers: { "user-agent": "sqlmap/1.4" },
      });
      const response = middleware(botReq);
      expect(response.status).toBe(403);
      expect(response.headers.get("x-bot-blocked")).toBe("true");
    });

    it("fast-redirects unauthenticated users visiting /admin to /admin/sign-in without running server components", () => {
      const adminReq = new NextRequest("http://localhost:3000/admin/bookings", {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      const response = middleware(adminReq);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/admin/sign-in");
    });

    it("allows authenticated admin requests with hm_admin_session cookie", () => {
      const adminReq = new NextRequest("http://localhost:3000/admin/bookings", {
        headers: {
          "user-agent": "Mozilla/5.0",
          cookie: "hm_admin_session=valid.token.here",
        },
      });
      const response = middleware(adminReq);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    });
  });
});
