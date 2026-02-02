type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry if cache is full
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move the accessed item to the end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// Create separate caches for different types of data
const referenceDataCache = new LRUCache<any>(50); // For departments, roles, etc.
const userDataCache = new LRUCache<any>(200); // For user profiles, preferences
const listDataCache = new LRUCache<any>(100); // For paginated lists

// Cache durations
export const CACHE_DURATIONS = {
  REFERENCE_DATA: 60 * 60 * 1000, // 1 hour
  USER_DATA: 5 * 60 * 1000, // 5 minutes
  LIST_DATA: 30 * 1000, // 30 seconds
} as const;

// Helper functions for common cache operations
export function getCachedReferenceData<T>(key: string): T | undefined {
  return referenceDataCache.get(key) as T;
}

export function setCachedReferenceData<T>(key: string, value: T): void {
  referenceDataCache.set(key, value, CACHE_DURATIONS.REFERENCE_DATA);
}

export function getCachedUserData<T>(key: string): T | undefined {
  return userDataCache.get(key) as T;
}

export function setCachedUserData<T>(key: string, value: T): void {
  userDataCache.set(key, value, CACHE_DURATIONS.USER_DATA);
}

export function getCachedListData<T>(key: string): T | undefined {
  return listDataCache.get(key) as T;
}

export function setCachedListData<T>(key: string, value: T): void {
  listDataCache.set(key, value, CACHE_DURATIONS.LIST_DATA);
}

// Function to generate consistent cache keys
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `${prefix}|${sortedParams}`;
}

// Example usage:
// const departmentsKey = generateCacheKey('departments', { active: true });
// const departments = getCachedReferenceData(departmentsKey) || await fetchDepartments();