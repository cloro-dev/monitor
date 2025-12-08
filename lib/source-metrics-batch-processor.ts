import prisma from '@/lib/prisma';
import { sourceMetricsService } from '@/lib/source-metrics-service';
import { logInfo, logError, logWarn } from '@/lib/logger';

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

  /**
   * Main method to run daily utilization batch processing
   */
  async runDailyBatch(): Promise<BatchProcessingStats> {
    const startTime = new Date();
    const stats: BatchProcessingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime,
    };

    logInfo('UtilizationBatch', 'Starting daily utilization batch processing', {
      startTime: startTime.toISOString(),
    });

    try {
      // Get all active organizations with recent activity
      const activeBrands = await this.getActiveBrandsForToday();

      logInfo(
        'UtilizationBatch',
        `Found ${activeBrands.length} active brand-organization pairs for processing`,
        {
          activeBrandsCount: activeBrands.length,
        },
      );

      if (activeBrands.length === 0) {
        logInfo(
          'UtilizationBatch',
          'No active brands found, skipping batch processing',
        );
        stats.duration = Date.now() - startTime.getTime();
        return stats;
      }

      // Sort by priority (recent activity first)
      const prioritizedJobs = this.prioritizeJobs(activeBrands);

      // Process in batches to prevent database overload
      for (let i = 0; i < prioritizedJobs.length; i += this.BATCH_SIZE) {
        const batch = prioritizedJobs.slice(i, i + this.BATCH_SIZE);

        logInfo(
          'UtilizationBatch',
          `Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(prioritizedJobs.length / this.BATCH_SIZE)}`,
          {
            batchSize: batch.length,
            progress: `${Math.round((i / prioritizedJobs.length) * 100)}%`,
          },
        );

        await Promise.allSettled(
          batch.map((job) => this.processJobWithRetry(job, stats)),
        );

        // Add small delay between batches to prevent overload
        if (i + this.BATCH_SIZE < prioritizedJobs.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      stats.duration = Date.now() - startTime.getTime();

      logInfo(
        'UtilizationBatch',
        'Daily utilization batch processing completed',
        {
          stats: {
            totalProcessed: stats.totalProcessed,
            successful: stats.successful,
            failed: stats.failed,
            skipped: stats.skipped,
            duration: `${stats.duration}ms`,
            successRate: `${((stats.successful / stats.totalProcessed) * 100).toFixed(2)}%`,
          },
        },
      );

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime.getTime();
      logError('UtilizationBatch', 'Batch processing failed', error, {
        stats,
      });
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

    logInfo('UtilizationBatch', 'Starting date range batch processing', {
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
            'UtilizationBatch',
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

      logInfo('UtilizationBatch', 'Date range batch processing completed', {
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        stats,
      });

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime.getTime();
      logError(
        'UtilizationBatch',
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
   * Get active brands for today (last 24 hours)
   */
  private async getActiveBrandsForToday(): Promise<
    Array<{
      brandId: string;
      organizationId: string;
    }>
  > {
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
        AND r."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY MAX(r."createdAt") DESC
    `;

    return activeBrands;
  }

  /**
   * Get active brands for a specific date
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

    return activeBrands;
  }

  /**
   * Prioritize jobs based on recent activity and importance
   */
  private prioritizeJobs(
    activeBrands: Array<{
      brandId: string;
      organizationId: string;
    }>,
  ): BatchJob[] {
    return activeBrands.map((brand, index) => ({
      ...brand,
      date: new Date(),
      priority: index < 5 ? 'high' : index < 20 ? 'medium' : 'low',
    }));
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

        logInfo('UtilizationBatch', 'Successfully processed job', {
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
          logError('UtilizationBatch', 'Job failed after max retries', error, {
            brandId: job.brandId,
            organizationId: job.organizationId,
            date: job.date.toISOString().split('T')[0],
            priority: job.priority,
            retryCount: retryCount - 1,
          });
          return;
        }

        logWarn('UtilizationBatch', 'Job failed, retrying...', {
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

    logInfo('UtilizationBatch', 'Job completed successfully', {
      brandId: job.brandId,
      organizationId: job.organizationId,
      date: job.date.toISOString().split('T')[0],
      duration: `${duration}ms`,
      priority: job.priority,
    });
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
      logError('UtilizationBatch', 'Failed to get batch status', error);
      return {
        isHealthy: false,
      };
    }
  }

  /**
   * Get recent processing statistics (could be stored in Redis or a tracking table)
   */
  private async getRecentProcessingStats(): Promise<BatchProcessingStats | null> {
    // For now, we can check the most recent source metrics update
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
