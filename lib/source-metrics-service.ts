import prisma from '@/lib/prisma';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { ProviderModel } from '@prisma/client';
import { eachDayOfInterval, format, subDays } from 'date-fns';

interface SourceMetricsData {
  brandId: string;
  organizationId: string;
  sourceId: string;
  date: Date;
  model: ProviderModel;
  totalMentions: number;
  uniquePrompts: number;
  utilization: number;
}

// Helper function to get root domain (from source-service.ts)
function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

// Process URL to normalize it (from source-service.ts)
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
}

export class SourceMetricsService {
  /**
   * Process sources from a result and update SourceMetrics table (real-time webhook processing)
   */
  async processResultSources(
    resultId: string,
    preLoadedResult?: any,
  ): Promise<void> {
    logInfo('SourceMetricsProcessor', 'Starting source metrics processing', {
      resultId,
      hasPreLoadedResult: !!preLoadedResult,
    });

    try {
      // Get the result with all necessary relationships
      let result = preLoadedResult;

      if (!result) {
        result = await prisma.result.findUnique({
          where: { id: resultId },
          include: {
            sources: {
              select: {
                url: true,
                hostname: true,
                type: true,
              },
            },
            prompt: {
              include: {
                brand: {
                  include: {
                    organizationBrands: {
                      include: {
                        organization: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }

      if (!result || result.status !== 'SUCCESS') {
        logWarn('SourceMetricsProcessor', 'Skipping non-successful result', {
          resultId,
          status: result?.status,
        });
        return;
      }

      const brand = result.prompt.brand;
      const sources = result.sources;

      // Get all organizations that own this brand
      const organizations = brand.organizationBrands.map(
        (ob: any) => ob.organization,
      );
      if (organizations.length === 0) {
        logWarn('SourceMetricsProcessor', 'No organization found for brand', {
          resultId,
          brandId: brand.id,
        });
        return;
      }

      // Set date to start of day for daily aggregation (non-mutating)
      const resultDate = new Date(result.createdAt);
      const normalizedDate = new Date(
        Date.UTC(
          resultDate.getUTCFullYear(),
          resultDate.getUTCMonth(),
          resultDate.getUTCDate(),
        ),
      );

      // Process sources for each organization
      for (const organization of organizations) {
        try {
          // Group sources by normalized URL for this result
          const sourceMap = new Map<
            string,
            { url: string; hostname: string; type?: string }
          >();

          // Add existing sources from database
          sources.forEach((source: any) => {
            const cleanUrl = normalizeUrl(source.url);
            sourceMap.set(cleanUrl, {
              url: cleanUrl,
              hostname: source.hostname,
              type: source.type || undefined,
            });
          });

          // Create metrics for each unique source
          for (const [sourceUrl, sourceInfo] of sourceMap) {
            // Find or create source in database using upsert to handle race conditions
            const source = await prisma.source.upsert({
              where: { url: sourceUrl },
              update: {},
              create: {
                url: sourceInfo.url,
                hostname: sourceInfo.hostname,
                type: sourceInfo.type,
              },
            });

            if (source) {
              // Update source metrics using atomic upsert to handle race conditions
              await this.atomicUpsertSourceMetrics({
                brandId: brand.id,
                organizationId: organization.id,
                sourceId: source.id,
                date: normalizedDate,
                model: result.model as any,
                totalMentions: 1,
                uniquePrompts: 1,
              });
            }
          }

          logInfo(
            'SourceMetricsProcessor',
            'Successfully processed result sources',
            {
              resultId,
              organizationId: organization.id,
              brandId: brand.id,
              uniqueSources: sourceMap.size,
            },
          );
        } catch (error) {
          logError(
            'SourceMetricsProcessor',
            'Failed to process sources for organization',
            error,
            {
              resultId,
              organizationId: organization.id,
            },
          );
        }
      }
    } catch (error) {
      logError(
        'SourceMetricsProcessor',
        'Failed to process result sources',
        error,
        {
          resultId,
        },
      );
    }
  }

  /**
   * Atomic upsert source metrics data using Prisma's upsert to handle race conditions
   */
  private async atomicUpsertSourceMetrics(
    data: Omit<SourceMetricsData, 'utilization'>,
  ): Promise<void> {
    await prisma.sourceMetrics.upsert({
      where: {
        brandId_organizationId_sourceId_date_model: {
          brandId: data.brandId,
          organizationId: data.organizationId,
          sourceId: data.sourceId,
          date: data.date,
          model: data.model,
        },
      },
      update: {
        totalMentions: {
          increment: data.totalMentions,
        },
        uniquePrompts: {
          increment: data.uniquePrompts,
        },
        updatedAt: new Date(),
      },
      create: {
        brandId: data.brandId,
        organizationId: data.organizationId,
        sourceId: data.sourceId,
        date: data.date,
        model: data.model,
        totalMentions: data.totalMentions,
        uniquePrompts: data.uniquePrompts,
        utilization: 0, // Will be recalculated later
      },
    });
  }

  /**
   * Recalculate utilization percentages for all sources on a given date
   * This should be called after all results for the day have been processed
   */
  async recalculateDailyUtilization(
    brandId: string,
    organizationId: string,
    date: Date,
  ): Promise<void> {
    try {
      // Create date boundaries without mutating the input date
      const startDate = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      );
      const endDate = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() + 1,
        ),
      );

      // Get all source metrics for the day
      const dailySourceMetrics = await prisma.sourceMetrics.findMany({
        where: {
          brandId,
          organizationId,
          date: startDate,
        },
        include: {
          source: true,
        },
      });

      // Get total number of unique prompts for the day by using a raw query
      // This is more accurate than counting prompts with successful results
      const uniquePromptsResult = await prisma.$queryRaw<
        Array<{ count: bigint }>
      >`
        SELECT COUNT(DISTINCT r."promptId") as count
        FROM "result" r
        INNER JOIN "prompt" p ON r."promptId" = p.id
        WHERE p."brandId" = ${brandId}
        AND r.status = 'SUCCESS'
        AND r."createdAt" >= ${startDate}
        AND r."createdAt" < ${endDate}
      `;

      const totalDailyPrompts = Number(uniquePromptsResult[0]?.count || 0);

      if (totalDailyPrompts === 0) {
        return; // No prompts to calculate utilization against
      }

      // Update utilization for each source
      for (const metric of dailySourceMetrics) {
        const utilization = (metric.uniquePrompts / totalDailyPrompts) * 100;

        // Validate utilization bounds (should be between 0-100)
        const validatedUtilization = Math.max(0, Math.min(100, utilization));

        if (utilization < 0 || utilization > 100) {
          logWarn(
            'SourceMetricsProcessor',
            'Utilization calculation out of bounds',
            {
              brandId,
              organizationId,
              date: startDate.toISOString().split('T')[0],
              sourceId: metric.sourceId,
              uniquePrompts: metric.uniquePrompts,
              totalDailyPrompts,
              calculatedUtilization: utilization,
              validatedUtilization,
            },
          );
        }

        await prisma.sourceMetrics.update({
          where: { id: metric.id },
          data: {
            utilization: Math.round(validatedUtilization * 100) / 100, // Round to 2 decimal places
          },
        });
      }

      logInfo('SourceMetricsProcessor', 'Recalculated daily utilization', {
        brandId,
        organizationId,
        date: startDate.toISOString().split('T')[0],
        totalSources: dailySourceMetrics.length,
        totalPrompts: totalDailyPrompts,
      });
    } catch (error) {
      logError(
        'SourceMetricsProcessor',
        'Failed to recalculate daily utilization',
        error,
        {
          brandId,
          organizationId,
          date: date.toISOString().split('T')[0],
        },
      );
    }
  }

  /**
   * Get daily source utilization data for chart generation
   */
  async getSourceUtilizationChart(
    brandId: string,
    organizationId: string,
    timeRange: '7d' | '30d' | '90d',
    tab: 'domain' | 'url',
    limit: number = 5,
  ): Promise<{ data: any[]; config: any }> {
    const lookbackDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = subDays(new Date(), lookbackDays);

    // Get top sources by overall utilization for the time period
    const topSources = await this.getTopSources(
      brandId,
      organizationId,
      startDate,
      tab,
      limit,
    );

    if (topSources.length === 0) {
      return { data: [], config: {} };
    }

    // Generate chart data
    const chartConfig: any = {};
    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];

    // Create config for each source
    topSources.forEach((source: any, index: number) => {
      const key = `source_${index}`;
      let label = tab === 'domain' ? source.domain : source.url;

      if (tab === 'url' && label.length > 20) {
        label = `${label.substring(0, 17)}...`;
      }

      chartConfig[key] = {
        label,
        color: chartColors[index],
      };
    });

    // Pre-fill chart data with all dates
    const dates = eachDayOfInterval({
      start: startDate,
      end: new Date(),
    });

    const chartData = dates.map((day) => {
      const dayData: any = {
        date: format(day, 'MMM dd'),
      };

      topSources.forEach((_: any, index: number) => {
        const key = `source_${index}`;
        dayData[key] = 0; // Default to 0, will be populated with actual data
      });

      return dayData;
    });

    // Get daily metrics for all top sources
    const sourceIds = topSources.map((s: any) => s.sourceId);
    const dailyMetrics = await prisma.sourceMetrics.findMany({
      where: {
        brandId,
        organizationId,
        date: { gte: startDate },
        sourceId: { in: sourceIds },
      },
      include: { source: true },
      orderBy: { date: 'asc' },
    });

    // Group metrics by source
    const metricsBySource = new Map<string, any[]>();
    dailyMetrics.forEach((metric) => {
      const key = metric.sourceId;
      if (!metricsBySource.has(key)) {
        metricsBySource.set(key, []);
      }
      metricsBySource.get(key)!.push(metric);
    });

    // Validate chart data structure
    if (!chartData || chartData.length === 0) {
      logWarn('SourceMetricsChart', 'Generated empty chart data', {
        brandId,
        organizationId,
        timeRange,
        topSourcesCount: topSources.length,
        dailyMetricsCount: dailyMetrics.length,
      });
    }

    // Populate chart data with actual utilization values
    dates.forEach((day, dayIndex) => {
      const dateKey = format(day, 'yyyy-MM-dd');

      topSources.forEach((source: any, sourceIndex: number) => {
        const key = `source_${sourceIndex}`;
        const sourceMetrics = metricsBySource.get(source.sourceId) || [];
        const dayMetric = sourceMetrics.find(
          (m: any) => format(m.date, 'yyyy-MM-dd') === dateKey,
        );

        if (dayMetric) {
          // Validate utilization bounds and apply to chart data
          const validatedUtilization = Math.max(
            0,
            Math.min(100, dayMetric.utilization),
          );
          chartData[dayIndex][key] = Math.round(validatedUtilization * 10) / 10; // Round to 1 decimal place

          // Log warning if utilization was outside expected bounds
          if (dayMetric.utilization < 0 || dayMetric.utilization > 100) {
            logWarn(
              'SourceMetricsChart',
              'Utilization value outside expected bounds',
              {
                date: dateKey,
                sourceId: source.sourceId,
                originalUtilization: dayMetric.utilization,
                validatedUtilization,
              },
            );
          }
        }
        // Default value of 0 is already set, no else needed
      });
    });

    return {
      data: chartData,
      config: chartConfig,
    };
  }

  /**
   * Get top sources by utilization for a time period
   */
  private async getTopSources(
    brandId: string,
    organizationId: string,
    startDate: Date,
    tab: 'domain' | 'url',
    limit: number,
  ): Promise<any[]> {
    // Get all source metrics for the time period
    const sourceMetrics = await prisma.sourceMetrics.findMany({
      where: {
        brandId,
        organizationId,
        date: { gte: startDate },
      },
      include: { source: true },
    });

    // Get total unique prompts for the time period for accurate utilization calculation
    const totalUniquePromptsResult = await prisma.$queryRaw<
      Array<{ count: bigint }>
    >`
      SELECT COUNT(DISTINCT r."promptId") as count
      FROM "result" r
      INNER JOIN "prompt" p ON r."promptId" = p.id
      WHERE p."brandId" = ${brandId}
      AND r.status = 'SUCCESS'
      AND r."createdAt" >= ${startDate}
    `;

    const totalUniquePrompts = Number(totalUniquePromptsResult[0]?.count || 0);

    if (totalUniquePrompts === 0) {
      return [];
    }

    // Group by domain or URL and aggregate properly
    const sourceMap = new Map<string, any>();

    sourceMetrics.forEach((metric) => {
      const key =
        tab === 'domain'
          ? getRootDomain(metric.source.hostname)
          : metric.source.url;

      if (!sourceMap.has(key)) {
        sourceMap.set(key, {
          domain: getRootDomain(metric.source.hostname),
          url: metric.source.url,
          hostname: metric.source.hostname,
          type: metric.source.type,
          sourceId: metric.sourceId,
          totalMentions: 0,
          uniquePrompts: 0,
        });
      }

      const source = sourceMap.get(key)!;
      source.totalMentions += metric.totalMentions;
      source.uniquePrompts += metric.uniquePrompts;
    });

    // Calculate utilization properly: (unique prompts for this source / total unique prompts) * 100
    const sourcesWithUtilization = Array.from(sourceMap.values()).map(
      (source) => ({
        ...source,
        utilization: (source.uniquePrompts / totalUniquePrompts) * 100,
      }),
    );

    // Convert to array and sort by utilization
    return sourcesWithUtilization
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, limit);
  }
}

// Singleton instance
export const sourceMetricsService = new SourceMetricsService();
