import { trackAllPrompts } from '@/lib/tracking-service';
import { logInfo, logError } from '@/lib/logger';

interface TrackingCronStats {
  totalPrompts: number;
  totalTasks: number;
  concurrency: number;
  startTime: Date;
  duration?: number;
}

export class TrackingCronProcessor {
  private readonly DEFAULT_CONCURRENCY = 5;

  /**
   * Process daily tracking for all active prompts
   */
  async runDailyTracking(
    concurrency = this.DEFAULT_CONCURRENCY,
  ): Promise<TrackingCronStats> {
    const startTime = new Date();
    const stats: TrackingCronStats = {
      totalPrompts: 0,
      totalTasks: 0,
      concurrency,
      startTime,
    };

    logInfo('TrackingCron', 'Starting daily prompt tracking', {
      concurrency,
      startTime: startTime.toISOString(),
    });

    try {
      // Track all prompts with specified concurrency
      await trackAllPrompts(concurrency);

      stats.duration = Date.now() - startTime.getTime();

      logInfo('TrackingCron', 'Daily prompt tracking completed successfully', {
        stats: {
          concurrency: stats.concurrency,
          duration: `${stats.duration}ms`,
        },
      });

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime.getTime();
      logError('TrackingCron', 'Daily prompt tracking failed', error, {
        stats: {
          concurrency: stats.concurrency,
          duration: `${stats.duration}ms`,
        },
      });
      throw error;
    }
  }

  /**
   * Get current tracking cron status
   */
  async getStatus(): Promise<{
    isHealthy: boolean;
    lastRun?: Date;
    nextRun?: Date;
  }> {
    try {
      // In a real implementation, you might track last run times in a database
      // For now, return basic health status
      return {
        isHealthy: true,
        nextRun: this.getNextScheduledRun(),
      };
    } catch (error) {
      logError('TrackingCron', 'Failed to get status', error);
      return {
        isHealthy: false,
      };
    }
  }

  /**
   * Calculate when the next cron run is scheduled
   */
  private getNextScheduledRun(): Date {
    const now = new Date();
    const nextRun = new Date(now);

    // Current schedule: "42 5 * * *" (5:42 AM daily)
    nextRun.setHours(5, 42, 0, 0);

    // If today's run has passed, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  /**
   * Validate system health for tracking operations
   */
  async validateHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if tracking service is responsive
      // In a real implementation, you might run a quick health check
      // For now, assume healthy if no exceptions are thrown

      return {
        isHealthy: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        isHealthy: false,
        issues,
      };
    }
  }
}

export const trackingCronProcessor = new TrackingCronProcessor();
