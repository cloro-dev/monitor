import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { getSourcesAnalyticsData } from '@/lib/source-service';
import { logError, logInfo } from '@/lib/logger';

const sourcesQuerySchema = z.object({
  brandId: z.string().optional(),
  timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
  tab: z.enum(['domain', 'url']).default('domain'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(0).max(100).default(50), // 0 means all, max 100 for performance
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authentication
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validatedParams = sourcesQuerySchema.parse(queryParams);

    logInfo('SourcesAPI', 'Fetching optimized sources data', {
      userId: session.user.id,
      params: validatedParams,
    });

    // Get sources analytics data from service
    const data = await getSourcesAnalyticsData(
      session.user.id,
      validatedParams,
    );

    const duration = Date.now() - startTime;

    logInfo('SourcesAPI', 'Successfully fetched optimized sources data', {
      userId: session.user.id,
      duration: `${duration}ms`,
      domainStatsCount: data.domainStats.length,
      urlStatsCount: data.urlStats.length,
      totalPrompts: data.summary.totalPrompts,
    });

    return NextResponse.json({
      success: true,
      data,
      meta: {
        queryTime: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logError('SourcesAPI', 'Validation error', error, {
        duration: `${duration}ms`,
        queryParams: Object.fromEntries(
          new URL(request.url).searchParams.entries(),
        ),
      });

      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    logError('SourcesAPI', 'Error fetching sources data', error, {
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch sources data. Please try again later.',
      },
      { status: 500 },
    );
  }
}
