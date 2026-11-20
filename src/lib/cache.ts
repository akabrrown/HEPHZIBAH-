/**
 * In-memory TTL cache for reducing repeated database queries.
 * Zero-cost, zero external dependencies.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_CACHE_ENTRIES = 500;
const store = new Map<string, CacheEntry<unknown>>();

function pruneIfNeeded(now: number): void {
  if (store.size < MAX_CACHE_ENTRIES) return;
  for (const [k, v] of store.entries()) {
    if (now > v.expiresAt) {
      store.delete(k);
    }
  }
  while (store.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) break;
    store.delete(oldestKey);
  }
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  // Refresh LRU order on read
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlSeconds: number = 300): void {
  const now = Date.now();
  store.delete(key);
  pruneIfNeeded(now);
  store.set(key, {
    value,
    expiresAt: now + ttlSeconds * 1000,
  });
}

export function invalidateCache(prefixOrKey?: string): void {
  if (!prefixOrKey) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k === prefixOrKey || k.startsWith(`${prefixOrKey}:`)) {
      store.delete(k);
    }
  }
}
