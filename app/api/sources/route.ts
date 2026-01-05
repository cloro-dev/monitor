import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { getSourcesAnalyticsData } from '@/lib/source-service';
import { sourceMetricsService } from '@/lib/source-metrics-service';
import { logError, logInfo, logWarn } from '@/lib/logger';
import prisma from '@/lib/prisma';

const sourcesQuerySchema = z.object({
  brandId: z.string().min(1, 'Brand ID is required'),
  timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
  tab: z.enum(['domain', 'url']).default('domain'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50), // Require at least 1, max 100 for performance
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

    logInfo('SourcesAPI', 'Fetching sources data', {
      userId: session.user.id,
      params: validatedParams,
    });

    // Get user's active organization first
    const userSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        activeOrganizationId: true,
      },
    });

    const organizationId = userSession?.activeOrganizationId;

    if (!organizationId) {
      logWarn('SourcesAPI', 'No active organization found', {
        userId: session.user.id,
      });
      // Return empty data structure if no org
      return NextResponse.json({
        success: true,
        data: {
          domainStats: [],
          urlStats: [],
          chartData: { data: [], config: {} },
          summary: {
            totalPrompts: 0,
            totalResults: 0,
            totalDomains: 0,
            totalUrls: 0,
          },
          pagination: {
            page: validatedParams.page,
            limit: validatedParams.limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    // Get sources analytics data from service (now using organizationId)
    const analyticsData = await getSourcesAnalyticsData(
      organizationId,
      validatedParams,
    );

    // Get time-series chart data from source metrics service
    let chartData: { data: any[]; config: any } = { data: [], config: {} };

    try {
      logInfo('SourcesAPI', 'Calling source metrics service', {
        brandId: validatedParams.brandId,
        organizationId,
        timeRange: validatedParams.timeRange,
        tab: validatedParams.tab,
      });

      chartData = await sourceMetricsService.getSourceUtilizationChart(
        validatedParams.brandId,
        organizationId,
        validatedParams.timeRange,
        validatedParams.tab,
        5, // top 5 sources for chart
      );
    } catch (chartError) {
      logWarn('SourcesAPI', 'Chart data fetch failed, using empty data', {
        brandId: validatedParams.brandId,
        error:
          chartError instanceof Error ? chartError.message : String(chartError),
      });
    }

    // Combine analytics data with chart data
    const data = {
      ...analyticsData,
      chartData,
    };

    const duration = Date.now() - startTime;

    logInfo('SourcesAPI', 'Successfully fetched sources data', {
      userId: session.user.id,
      duration: `${duration}ms`,
      domainStatsCount: data.domainStats.length,
      urlStatsCount: data.urlStats.length,
      totalPrompts: data.summary.totalPrompts,
      chartDataPoints: chartData.data.length,
      chartConfigKeys: Object.keys(chartData.config).length,
      hasChartData: chartData.data.length > 0,
    });

    const responseData = {
      success: true,
      data,
      meta: {
        queryTime: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    };

    logInfo('SourcesAPI', 'Returning response', {
      userId: session.user.id,
      responseKeys: Object.keys(responseData),
      hasChartData: responseData.data.chartData?.data?.length > 0,
      chartDataLength: responseData.data.chartData?.data?.length || 0,
    });

    return NextResponse.json(responseData);
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
