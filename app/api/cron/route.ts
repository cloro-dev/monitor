import { NextResponse } from 'next/server';
import { trackAllPrompts } from '@/lib/tracking-service';

export async function GET(req: Request) {
  // Simple auth to prevent abuse
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  try {
    trackAllPrompts();
    return NextResponse.json({
      message: 'Daily prompt tracking started successfully.',
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Failed to start daily tracking' },
      { status: 500 },
    );
  }
}
