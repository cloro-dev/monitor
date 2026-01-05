import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';

interface CachedSession {
  session: any;
  timestamp: number;
}

export interface CachedAuthAndOrgData {
  user: {
    id: string;
    name: string;
    email: string;
  };
  session: {
    id: string;
    activeOrganizationId: string | null;
  };
  activeOrganization?: {
    id: string;
    name: string;
    slug: string;
  };
  allOrganizations?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

// Simple in-memory cache with TTL
const sessionCache = new Map<string, CachedSession>();
const authAndOrgCache = new Map<
  string,
  { data: CachedAuthAndOrgData; timestamp: number }
>();
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

/**
 * Get authentication and organization data with caching
 * Fetches both auth session and organization data in a single optimized query
 * Returns null if not authenticated
 */
export async function getCachedAuthAndOrgSession(
  requestHeaders?: Headers,
): Promise<CachedAuthAndOrgData | null> {
  try {
    const headersToUse = requestHeaders || (await headers());

    // Get Better Auth session first
    const authSession = await auth.api.getSession({
      headers: headersToUse,
    });

    if (!authSession?.user?.id || !authSession.session?.id) {
      return null;
    }

    // Extract token from headers for cache key
    const authHeader =
      headersToUse.get('cookie') || headersToUse.get('authorization') || '';
    const cacheKey = `authAndOrg:${Buffer.from(authHeader).toString('base64')}`;

    // Check cache first
    const cached = authAndOrgCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // Fetch session with organization data in a single optimized query
    const sessionData = await prisma.session.findUnique({
      where: {
        id: authSession.session.id,
      },
      select: {
        id: true,
        activeOrganizationId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            members: {
              select: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sessionData) {
      return null;
    }

    // Extract organizations from members
    const allOrganizations = sessionData.user.members.map(
      (member: any) => member.organization,
    );

    // Find active organization
    const activeOrganization = sessionData.activeOrganizationId
      ? allOrganizations.find(
          (org: any) => org.id === sessionData.activeOrganizationId,
        )
      : undefined;

    // Prepare cached data
    const data: CachedAuthAndOrgData = {
      user: {
        id: sessionData.user.id,
        name: sessionData.user.name,
        email: sessionData.user.email,
      },
      session: {
        id: sessionData.id,
        activeOrganizationId: sessionData.activeOrganizationId,
      },
      activeOrganization,
      allOrganizations,
    };

    // Cache the result with LRU eviction
    if (authAndOrgCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = authAndOrgCache.keys().next().value;
      if (oldestKey) {
        authAndOrgCache.delete(oldestKey);
      }
    }

    authAndOrgCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error('Error getting cached auth and org session:', error);
    return null;
  }
}

/**
 * Clear auth and org cache for a specific session
 * Called when session data changes (e.g., active organization updates)
 */
export function clearAuthAndOrgCache(requestHeaders?: Headers): void {
  try {
    const authHeader =
      requestHeaders?.get('cookie') ||
      requestHeaders?.get('authorization') ||
      '';
    const cacheKey = `authAndOrg:${Buffer.from(authHeader).toString('base64')}`;
    authAndOrgCache.delete(cacheKey);
  } catch (error) {
    console.error('Error clearing auth and org cache:', error);
  }
}

/**
 * Clear all expired auth and org cache entries
 */
export function cleanupExpiredAuthAndOrgCache(): void {
  const now = Date.now();
  for (const [key, cached] of authAndOrgCache.entries()) {
    if (now - cached.timestamp >= CACHE_TTL_MS) {
      authAndOrgCache.delete(key);
    }
  }
}

// Auto-cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessionCache, 60 * 1000);
  setInterval(cleanupExpiredAuthAndOrgCache, 60 * 1000);
}
