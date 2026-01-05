import prisma from '@/lib/prisma';
import { sourceMetricsService } from '@/lib/source-metrics-service';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { organizationBrandsCache } from '@/lib/cache';

interface BatchJob {
  brandId: string;
  organizationId: string;
  date: Date;
  priority: 'high' | 'medium' | 'low';
}

interface BatchProcessingStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
  startTime: Date;
}

export class UtilizationBatchProcessor {
  private readonly BATCH_SIZE = 10; // Process 10 organizations at once
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly RESULT_BATCH_SIZE = 100; // Process results in batches of 100
  private readonly MAX_RESULTS_PER_RUN = 1000; // Maximum results to process in one run

  /**
   * Daily batch processing - runs once per day to process previous day's data
   * Called by the daily cron job 1 hour after prompt tracking
   * Automatically finds both new results and any historical data gaps
   * Optimized to process in batches to avoid memory spikes
   */
  async runBatch(): Promise<BatchProcessingStats> {
    const startTime = new Date();
    const stats: BatchProcessingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime,
    };

    logInfo('SourceMetricsCron', 'Starting source metrics batch processing', {
      startTime: startTime.toISOString(),
    });

    try {
      let totalProcessed = 0;
      let allProcessedResults: any[] = [];

      // Process results in batches to avoid memory spikes
      while (totalProcessed < this.MAX_RESULTS_PER_RUN) {
        // Always look for unprocessed results - handles both new and historical gaps
        const resultsToProcess = await this.getUnprocessedResults(
          this.RESULT_BATCH_SIZE,
        );

        if (resultsToProcess.length === 0) {
          logInfo('SourceMetricsCron', 'No more unprocessed results found', {
            totalProcessedSoFar: totalProcessed,
          });
          break;
        }

        logInfo(
          'SourceMetricsCron',
          `Processing batch of ${resultsToProcess.length} results`,
          {
            batchSize: resultsToProcess.length,
            totalProcessedSoFar: totalProcessed,
          },
        );

        // Process the results in this batch
        for (const result of resultsToProcess) {
          try {
            await this.processSingleResult(result);
            stats.totalProcessed++;
            stats.successful++;
          } catch (error) {
            stats.totalProcessed++;
            stats.failed++;
            logError(
              'SourceMetricsCron',
              'Failed to process result in batch',
              error,
              {
                resultId: result.id,
              },
            );
          }
        }

        // Collect all processed results for utilization recalculation
        allProcessedResults.push(...resultsToProcess);
        totalProcessed += resultsToProcess.length;

        // Small delay between batches to be gentle on the database
        if (resultsToProcess.length === this.RESULT_BATCH_SIZE) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // After processing results, recalculate utilization for affected dates
      if (allProcessedResults.length > 0) {
        await this.recalculateUtilizationForResults(allProcessedResults);
      }

      stats.duration = Date.now() - startTime.getTime();

      logInfo(
        'SourceMetricsCron',
        'Source metrics batch processing completed',
        {
          stats: {
            resultsProcessed: allProcessedResults.length,
            totalProcessed: stats.totalProcessed,
            successful: stats.successful,
            failed: stats.failed,
            duration: `${stats.duration}ms`,
            successRate: `${((stats.successful / stats.totalProcessed) * 100).toFixed(2)}%`,
          },
        },
      );

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime.getTime();
      logError(
        'SourceMetricsCron',
        'Source metrics batch processing failed',
        error,
        {
          stats,
        },
      );
      throw error;
    }
  }

  /**
   * Run batch processing for a specific date range (useful for backfilling)
   */
  async runBatchForDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<BatchProcessingStats> {
    const startTime = new Date();
    const stats: BatchProcessingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime,
    };

