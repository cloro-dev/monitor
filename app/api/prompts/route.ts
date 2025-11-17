import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { trackPromptById } from '@/lib/tracking-service';

const createPromptSchema = z.object({
  text: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(200, 'Prompt must be at most 200 characters'),
  country: z.string().min(1, 'Country is required'),
  brandId: z.string().min(1, 'Brand is required'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    const prompts = await prisma.prompt.findMany({
      where: {
        userId: session.user.id,
        ...(brandId && { brandId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        brand: {
          select: {
            id: true,
            domain: true,
            name: true,
          },
        },
        trackingResults: {
          include: {
            metrics: true,
          },
        },
      },
    });

    // Calculate aggregated metrics for each prompt
    const promptsWithMetrics = prompts.map((prompt) => {
      const metricsList = prompt.trackingResults
        .map((tr) => tr.metrics)
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (metricsList.length === 0) {
        return {
          ...prompt,
          visibilityScore: null,
          averageSentiment: null,
          averagePosition: null,
        };
      }

      const totalMetrics = metricsList.length;

      // Visibility Score Calculation
      const mentions = metricsList.filter((m) => m.position > 0).length;
      const visibilityScore = (mentions / totalMetrics) * 100;

      // Average Sentiment Calculation
      const totalSentiment = metricsList.reduce(
        (acc, m) => acc + m.sentiment,
        0,
      );
      const averageSentiment = totalSentiment / totalMetrics;

      // Average Position Calculation (only for prompts that were ranked)
      const positionMetrics = metricsList.filter((m) => m.position > 0);
      const totalPosition = positionMetrics.reduce(
        (acc, m) => acc + m.position,
        0,
      );
      const averagePosition =
        positionMetrics.length > 0
          ? totalPosition / positionMetrics.length
          : null;

      return {
        ...prompt,
        visibilityScore,
        averageSentiment,
        averagePosition,
      };
    });

    return NextResponse.json(promptsWithMetrics);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPromptSchema.parse(body);

    const newPrompt = await prisma.prompt.create({
      data: {
        text: validatedData.text,
        country: validatedData.country,
        brandId: validatedData.brandId,
        userId: session.user.id,
      },
      select: {
        id: true,
        text: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Don't await, let it run in the background
    trackPromptById(newPrompt.id);

    return NextResponse.json(newPrompt, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
