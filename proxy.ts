import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware for authentication and route protection
// Leverages Next.js 16 middleware capabilities for session validation

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/api/auth/[...all]', // Better Auth endpoints
  '/api/countries', // Public API for country list
];

// Dashboard routes that require authentication
const dashboardRoutes = [
  '/dashboard',
  '/sources',
  '/competitors',
  '/prompts',
  '/settings',
];

// API routes that require authentication (excluding public ones)
const protectedApiRoutes = [
  '/api/brands',
  '/api/sources',
  '/api/competitors',
  '/api/prompts',
  '/api/organizations',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a public route
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes('[')) {
      // Handle dynamic routes like '/api/auth/[...all]'
      const routePattern = route.replace('[...]', '').replace('[]', '');
      return pathname.startsWith(routePattern);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if this is a dashboard or protected API route
  const isDashboardRoute = dashboardRoutes.some((route) =>
    pathname.startsWith(route),
  );
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!isDashboardRoute && !isProtectedApiRoute) {
    return NextResponse.next();
  }

  // For protected routes, check if session exists via cookie
  // We can't do full DB validation in proxy, but we can check for session cookie
  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token');

  if (!sessionCookie) {
    // No session cookie found
    if (isDashboardRoute) {
      // Redirect to login for dashboard routes
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Return 401 for API routes
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Session cookie exists, allow request to proceed
  // Full validation happens in API routes with caching
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
