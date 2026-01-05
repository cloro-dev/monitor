import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { eachDayOfInterval, subDays, format } from 'date-fns';
import { z } from 'zod';
import { getSessionWithOrganization } from '@/lib/session-cache';

const competitorsQuerySchema = z.object({
  brandId: z.string().min(1, 'Brand ID is required'),
  includeStats: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

// Cache control headers for GET requests
const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
};

export async function GET(req: NextRequest) {
  try {
    // Use unified session + organization helper (single optimized query)
    const sessionData = await getSessionWithOrganization(req.headers);

    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { activeOrganizationId, organization } = sessionData;

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedParams = competitorsQuerySchema.parse(queryParams);
    const { brandId, includeStats } = validatedParams;

    // 1. Get all brands for the organization through the join table to create a lookup map
    const brands = await prisma.brand.findMany({
      where: {
        organizationBrands: {
          some: {
            organizationId: activeOrganizationId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
      },
    });
    const brandMap = new Map(
      brands.map((brand: any) => [brand.id, brand.name]),
    );
    const brandsById = new Map(brands.map((brand: any) => [brand.id, brand]));

    // Get selected brand name for API response
    const selectedBrand = brandId ? brandsById.get(brandId) : null;
    const selectedBrandName = selectedBrand?.name || 'Unknown';

    const LOOKBACK_DAYS = 90;

    if (includeStats && brandId) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - LOOKBACK_DAYS);

      // Get pre-calculated metrics from BrandMetrics table
      const brandMetricsData = await prisma.brandMetrics.findMany({
        where: {
          brandId: brandId,
          organizationId: activeOrganizationId,
          date: {
            gte: startDate,
          },
        },
        include: {
          brand: true,
          competitor: true,
        },
        orderBy: { date: 'desc' },
      });

      // Get competitor relationships for context
      const competitorsRel = await prisma.competitor.findMany({
        where: {
          brandId: brandId,
        },
        include: {
          competitor: true,
        },
      });

      // Create competitor lookup map
      const competitorMap = new Map(
        competitorsRel.map((rel: any) => [
          rel.competitorId,
          {
            id: rel.id,
            status: rel.status,
            mentions: rel.mentions,
            createdAt: rel.createdAt,
          },
        ]),
      );

      // Aggregate metrics by competitor (only keep the latest metrics per competitor)
      const metricsAggregation = new Map<
        string,
        {
          id: string;
          brandId: string;
          name: string;
          domain: string;
          status: string;
          mentions: number;
          createdAt: Date;
          brand: string;
          visibilityScore: number;
          averagePosition: number | null;
          averageSentiment: number | null;
          isOwnBrand: boolean;
        }
      >();

      // Process the latest metrics for each competitor
      const processedCompetitors = new Set<string>();

      for (const metric of brandMetricsData) {
        const key = metric.competitorId
          ? `competitor_${metric.competitorId}`
          : `own_${metric.brandId}`;

        if (!processedCompetitors.has(key)) {
          const competitorInfo = competitorMap.get(metric.competitorId || '');
          const competitorBrand = metric.competitor;
          const isOwnBrand = !metric.competitorId;

          metricsAggregation.set(key, {
            id: metric.competitorId || `own-brand-${metric.brandId}`,
            brandId: metric.brandId,
            name: competitorBrand?.name || metric.brand.name || 'Unknown',
            domain: competitorBrand?.domain || metric.brand.domain || '',
            status: isOwnBrand ? 'ACCEPTED' : competitorInfo?.status || null,
            mentions: isOwnBrand ? 0 : competitorInfo?.mentions || 0,
            createdAt: competitorInfo?.createdAt || metric.brand.createdAt,
            brand: selectedBrandName,
            visibilityScore: metric.visibilityScore || 0,
            averagePosition: metric.averagePosition,
            averageSentiment: metric.averageSentiment,
            isOwnBrand,
          });

          processedCompetitors.add(key);
        }
      }

      // Convert to array
      let formattedCompetitors = Array.from(metricsAggregation.values());

      // Sort by visibility score (highest first)
      formattedCompetitors.sort(
        (a, b) => b.visibilityScore - a.visibilityScore,
      );

      // For chart data, get top 5 competitors + own brand
      const topCompetitors = formattedCompetitors
        .filter((c) => !c.isOwnBrand && c.status === 'ACCEPTED')
        .slice(0, 5);

      // Include own brand in chart if it has metrics
      const ownBrandMetrics = formattedCompetitors.find((c) => c.isOwnBrand);
      const brandsToChart = [
        ...(ownBrandMetrics
          ? [{ id: brandId, name: ownBrandMetrics.name }]
          : []),
        ...topCompetitors.map((comp) => ({ id: comp.id, name: comp.name })),
      ];

      // Generate Chart Data (Daily Visibility for selected brand and top 5 competitors)
      const chartMap = new Map<string, any>();

      // Pre-fill chartMap with all dates in the lookback range using date-fns
      const dates = eachDayOfInterval({
        start: subDays(new Date(), LOOKBACK_DAYS),
        end: new Date(),
      });

      dates.forEach((d) => {
        const dateKey = format(d, 'yyyy-MM-dd');
        const dailyEntry: { date: string; [key: string]: string | number } = {
          date: dateKey,
        };
        brandsToChart.forEach((brand) => {
          dailyEntry[brand.name] = 0;
        });
        chartMap.set(dateKey, dailyEntry);
      });

      // Get daily metrics for chart data
      const dailyMetrics = await prisma.brandMetrics.findMany({
        where: {
          brandId,
          organizationId: activeOrganizationId,
          date: { gte: startDate },
          OR: [
            { competitorId: null }, // Own brand
            ...brandsToChart
              .filter((b) => b.id !== brandId) // Exclude own brand from competitor filter
              .map((b) => ({ competitorId: b.id })),
          ],
        },
        include: { competitor: true },
        orderBy: { date: 'asc' },
      });

      // Populate chart data
      dailyMetrics.forEach((metric) => {
        const dateKey = format(metric.date, 'yyyy-MM-dd');
        const entry = chartMap.get(dateKey);
        const brandName =
          metric.competitor?.name || brandsById.get(brandId)?.name;

        if (
          entry &&
          brandName &&
          brandsToChart.some((b) => b.name === brandName)
        ) {
          entry[brandName] = metric.visibilityScore || 0;
        }
      });

      const chartData = Array.from(chartMap.values());

      return NextResponse.json(
        {
          selectedBrandName,
          competitors: formattedCompetitors,
          brandsToChart,
          chartData,
        },
        { headers: CACHE_HEADERS },
      );
    }

    // If no stats requested, return basic competitor list for the specified brand
    const competitorsRel = await prisma.competitor.findMany({
      where: {
        brandId: brandId, // brandId is now guaranteed to exist from validation
        mentions: {
          gte: 3,
        },
      },
      include: {
        competitor: true,
      },
      orderBy: [{ mentions: 'desc' }, { createdAt: 'desc' }],
    });

    const formattedCompetitors = competitorsRel.map((rel: any) => ({
      id: rel.id,
      brandId: rel.brandId,
      name: rel.competitor.name,
      domain: rel.competitor.domain,
      status: rel.status,
      mentions: rel.mentions,
      createdAt: rel.createdAt,
      brand: brandMap.get(rel.brandId) || 'Unknown',
      visibilityScore: null,
      averagePosition: null,
      averageSentiment: null,
    }));

    return NextResponse.json(formattedCompetitors, { headers: CACHE_HEADERS });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Failed to fetch competitors data:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch competitors data. Please try again later.',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, status } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Missing competitor ID' },
        { status: 400 },
      );
    }

    // Find the competitor record to update
    const competitor = await prisma.competitor.findUnique({
      where: { id },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: 'Competitor not found' },
        { status: 404 },
      );
    }

    // Update the competitor status
    const updatedCompetitor = await prisma.competitor.update({
      where: { id },
      data: { status: status as 'ACCEPTED' | 'REJECTED' | null },
    });

    return NextResponse.json(updatedCompetitor);
  } catch (error) {
    console.error('Failed to update competitor status:', error);
    return NextResponse.json(
      { error: 'Failed to update competitor status' },
      { status: 500 },
    );
  }
}
