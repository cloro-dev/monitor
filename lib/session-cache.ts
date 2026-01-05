import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

interface CachedSession {
  session: any;
  timestamp: number;
}

interface CachedSessionWithOrg {
  session: any;
  activeOrganizationId: string | null;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    aiModels: string[];
  } | null;
  timestamp: number;
}

// Simple in-memory cache with TTL
const sessionCache = new Map<string, CachedSession>();
const sessionWithOrgCache = new Map<string, CachedSessionWithOrg>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

/**
 * Generate a short hash for cache key instead of base64 encoding entire header
 */
function generateCacheKey(authHeader: string): string {
  return crypto.createHash('md5').update(authHeader).digest('hex').slice(0, 16);
}

/**
 * Get session with caching to reduce repeated database queries
 */
export async function getCachedSession(requestHeaders?: Headers): Promise<any> {
  try {
    const headersToUse = requestHeaders || (await headers());

    // Extract token from headers for cache key
    const authHeader =
      headersToUse.get('cookie') || headersToUse.get('authorization') || '';
    const cacheKey = `session:${generateCacheKey(authHeader)}`;

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
 * Result type for getSessionWithOrganization
 */
export interface SessionWithOrganization {
  session: {
    user: {
      id: string;
      email: string;
      name: string;
      [key: string]: any;
    };
    session: {
      id: string;
      [key: string]: any;
    };
  };
  activeOrganizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
    aiModels: string[];
  };
}

/**
 * Unified helper that combines session authentication AND organization lookup
 * in a single optimized database query. This eliminates the duplicate auth + org
 * queries pattern used across multiple API routes.
 *
 * @param requestHeaders - The request headers containing auth cookies/tokens
 * @returns Session with organization data, or null if unauthorized
 */
export async function getSessionWithOrganization(
  requestHeaders: Headers,
): Promise<SessionWithOrganization | null> {
  try {
    const authHeader =
      requestHeaders.get('cookie') || requestHeaders.get('authorization') || '';
    const cacheKey = `session-org:${generateCacheKey(authHeader)}`;

    // Check cache first
    const cached = sessionWithOrgCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (
        !cached.session ||
        !cached.activeOrganizationId ||
        !cached.organization
      ) {
        return null;
      }
      return {
        session: cached.session,
        activeOrganizationId: cached.activeOrganizationId,
        organization: cached.organization,
      };
    }

    // Step 1: Get authenticated session from Better Auth
    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    if (!session?.user?.id) {
      // Cache the null result to avoid repeated auth calls for invalid sessions
      cacheSessionWithOrg(cacheKey, null, null, null);
      return null;
    }

    // Step 2: Get active organization in a single optimized query
    // This replaces the deep nested include pattern with a more efficient query
    const userSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        activeOrganizationId: true,
      },
    });

    if (!userSession?.activeOrganizationId) {
      cacheSessionWithOrg(cacheKey, session, null, null);
      return null;
    }

    // Step 3: Get organization details (only if needed)
    const organization = await prisma.organization.findUnique({
      where: {
        id: userSession.activeOrganizationId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        aiModels: true,
      },
    });

    if (!organization) {
      cacheSessionWithOrg(
        cacheKey,
        session,
        userSession.activeOrganizationId,
        null,
      );
      return null;
    }

    // Cache the successful result
    cacheSessionWithOrg(cacheKey, session, userSession.activeOrganizationId, {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      aiModels: (organization.aiModels as string[]) || [],
    });

    return {
      session,
      activeOrganizationId: userSession.activeOrganizationId,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        aiModels: (organization.aiModels as string[]) || [],
      },
    };
  } catch (error) {
    console.error('Error getting session with organization:', error);
    return null;
  }
}

/**
 * Helper to cache session with organization data
 */
function cacheSessionWithOrg(
  cacheKey: string,
  session: any,
  activeOrganizationId: string | null,
  organization: CachedSessionWithOrg['organization'],
): void {
  if (sessionWithOrgCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = sessionWithOrgCache.keys().next().value;
    if (oldestKey) {
      sessionWithOrgCache.delete(oldestKey);
    }
  }

  sessionWithOrgCache.set(cacheKey, {
    session,
    activeOrganizationId,
    organization,
    timestamp: Date.now(),
  });
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
    const cacheKey = generateCacheKey(authHeader);
    sessionCache.delete(`session:${cacheKey}`);
    sessionWithOrgCache.delete(`session-org:${cacheKey}`);
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
  for (const [key, cached] of sessionWithOrgCache.entries()) {
    if (now - cached.timestamp >= CACHE_TTL_MS) {
      sessionWithOrgCache.delete(key);
    }
  }
}

// Auto-cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessionCache, 60 * 1000);
}
