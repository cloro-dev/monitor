// app/api/prompts/track-all/route.ts
import { NextResponse } from 'next/server';
import { trackAllPrompts } from '@/lib/tracking-service';

export async function POST() {
  try {
    // Do not await this, as it can take a long time.
    // The cron job will call this endpoint.
    trackAllPrompts();
    return NextResponse.json({ message: 'Tracking for all prompts started' });
  } catch (error) {
    console.error('Failed to start tracking for all prompts:', error);
    return NextResponse.json(
      { error: 'Failed to start tracking' },
      { status: 500 },
    );
  }
}
