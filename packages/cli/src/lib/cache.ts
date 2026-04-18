// In-memory cache with TTL — avoids redundant API calls.

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

const DEFAULT_TTL = 5 * 60_000 // 5 minutes

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.data as T
}

export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheClear(key?: string): void {
  if (key) store.delete(key)
  else store.clear()
}
