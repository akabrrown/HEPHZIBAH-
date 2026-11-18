/**
 * Request Deduplication (Single-Flight / In-Flight Coalescing)
 *
 * Prevents multiple identical asynchronous operations from executing concurrently.
 * When multiple identical requests (e.g., availability queries, public settings lookups,
 * or concurrent idempotent submissions) arrive simultaneously, the first request
 * initiates the asynchronous execution. All concurrent callers share and await
 * the exact same in-flight Promise, eliminating redundant database queries and CPU load.
 */

const inFlight = new Map<string, Promise<unknown>>();

export interface DedupeStats {
  inFlightCount: number;
  totalDeduplicated: number;
}

let totalDeduplicatedCount = 0;

/**
 * Executes or joins an in-flight asynchronous operation identified by `key`.
 *
 * @param key Unique string identifier for the operation (e.g. `availability:2027-07`)
 * @param factory Async function producing the value if not already in flight
 * @returns The resolved value of the shared or newly executed Promise
 */
export async function dedupeRequest<T>(
  key: string,
  factory: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    totalDeduplicatedCount++;
    return existing;
  }

  const promise = (async () => {
    try {
      return await factory();
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

/**
 * Returns current metrics on in-flight coalesced requests.
 */
export function getDedupeStats(): DedupeStats {
  return {
    inFlightCount: inFlight.size,
    totalDeduplicated: totalDeduplicatedCount,
  };
}

/**
 * Clears any in-flight promises (primarily for testing isolation).
 */
export function resetDedupeStore(): void {
  inFlight.clear();
  totalDeduplicatedCount = 0;
}
