import { NextRequest, NextResponse } from 'next/server';
import { trackingCronProcessor } from '@/lib/tracking-cron-processor';
import { waitUntil } from '@vercel/functions';
import { logInfo, logWarn, logError } from '@/lib/logger';

const CRON_SECRET =
  process.env.CRON_SECRET || 'default-secret-change-in-production';

/**
 * Cron endpoint for daily prompt tracking
 * Processes all active prompts and triggers tracking for configured AI models
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    logWarn('PromptTrackingCron', 'Unauthorized cron access attempt', {
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logInfo('PromptTrackingCron', 'Starting scheduled daily prompt tracking', {
      timestamp: new Date().toISOString(),
    });

    // Run tracking asynchronously (non-blocking for API response)
    waitUntil(
      trackingCronProcessor
        .runDailyTracking()
        .then((stats) => {
          logInfo(
            'PromptTrackingCron',
            'Daily prompt tracking completed successfully',
            {
              stats: {
                concurrency: stats.concurrency,
                duration: `${stats.duration}ms`,
              },
            },
          );
        })
        .catch((error) => {
          logError('PromptTrackingCron', 'Daily prompt tracking failed', error);
        }),
    );

    return NextResponse.json({
      success: true,
      message: 'Daily prompt tracking initiated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('PromptTrackingCron', 'Failed to initiate daily tracking', error);

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
