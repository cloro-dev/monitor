import { NextResponse } from 'next/server';
import { trackAllPrompts } from '@/lib/tracking-service';
import { waitUntil } from '@vercel/functions';
import { logError, logInfo } from '@/lib/logger';

export async function GET(req: Request) {
  // Simple auth to prevent abuse
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    waitUntil(trackAllPrompts());

    logInfo('CronJob', 'Daily prompt tracking started successfully', {
      cronType: 'daily_tracking',
      triggeredBy: 'scheduled_cron',
    });

    return NextResponse.json({
      message: 'Daily prompt tracking started successfully.',
    });
  } catch (error) {
    logError('CronJob', 'Cron job failed', error, {
      cronType: 'daily_tracking',
      triggeredBy: 'scheduled_cron',
    });
    return NextResponse.json(
      { error: 'Failed to start daily tracking' },
      { status: 500 },
    );
  }
}
