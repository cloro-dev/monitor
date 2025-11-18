import { NextResponse, NextRequest } from 'next/server';
import { trackPromptById } from '@/lib/tracking-service';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: 'Prompt ID is required' },
      { status: 400 },
    );
  }

  try {
    await trackPromptById(id);
    return NextResponse.json({ message: 'Tracking started' });
  } catch (error) {
    console.error(`Failed to start tracking for prompt ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to start tracking' },
      { status: 500 },
    );
  }
}
