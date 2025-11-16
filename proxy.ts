import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup", "/reset-password", "/reset-password/confirm", "/api/auth"];

// Define static assets that should be accessible
const staticRoutes = ["/_next", "/favicon", "/images", "/fonts"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets
  if (staticRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip middleware for API auth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For protected routes, check for session cookie (optimistic redirect)
  // This follows Better Auth's recommended pattern
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // No session cookie found, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists - allow access
  // Note: This is an optimistic check. Server-side validation should still happen
  // in protected layouts and API routes for security-critical operations
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
