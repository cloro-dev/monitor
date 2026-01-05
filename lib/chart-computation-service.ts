import prisma from '@/lib/prisma';
import { logInfo, logError, logWarn } from '@/lib/logger';
import {
  eachDayOfInterval,
  format,
  subDays,
  differenceInHours,
} from 'date-fns';
import { sourceMetricsService } from './source-metrics-service';

interface ChartComputationStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
}

export class ChartComputationService {
  private STALE_THRESHOLD_HOURS = 24; // Charts older than 24 hours are considered stale

  /**
   * Generate and store precomputed charts for a single brand
   * @param brandId Brand ID
   * @param organizationId Organization ID
   * @returns Stats about the computation
   */
  async precomputeChartsForBrand(
    brandId: string,
    organizationId: string,
  ): Promise<ChartComputationStats> {
    const stats: ChartComputationStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    const timeRanges = ['7d', '30d', '90d'] as const;
    const tabs = ['domain', 'url'] as const;

    for (const timeRange of timeRanges) {
      for (const tab of tabs) {
        try {
          stats.totalProcessed++;

          await this.precomputeSourceChart(
            brandId,
            organizationId,
            timeRange,
            tab,
          );

          stats.successful++;
        } catch (error) {
          logError(
            'ChartComputation',
            'Failed to precompute source chart',
            error,
            {
              brandId,
              organizationId,
              timeRange,
              tab,
            },
          );
          stats.failed++;
        }
      }
    }

    try {
      stats.totalProcessed++;
      await this.precomputeCompetitorChart(brandId, organizationId);
      stats.successful++;
    } catch (error) {
      logError(
        'ChartComputation',
        'Failed to precompute competitor chart',
        error,
        {
          brandId,
          organizationId,
        },
      );
      stats.failed++;
    }

    logInfo('ChartComputation', 'Completed precomputation for brand', {
      brandId,
      organizationId,
      ...stats,
    });

    return stats;
  }

  /**
   * Precompute source chart for a specific configuration
   */
  private async precomputeSourceChart(
    brandId: string,
    organizationId: string,
    timeRange: '7d' | '30d' | '90d',
    tab: 'domain' | 'url',
  ): Promise<void> {
    const chartData = await sourceMetricsService.getSourceUtilizationChart(
      brandId,
      organizationId,
      timeRange,
      tab,
      5, // Top 5 sources
    );

    await prisma.precomputedSourceChart.upsert({
      where: {
        brandId_organizationId_timeRange_tab: {
          brandId,
          organizationId,
          timeRange,
          tab,
        },
      },
      update: {
        chartData: chartData.data,
        chartConfig: chartData.config,
        date: new Date(),
        updatedAt: new Date(),
      },
      create: {
        brandId,
        organizationId,
        timeRange,
        tab,
        chartData: chartData.data,
        chartConfig: chartData.config,
        date: new Date(),
      },
    });
  }

  /**
   * Precompute competitor chart for a brand
   */
  private async precomputeCompetitorChart(
    brandId: string,
    organizationId: string,
  ): Promise<void> {
    const lookbackDays = 90;

    const { chartData, chartConfig } = await this.generateCompetitorChartData(
      brandId,
      organizationId,
      lookbackDays,
    );

    await prisma.precomputedCompetitorChart.upsert({
      where: {
        brandId_organizationId: {
          brandId,
          organizationId,
        },
      },
      update: {
        chartData,
        chartConfig,
        date: new Date(),
        updatedAt: new Date(),
      },
      create: {
        brandId,
        organizationId,
        lookbackDays,
        chartData,
        chartConfig,
        date: new Date(),
      },
    });
  }

  /**
   * Get precomputed source chart or generate if stale/missing
   */
  async getSourceChart(
    brandId: string,
    organizationId: string,
    timeRange: '7d' | '30d' | '90d',
    tab: 'domain' | 'url',
  ): Promise<{ data: any[]; config: any }> {
    const precomputed = await prisma.precomputedSourceChart.findUnique({
      where: {
        brandId_organizationId_timeRange_tab: {
          brandId,
          organizationId,
          timeRange,
          tab,
        },
      },
    });

    if (precomputed) {
      const hoursSinceUpdate = differenceInHours(
        new Date(),
        precomputed.updatedAt,
      );

      if (hoursSinceUpdate < this.STALE_THRESHOLD_HOURS) {
        logInfo('ChartComputation', 'Using cached source chart', {
          brandId,
          organizationId,
          timeRange,
          tab,
          hoursSinceUpdate,
        });

        return {
          data: precomputed.chartData as any[],
          config: precomputed.chartConfig as any,
        };
      } else {
        logInfo('ChartComputation', 'Source chart is stale, regenerating', {
          brandId,
          organizationId,
          timeRange,
          tab,
          hoursSinceUpdate,
        });
      }
    }

    logInfo(
      'ChartComputation',
      'No cached source chart, generating on-demand',
      {
        brandId,
        organizationId,
        timeRange,
        tab,
      },
    );

    const chartData = await sourceMetricsService.getSourceUtilizationChart(
      brandId,
      organizationId,
      timeRange,
      tab,
      5,
    );

    return chartData;
  }

