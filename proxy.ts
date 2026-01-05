import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge Proxy for authentication and request optimization
 *
 * This proxy runs at the Edge (before your application code) and provides:
 * 1. Fast authentication checks without hitting the database
 * 2. Early rejection of unauthenticated requests to protected routes
 * 3. Redirect handling for auth flows
 *
 * Benefits for Vercel Fluid CPU:
 * - Unauthenticated requests are rejected at the Edge, not in Node.js
 * - Reduces cold starts and CPU time for invalid requests
 * - Session cookie validation happens before API route execution
 */

// Routes that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/api/prompts',
  '/api/brands',
  '/api/competitors',
  '/api/sources',
  '/api/organizations',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_PAGES = ['/login', '/signup'];

// Public API routes that don't require authentication
const PUBLIC_API_PATHS = ['/api/auth', '/api/webhook'];

/**
 * Check if the request has a session cookie (Better Auth uses 'better-auth.session_token')
 * This is a fast check that doesn't validate the session, just checks for presence
 */
function hasSessionCookie(request: NextRequest): boolean {
  // Better Auth session cookie names
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');

  return !!sessionCookie?.value;
}

/**
 * Check if the path matches any of the given prefixes
 */
function pathMatchesAny(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname.startsWith(path));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files like .css, .js, .png, etc.
  ) {
    return NextResponse.next();
  }

  // Allow public API routes (auth endpoints, webhooks)
  if (pathMatchesAny(pathname, PUBLIC_API_PATHS)) {
    return NextResponse.next();
  }

  const hasSession = hasSessionCookie(request);

  // Protected routes: redirect to login if no session cookie
  if (pathMatchesAny(pathname, PROTECTED_PATHS)) {
    if (!hasSession) {
      // For API routes, return 401 instead of redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // For page routes, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Auth pages: redirect to dashboard if already has session cookie
  if (pathMatchesAny(pathname, AUTH_PAGES)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Home page: redirect based on auth status
  if (pathname === '/') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
