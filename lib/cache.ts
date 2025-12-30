/**
 * Simple in-memory cache for reducing database query load
 * Suitable for caching frequently accessed data that doesn't change often
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    // Default TTL: 5 minutes
    this.defaultTTL = defaultTTL;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get a value from cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache with optional TTL
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific entry from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or set pattern - fetch from cache, or compute and cache if not present
   */
  async getOrSet(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Global cache instances for common use cases
 */

// Cache for organization brands (changes rarely)
export const organizationBrandsCache = new SimpleCache<any[]>(
  10 * 60 * 1000, // 10 minutes
);

// Cache for brands (changes rarely)
export const brandsCache = new SimpleCache<Map<string, any>>(
  10 * 60 * 1000, // 10 minutes
);

// Cache for source metrics (changes daily)
export const sourceMetricsCache = new SimpleCache<any>(2 * 60 * 1000); // 2 minutes

// Cache for brand metrics (changes daily)
export const brandMetricsCache = new SimpleCache<any>(2 * 60 * 1000); // 2 minutes
