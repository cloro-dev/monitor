import { NextResponse } from 'next/server';
import { trackAllPrompts } from '@/lib/tracking-service';
import { waitUntil } from '@vercel/functions';

export async function POST() {
  try {
    // Do not await this, as it can take a long time.
    // The cron job will call this endpoint.
    waitUntil(trackAllPrompts());
    return NextResponse.json({ message: 'Tracking for all prompts started' });
  } catch (error) {
    console.error('Failed to start tracking for all prompts:', error);
    return NextResponse.json(
      { error: 'Failed to start tracking' },
      { status: 500 },
    );
  }
}
