import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface CachedSession {
  session: any;
  timestamp: number;
}

// Simple in-memory cache with TTL
const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

/**
 * Get session with caching to reduce repeated database queries
 */
export async function getCachedSession(requestHeaders?: Headers): Promise<any> {
  try {
    const headersToUse = requestHeaders || (await headers());

    // Extract token from headers for cache key
    const authHeader =
      headersToUse.get('cookie') || headersToUse.get('authorization') || '';
    const cacheKey = `session:${Buffer.from(authHeader).toString('base64')}`;

    // Check cache first
    const cached = sessionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.session;
    }

    // If not in cache or expired, fetch fresh session
    const session = await auth.api.getSession({
      headers: headersToUse,
    });

    // Cache the result
    if (sessionCache.size >= MAX_CACHE_SIZE) {
      // Simple LRU: clear oldest entries
      const oldestKey = sessionCache.keys().next().value;
      if (oldestKey) {
        sessionCache.delete(oldestKey);
      }
    }

    sessionCache.set(cacheKey, {
      session,
      timestamp: Date.now(),
    });

    return session;
  } catch (error) {
    console.error('Error getting cached session:', error);
    return null;
  }
}

/**
 * Clear session cache for a specific session
 */
export function clearSessionCache(requestHeaders?: Headers): void {
  try {
    const authHeader =
      requestHeaders?.get('cookie') ||
      requestHeaders?.get('authorization') ||
      '';
    const cacheKey = `session:${Buffer.from(authHeader).toString('base64')}`;
    sessionCache.delete(cacheKey);
  } catch (error) {
    console.error('Error clearing session cache:', error);
  }
}

/**
 * Clear all expired session cache entries
 */
export function cleanupExpiredSessionCache(): void {
  const now = Date.now();
  for (const [key, cached] of sessionCache.entries()) {
    if (now - cached.timestamp >= CACHE_TTL_MS) {
      sessionCache.delete(key);
    }
  }
}

// Auto-cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessionCache, 60 * 1000);
}
