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
        providerResults: true,
      },
    });

    // Calculate aggregated metrics for each prompt from all ProviderResults
    const promptsWithMetrics = prompts.map((prompt) => {
      // For visibility calculation: use all SUCCESS results (regardless of sentiment)
      const successfulResultsForVisibility = prompt.providerResults.filter(
        (pr) => pr.status === 'SUCCESS',
      );

      // For sentiment calculation: use only SUCCESS results with sentiment
      const successfulResultsForSentiment = prompt.providerResults.filter(
        (pr) => pr.status === 'SUCCESS' && pr.sentiment != null,
      );

      if (successfulResultsForVisibility.length === 0) {
        return {
          ...prompt,
          visibilityScore: null,
          averageSentiment: null,
          averagePosition: null,
        };
      }

      // Visibility Score Calculation (percentage of results where position is not null and > 0)
      const totalResults = successfulResultsForVisibility.length;
      const mentions = successfulResultsForVisibility.filter(
        (pr) => pr.position != null && pr.position > 0,
      ).length;
      const visibilityScore = (mentions / totalResults) * 100;

      // Average Sentiment Calculation
      const sentimentResults = successfulResultsForSentiment;
      const totalSentiment = sentimentResults.reduce(
        (acc, pr) => acc + pr.sentiment!,
        0,
      );
      const averageSentiment =
        sentimentResults.length > 0
          ? totalSentiment / sentimentResults.length
          : null;

      // Average Position Calculation (only for prompts that were ranked)
      const positionResults = successfulResultsForVisibility.filter(
        (pr) => pr.position != null && pr.position > 0,
      );
      const totalPosition = positionResults.reduce(
        (acc, pr) => acc + pr.position!,
        0,
      );
      const averagePosition =
        positionResults.length > 0
          ? totalPosition / positionResults.length
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

    // Get the organization to check if AI models are enabled
    const brand = await prisma.brand.findUnique({
      where: { id: validatedData.brandId },
      include: {
        organization: {
          select: {
            aiModels: true,
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check if any AI models are enabled
    const enabledModels = (brand.organization.aiModels as string[]) || [];
    if (enabledModels.length === 0) {
      return NextResponse.json(
        {
          error:
            'No AI models enabled. Please enable at least one AI model in Settings > AI Models before creating prompts.',
        },
        { status: 400 },
      );
    }

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