  /**
   * Get precomputed competitor chart or generate if stale/missing
   */
  async getCompetitorChart(
    brandId: string,
    organizationId: string,
  ): Promise<{ data: any[]; chartConfig: any }> {
    const precomputed = await prisma.precomputedCompetitorChart.findUnique({
      where: {
        brandId_organizationId: {
          brandId,
          organizationId,
        },
      },
    });

    if (precomputed) {
      const hoursSinceUpdate = differenceInHours(
        new Date(),
        precomputed.updatedAt,
      );

      if (hoursSinceUpdate < this.STALE_THRESHOLD_HOURS) {
        logInfo('ChartComputation', 'Using cached competitor chart', {
          brandId,
          organizationId,
          hoursSinceUpdate,
        });

        return {
          data: precomputed.chartData as any[],
          chartConfig: precomputed.chartConfig as any,
        };
      } else {
        logInfo('ChartComputation', 'Competitor chart is stale, regenerating', {
          brandId,
          organizationId,
          hoursSinceUpdate,
        });
      }
    }

    logInfo(
      'ChartComputation',
      'No cached competitor chart, generating on-demand',
      {
        brandId,
        organizationId,
      },
    );

    const lookbackDays = 90;
    const competitorData = await this.generateCompetitorChartData(
      brandId,
      organizationId,
      lookbackDays,
    );

    return {
      data: competitorData.chartData,
      chartConfig: competitorData.chartConfig,
    };
  }

  /**
   * Generate competitor chart data (extracted from /api/competitors)
   */
  private async generateCompetitorChartData(
    brandId: string,
    organizationId: string,
    lookbackDays: number,
  ): Promise<{ chartData: any[]; chartConfig: any }> {
    const startDate = subDays(new Date(), lookbackDays);

    const brands = await prisma.brand.findMany({
      where: {
        organizationBrands: {
          some: {
            organizationId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        domain: true,
      },
    });

    const brandsById = new Map(brands.map((brand) => [brand.id, brand]));
    const selectedBrand = brandsById.get(brandId);

    if (!selectedBrand) {
      return { chartData: [], chartConfig: {} };
    }

    const competitorRels = await prisma.competitor.findMany({
      where: {
        brandId,
      },
      include: {
        competitor: true,
      },
    });

    const competitorMap = new Map(
      competitorRels.map((rel) => [
        rel.competitorId,
        {
          id: rel.id,
          status: rel.status,
          mentions: rel.mentions,
        },
      ]),
    );

    const brandMetricsData = await prisma.brandMetrics.findMany({
      where: {
        brandId,
        organizationId,
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

    const metricsAggregation = new Map<string, any>();
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
          brand: selectedBrand.name,
          visibilityScore: metric.visibilityScore || 0,
          isOwnBrand,
        });

        processedCompetitors.add(key);
      }
    }

    let formattedCompetitors = Array.from(metricsAggregation.values());
    formattedCompetitors.sort((a, b) => b.visibilityScore - a.visibilityScore);

    const topCompetitors = formattedCompetitors
      .filter((c) => !c.isOwnBrand && c.status === 'ACCEPTED')
      .slice(0, 5);

    const ownBrandMetrics = formattedCompetitors.find((c) => c.isOwnBrand);
    const brandsToChart = [
      ...(ownBrandMetrics ? [{ id: brandId, name: ownBrandMetrics.name }] : []),
      ...topCompetitors.map((comp) => ({ id: comp.id, name: comp.name })),
    ];

    const chartMap = new Map<string, any>();

    const dates = eachDayOfInterval({
      start: startDate,
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

    const dailyMetrics = await prisma.brandMetrics.findMany({
      where: {
        brandId,
        organizationId,
        date: { gte: startDate },
        OR: [
          { competitorId: null },
          ...brandsToChart
            .filter((b) => b.id !== brandId)
            .map((b) => ({ competitorId: b.id })),
        ],
      },
      include: { competitor: true },
      orderBy: { date: 'asc' },
    });

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
    const chartConfig = {
      brandsToChart,
      competitorMap: Array.from(competitorMap.entries()),
    };

    return { chartData, chartConfig };
  }

  /**
   * Batch precompute charts for all brands
   * @returns Stats about the computation
   */
  async precomputeChartsForAllBrands(): Promise<ChartComputationStats> {
    const stats: ChartComputationStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    logInfo('ChartComputation', 'Starting batch precomputation for all brands');

    const organizationBrands = await prisma.organization_brand.findMany({
      select: {
        brandId: true,
        organizationId: true,
      },
    });

    for (const ob of organizationBrands) {
      try {
        const brandStats = await this.precomputeChartsForBrand(
          ob.brandId,
          ob.organizationId,
        );

        stats.totalProcessed += brandStats.totalProcessed;
        stats.successful += brandStats.successful;
        stats.failed += brandStats.failed;
        stats.skipped += brandStats.skipped;
      } catch (error) {
        logError(
          'ChartComputation',
          'Failed to precompute charts for brand',
          error,
          {
            brandId: ob.brandId,
            organizationId: ob.organizationId,
          },
        );
        stats.failed += 6; // 3 timeRanges × 2 tabs + 1 competitor chart
      }
    }

    logInfo('ChartComputation', 'Completed batch precomputation', stats);

    return stats;
  }
}

export const chartComputationService = new ChartComputationService();