    logInfo('SourceMetricsCron', 'Starting date range batch processing', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    try {
      // Get all dates in the range
      const dates = [];
      for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
      ) {
        dates.push(new Date(date));
      }

      // For each date, get active brands and process
      for (const date of dates) {
        const activeBrands = await this.getActiveBrandsForDate(date);

        if (activeBrands.length === 0) {
          logInfo(
            'SourceMetricsCron',
            `No active brands found for ${date.toISOString().split('T')[0]}`,
          );
          continue;
        }

        const jobs = activeBrands.map((brand) => ({
          ...brand,
          date,
          priority: 'medium' as const,
        }));

        // Process in batches
        for (let i = 0; i < jobs.length; i += this.BATCH_SIZE) {
          const batch = jobs.slice(i, i + this.BATCH_SIZE);

          await Promise.allSettled(
            batch.map((job) => this.processJobWithRetry(job, stats)),
          );

          // Small delay between batches
          if (i + this.BATCH_SIZE < jobs.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      stats.duration = Date.now() - startTime.getTime();

      logInfo('SourceMetricsCron', 'Date range batch processing completed', {
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        stats,
      });

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime.getTime();
      logError(
        'SourceMetricsCron',
        'Date range batch processing failed',
        error,
        {
          dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
          stats,
        },
      );
      throw error;
    }
  }

  /**
   * Get active brands for a specific date
   * Uses caching to reduce repeated queries
   */
  private async getActiveBrandsForDate(date: Date): Promise<
    Array<{
      brandId: string;
      organizationId: string;
    }>
  > {
    const startDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const endDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    );

    // Create cache key
    const cacheKey = `activeBrands:${startDate.toISOString().split('T')[0]}`;

    // Try to get from cache first
    const cached = organizationBrandsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const activeBrands = await prisma.$queryRaw<
      Array<{
        brandId: string;
        organizationId: string;
      }>
    >`
      SELECT DISTINCT
        p."brandId",
        ob."organizationId"
      FROM "prompt" p
      INNER JOIN "organization_brand" ob ON p."brandId" = ob."brandId"
      INNER JOIN "result" r ON p.id = r."promptId"
      WHERE r.status = 'SUCCESS'
        AND r."createdAt" >= ${startDate}
        AND r."createdAt" < ${endDate}
    `;

    // Cache the result
    organizationBrandsCache.set(cacheKey, activeBrands, 15 * 60 * 1000); // 15 minutes

    return activeBrands;
  }

  /**
   * Process a single job with retry logic
   */
  private async processJobWithRetry(
    job: BatchJob,
    stats: BatchProcessingStats,
  ): Promise<void> {
    let retryCount = 0;

    while (retryCount <= this.MAX_RETRIES) {
      try {
        stats.totalProcessed++;

        await this.processJob(job);

        stats.successful++;

        logInfo('SourceMetricsCron', 'Job completed successfully', {
          brandId: job.brandId,
          organizationId: job.organizationId,
          date: job.date.toISOString().split('T')[0],
          priority: job.priority,
          retryCount,
        });

        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;

        if (retryCount > this.MAX_RETRIES) {
          stats.failed++;
          logError('SourceMetricsCron', 'Job failed after max retries', error, {
            brandId: job.brandId,
            organizationId: job.organizationId,
            date: job.date.toISOString().split('T')[0],
            retryCount: retryCount - 1,
            error: error instanceof Error ? error.message : String(error),
          });
          return;
        }

        logWarn('SourceMetricsCron', 'Job failed, retrying...', {
          brandId: job.brandId,
          organizationId: job.organizationId,
          date: job.date.toISOString().split('T')[0],
          retryCount,
          error: error instanceof Error ? error.message : String(error),
        });

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retryCount - 1)),
        );
      }
    }
  }

  /**
   * Process a single brand-organization-date combination
   */
  private async processJob(job: BatchJob): Promise<void> {
    const startTime = Date.now();

    await sourceMetricsService.recalculateDailyUtilization(
      job.brandId,
      job.organizationId,
      job.date,
    );

    const duration = Date.now() - startTime;

    logInfo('SourceMetricsCron', 'Job completed successfully', {
      brandId: job.brandId,
      organizationId: job.organizationId,
      date: job.date.toISOString().split('T')[0],
      duration: `${duration}ms`,
      priority: job.priority,
    });
  }

  /**
   * Get all unprocessed successful results
   * This finds results that have sources but haven't been processed for source metrics yet
   * Handles both new results and historical gaps automatically
   * Optimized to reduce JOIN overhead and accept a limit parameter
   */
  private async getUnprocessedResults(limit: number = 1000): Promise<any[]> {
    try {
      // Use a more efficient query with EXISTS instead of LEFT JOIN
      // Also added better indexing support with status filter
      const resultsWithoutSourceMetrics = await prisma.$queryRaw<
        Array<{
          id: string;
          promptId: string;
          brandId: string;
          createdAt: Date;
          status: string;
        }>
      >`
        SELECT DISTINCT r.id, r."promptId", r."createdAt", r.status, p."brandId"
        FROM "result" r
        INNER JOIN "prompt" p ON r."promptId" = p.id
        WHERE r.status = 'SUCCESS'
          AND NOT EXISTS (
            SELECT 1 FROM "source_metrics" sm
            WHERE sm."brandId" = p."brandId"
              AND sm.date = DATE(r."createdAt")
          )
        ORDER BY r."createdAt" ASC
        LIMIT ${limit}
      `;

      // Get full result objects with sources for processing
      if (resultsWithoutSourceMetrics.length === 0) {
        return [];
      }

      const resultIds = resultsWithoutSourceMetrics.map((r) => r.id);

      // Optimize by selecting only needed fields
      const results = await prisma.result.findMany({
        where: {
          id: { in: resultIds },
          status: 'SUCCESS',
        },
        select: {
          id: true,
          createdAt: true,
          status: true,
          model: true,
          prompt: {
            select: {
              id: true,
              brandId: true,
              brand: {
                select: {
                  id: true,
                  name: true,
                  domain: true,
                  organizationBrands: {
                    select: {
                      organizationId: true,
                      organization: {
                        select: {
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          sources: {
            select: {
              url: true,
              hostname: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return results;
    } catch (error) {
      logError(
        'SourceMetricsCron',
        'Failed to get unprocessed results for backfill',
        error,
      );
      return [];
    }
  }

  /**
   * Process a single result for source metrics
   */
  private async processSingleResult(result: any): Promise<void> {
    await sourceMetricsService.processResultSources(result.id, result);
  }

  /**
   * Recalculate utilization for dates affected by processed results
   * Optimized to batch process and reduce queries
   */
  private async recalculateUtilizationForResults(
    results: any[],
  ): Promise<void> {
    // Get unique dates, brands, and organizations from results
    const dateBrandOrgTriples = new Map<
      string,
      {
        brandId: string;
        date: Date;
        organizationId: string;
      }
    >();

    for (const result of results) {
      const resultDate = new Date(
        result.createdAt.getFullYear(),
        result.createdAt.getMonth(),
        result.createdAt.getDate(),
      );

      // Process all organization-brand combinations for this result
      for (const orgBrand of result.prompt.brand.organizationBrands) {
        const key = `${result.prompt.brandId}-${orgBrand.organizationId}-${resultDate.toISOString().split('T')[0]}`;

        if (!dateBrandOrgTriples.has(key)) {
          dateBrandOrgTriples.set(key, {
            brandId: result.prompt.brandId,
            date: resultDate,
            organizationId: orgBrand.organizationId,
          });
        }
      }
    }

    // Batch recalculate utilization for all unique date-brand-organization combinations
    const recalculations = Array.from(dateBrandOrgTriples.values()).map(
      ({ brandId, date, organizationId }) =>
        sourceMetricsService
          .recalculateDailyUtilization(brandId, organizationId, date)
          .catch((error) => {
            logError(
              'SourceMetricsCron',
              'Failed to recalculate utilization for date-brand-org',
              error,
              {
                brandId,
                date: date.toISOString().split('T')[0],
                organizationId,
              },
            );
          }),
    );

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;
    for (let i = 0; i < recalculations.length; i += BATCH_SIZE) {
      const batch = recalculations.slice(i, i + BATCH_SIZE);
      await Promise.all(batch);
    }

    logInfo(
      'SourceMetricsCron',
      'Recalculated utilization for affected dates',
      {
        recalculationCount: dateBrandOrgTriples.size,
      },
    );
  }

  /**
   * Get current batch processing status and health metrics
   */
  async getBatchStatus(): Promise<{
    isHealthy: boolean;
    lastProcessingTime?: Date;
    lastProcessingStats?: BatchProcessingStats;
    queuedJobs?: number;
    processingRate?: number;
  }> {
    try {
      // Get the most recent batch processing stats from logs or a tracking table
      const recentStats = await this.getRecentProcessingStats();

      return {
        isHealthy: this.isProcessingHealthy(recentStats),
        lastProcessingTime: recentStats?.startTime,
        lastProcessingStats: recentStats || undefined,
        processingRate: this.calculateProcessingRate(recentStats),
      };
    } catch (error) {
      logError('SourceMetricsBatch', 'Failed to get batch status', error);
      return {
        isHealthy: false,
      };
    }
  }

  /**
   * Get recent processing statistics (could be stored in Redis or a tracking table)
   */
  private async getRecentProcessingStats(): Promise<BatchProcessingStats | null> {
    try {
      // Get the most recent batch processing stats from logs or a tracking table
      const latestUpdate = await prisma.sourceMetrics.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });

      if (!latestUpdate) {
        return null;
      }

      // In a real implementation, you'd store actual stats in a dedicated table
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        startTime: latestUpdate.updatedAt,
      };
    } catch (error) {
      logError(
        'SourceMetricsBatch',
        'Failed to get recent processing stats',
        error,
      );
      return null;
    }
  }

  /**
   * Determine if batch processing is healthy based on recent stats
   */
  private isProcessingHealthy(stats: BatchProcessingStats | null): boolean {
    if (!stats) {
      return false; // No processing history
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isRecent = stats.startTime > oneHourAgo;

    if (!isRecent) {
      return false; // Processing too old
    }

    // Check success rate
    if (stats.totalProcessed > 0) {
      const successRate = stats.successful / stats.totalProcessed;
      return successRate > 0.9; // 90% success rate threshold
    }

    return true;
  }

  /**
   * Calculate processing rate (jobs per minute)
   */
  private calculateProcessingRate(
    stats: BatchProcessingStats | null,
  ): number | undefined {
    if (!stats || stats.duration === 0 || stats.totalProcessed === 0) {
      return undefined;
    }

    return Math.round((stats.totalProcessed / stats.duration) * 1000 * 60); // jobs per minute
  }
}

export const sourceMetricsBatchProcessor = new UtilizationBatchProcessor();
