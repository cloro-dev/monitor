import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { trackPromptById } from '@/lib/tracking-service';
import { waitUntil } from '@vercel/functions';
import { logError, logInfo } from '@/lib/logger';

const createPromptSchema = z.object({
  text: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(200, 'Prompt must be at most 200 characters'),
  country: z.string().optional(),
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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '0'); // 0 means all

    const baseWhereClause: any = {
      userId: session.user.id,
      ...(brandId && { brandId }),
    };

    const whereClause: any = { ...baseWhereClause };

    if (status === 'ALL') {
      // No status filter = return all
    } else if (status) {
      whereClause.status = status;
    } else {
      // Default: Active and Suggested only (legacy behavior, though with tabs we usually specify)
      whereClause.status = { in: ['ACTIVE', 'SUGGESTED'] };
    }

    // 1. Get Counts per Status (for tabs)
    // We use baseWhereClause to get counts for the current context (User/Brand) ignoring the selected status tab
    const statusCounts = await prisma.prompt.groupBy({
      by: ['status'],
      where: baseWhereClause,
      _count: {
        id: true,
      },
    });

    const counts = {
      ACTIVE: 0,
      SUGGESTED: 0,
      ARCHIVED: 0,
    };

    statusCounts.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts] = item._count.id;
      }
    });

    // 2. Get Paginated Data
    const total = await prisma.prompt.count({ where: whereClause });

    const prompts = await prisma.prompt.findMany({
      where: whereClause,
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
        results: {
          select: {
            status: true,
            sentiment: true,
            position: true,
          },
        },
      },
      ...(limit > 0 && {
        skip: (page - 1) * limit,
        take: limit,
      }),
    });

    // Calculate aggregated metrics for each prompt from all Results
    const promptsWithMetrics = prompts.map((prompt) => {
      // For visibility calculation: use all SUCCESS results (regardless of sentiment)
      const successfulResultsForVisibility = prompt.results.filter(
        (pr) => pr.status === 'SUCCESS',
      );

      // For sentiment calculation: use only SUCCESS results with sentiment
      const successfulResultsForSentiment = prompt.results.filter(
        (pr) => pr.status === 'SUCCESS' && pr.sentiment != null,
      );

      if (successfulResultsForVisibility.length === 0) {
        // Return prompt without results array

        const { results, ...promptWithoutResults } = prompt;
        return {
          ...promptWithoutResults,
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

      // Return prompt without results array
      const { results, ...promptWithoutResults } = prompt;
      return {
        ...promptWithoutResults,
        visibilityScore,
        averageSentiment,
        averagePosition,
      };
    });

    return NextResponse.json({
      prompts: promptsWithMetrics,
      pagination: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
      counts,
    });
  } catch (error) {
    logError('PromptsGET', 'Error fetching prompts', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let session: any = null;
  let body: any = null;

  try {
    session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    const validatedData = createPromptSchema.parse(body);

    // Get user's active organization from session
    const userSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        user: {
          include: {
            members: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!userSession?.activeOrganizationId) {
      return NextResponse.json(
        { error: 'No active organization selected' },
        { status: 400 },
      );
    }

    const activeOrganization = userSession.user.members.find(
      (m: any) => m.organizationId === userSession.activeOrganizationId,
    )?.organization;

    if (!activeOrganization) {
      return NextResponse.json(
        { error: 'Active organization not found' },
        { status: 400 },
      );
    }

    // Check if user has access to the brand through organization-brand relationship
    const organizationBrand = await prisma.organization_brand.findFirst({
      where: {
        brandId: validatedData.brandId,
        organizationId: activeOrganization.id,
      },
      include: {
        organization: {
          select: {
            aiModels: true,
          },
        },
      },
    });

    if (!organizationBrand) {
      return NextResponse.json(
        { error: 'You do not have access to this brand' },
        { status: 400 },
      );
    }

    // Check if any AI models are enabled
    const enabledModels =
      (organizationBrand.organization.aiModels as string[]) || [];
    if (enabledModels.length === 0) {
      return NextResponse.json(
        {
          error:
            'No AI models enabled. Please enable at least one AI model in Settings > AI Models before creating prompts.',
        },
        { status: 400 },
      );
    }

    // Get brand details for default country
    const brand = await prisma.brand.findUnique({
      where: { id: validatedData.brandId },
      select: { defaultCountry: true },
    });

    // Use brand's default country as fallback, or the provided country, or US as final fallback
    const country = validatedData.country || brand?.defaultCountry || 'US';

    const newPrompt = await prisma.prompt.create({
      data: {
        text: validatedData.text,
        country: country.toUpperCase(),
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
    waitUntil(trackPromptById(newPrompt.id));

    logInfo('PromptsCreate', 'Prompt created successfully', {
      promptId: newPrompt.id,
      userId: session.user.id,
      organizationId: activeOrganization.id,
      brandId: validatedData.brandId,
      country: newPrompt.country,
    });

    return NextResponse.json(newPrompt, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }

    logError('PromptsCreate', 'Error creating prompt', error, {
      userId: session?.user?.id,
      brandId: body?.brandId,
      country: body?.country,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one prompt ID is required'),
  status: z.enum(['ACTIVE', 'SUGGESTED', 'ARCHIVED']),
});

export async function PUT(request: NextRequest) {
  let session: any = null;
  let body: any = null;
  let ids: string[] = [];
  let status: 'ACTIVE' | 'SUGGESTED' | 'ARCHIVED' = 'SUGGESTED';

  try {
    session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    body = await request.json();
    const validatedData = bulkUpdateSchema.parse(body);
    ids = validatedData.ids;
    status = validatedData.status;

    // Fetch user session to get active org
    const userSession = await prisma.session.findFirst({
      where: { userId: session.user.id },
      select: { activeOrganizationId: true },
    });

    if (!userSession?.activeOrganizationId) {
      return NextResponse.json(
        { error: 'No active organization' },
        { status: 403 },
      );
    }

    // Get all brands for this organization
    const orgBrands = await prisma.organization_brand.findMany({
      where: { organizationId: userSession.activeOrganizationId },
      select: { brandId: true },
    });
    const allowedBrandIds = orgBrands.map((ob) => ob.brandId);

    const result = await prisma.prompt.updateMany({
      where: {
        id: { in: ids },
        brandId: { in: allowedBrandIds }, // Security scope
      },
      data: {
        status,
      },
    });

    // If activated, trigger tracking
    if (status === 'ACTIVE') {
      // We need to find which IDs were actually updated to track them
      // updateMany returns count, but not the records.
      // So we fetch them. This is a bit redundant but ensures we only track valid ones.
      const activatedPrompts = await prisma.prompt.findMany({
        where: {
          id: { in: ids },
          brandId: { in: allowedBrandIds },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      activatedPrompts.forEach((p) => {
        waitUntil(trackPromptById(p.id));
      });
    }

    logInfo('PromptsBulkUpdate', 'Prompts bulk updated successfully', {
      userId: session.user.id,
      organizationId: userSession.activeOrganizationId,
      updatedCount: result.count,
      requestedCount: ids.length,
      status,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 },
      );
    }
    logError('PromptsBulkUpdate', 'Error bulk updating prompts', error, {
      userId: session?.user?.id,
      requestedIds: body?.ids,
      requestedStatus: body?.status,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
