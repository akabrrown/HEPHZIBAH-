/**
 * In-memory TTL cache for reducing repeated database queries.
 * Zero-cost, zero external dependencies.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlSeconds: number = 300): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
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
