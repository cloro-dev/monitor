import { NextRequest, NextResponse } from 'next/server';
import { sourceMetricsBatchProcessor } from '@/lib/source-metrics-batch-processor';
import { logInfo, logError, logWarn } from '@/lib/logger';

/**
 * Cron job endpoint for scheduled source metrics processing
 * Calculates utilization percentages from raw source metrics data
 * Runs daily after prompt tracking is complete
 *
 * Security: Should be protected by cron secrets or IP whitelisting in production
 */

const CRON_SECRET =
  process.env.CRON_SECRET || 'default-secret-change-in-production';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      logWarn('SourceMetricsCron', 'Unauthorized cron access attempt', {
        userAgent: request.headers.get('user-agent'),
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logInfo('SourceMetricsCron', 'Starting source metrics batch processing', {
      timestamp: new Date().toISOString(),
    });

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body as {
      startDate?: string;
      endDate?: string;
    };

    let stats;

    if (startDate && endDate) {
      // Process specific date range (useful for backfilling)
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD).' },
          { status: 400 },
        );
      }

      if (start > end) {
        return NextResponse.json(
          { error: 'Start date must be before end date.' },
          { status: 400 },
        );
      }

      logInfo('SourceMetricsCron', 'Processing date range', {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      });

      stats = await sourceMetricsBatchProcessor.runBatchForDateRange(
        start,
        end,
      );
    } else {
      // Default batch processing (runs every 5 minutes, automatically finds missing data)
      stats = await sourceMetricsBatchProcessor.runBatch();
    }

    const duration = Date.now() - startTime;

    logInfo('SourceMetricsCron', 'Cron job completed successfully', {
      duration: `${duration}ms`,
      stats: {
        totalProcessed: stats.totalProcessed,
        successful: stats.successful,
        failed: stats.failed,
        skipped: stats.skipped,
        successRate:
          stats.totalProcessed > 0
            ? `${((stats.successful / stats.totalProcessed) * 100).toFixed(2)}%`
            : '0%',
      },
    });

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      stats: {
        totalProcessed: stats.totalProcessed,
        successful: stats.successful,
        failed: stats.failed,
        skipped: stats.skipped,
        duration: `${stats.duration}ms`,
        successRate:
          stats.totalProcessed > 0
            ? ((stats.successful / stats.totalProcessed) * 100).toFixed(2)
            : '0',
        processingRate:
          stats.totalProcessed > 0 && stats.duration > 0
            ? Math.round((stats.totalProcessed / stats.duration) * 1000 * 60)
            : 0, // jobs per minute
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logError('SourceMetricsCron', 'Cron job failed', error, {
      duration: `${duration}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to check batch processing status and health
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await sourceMetricsBatchProcessor.getBatchStatus();

    logInfo('SourceMetricsCron', 'Status check requested', {
      isHealthy: status.isHealthy,
      lastProcessingTime: status.lastProcessingTime?.toISOString(),
    });

    return NextResponse.json({
      success: true,
      status: {
        isHealthy: status.isHealthy,
        lastProcessingTime: status.lastProcessingTime?.toISOString(),
        lastProcessingStats: status.lastProcessingStats,
        processingRate: status.processingRate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('SourceMetricsCron', 'Status check failed', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
