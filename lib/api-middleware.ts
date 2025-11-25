import { NextRequest, NextResponse } from 'next/server';
import { getCachedSession } from '@/lib/session-cache';

/**
 * Middleware to authenticate requests and return session
 * Returns standardized error responses for unauthorized requests
 */
export async function withAuth(
  request: NextRequest,
): Promise<{ session: any; error?: NextResponse }> {
  const session = await getCachedSession(request.headers);

  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { session };
}

/**
 * Middleware to authenticate and ensure user has active organization
 */
export async function withOrganizationAuth(
  request: NextRequest,
): Promise<{ session: any; error?: NextResponse }> {
  const { session, error } = await withAuth(request);

  if (error) {
    return { session: null, error };
  }

  if (!session.session?.activeOrganizationId) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'No active organization' },
        { status: 400 },
      ),
    };
  }

  return { session };
}

/**
 * Standardized error handler for API routes
 */
export function handleApiError(
  error: any,
  context: string,
  operation: string,
): NextResponse {
  console.error(`Error in ${context}-${operation}:`, error);

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  return NextResponse.json(
    {
      error: isDevelopment ? error.message : 'Internal server error',
      ...(isDevelopment && { details: error }),
    },
    { status: 500 },
  );
}

/**
 * Success response helper
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
