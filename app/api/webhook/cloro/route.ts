import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { analyzeBrandMetrics, getCompetitorDomain } from '@/lib/ai-service';
import { waitUntil } from '@vercel/functions';

export const maxDuration = 60; // Allow up to 60s for the webhook handler to run

async function processWebhook(body: any) {
  try {
    const { idempotencyKey, status } = body.task;
    const resultId = idempotencyKey; // The idempotencyKey is our Result ID
    const responseData = body.response;

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        prompt: {
          include: {
            brand: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      console.error(`Result with ID ${resultId} not found.`);
      return;
    }

    if (status !== 'COMPLETED') {
      // Handle FAILED or other statuses from Cloro
      await prisma.result.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          response: { error: `Task failed with status: ${status}` } as any,
        },
      });
      console.log(`Result ${resultId} marked as FAILED`);
      return;
    }

    const prompt = result.prompt;
    const brandName = prompt.brand.name || prompt.brand.domain;
    const orgId = prompt.brand.organization?.id || 'N/A';

    console.log(
      `[${orgId}] Webhook processing for resultId: ${resultId}, status: ${status}`,
    );

    let sentiment: number | null = null;
    let position: number | null = null;
    let competitors: string[] | null = null;

    if (responseData?.text) {
      try {
        const metrics = await analyzeBrandMetrics(responseData.text, brandName);

        sentiment = metrics.sentiment;
        position = metrics.position;
        competitors = metrics.competitors;

        // Add new competitors to the Competitors table (as Brands)
        if (metrics.competitors) {
          for (const competitorNameRaw of metrics.competitors) {
            try {
              // Resolve domain using LLM
              const competitorDomain = await getCompetitorDomain(
                competitorNameRaw,
                prompt.text,
              );

              if (competitorDomain) {
                // 1. Find or Create the Competitor Brand
                let competitorBrand = await prisma.brand.findUnique({
                  where: { domain: competitorDomain },
                });

                if (!competitorBrand) {
                  competitorBrand = await prisma.brand.create({
                    data: {
                      domain: competitorDomain,
                      name: competitorNameRaw,
                      organizationId: null,
                    },
                  });
                }

                // Prevent adding the brand itself as a competitor
                if (competitorBrand.id === prompt.brandId) {
                  continue;
                }

                // 2. Link it as a competitor to the current brand
                await prisma.competitor.upsert({
                  where: {
                    brandId_competitorId: {
                      brandId: prompt.brandId,
                      competitorId: competitorBrand.id,
                    },
                  },
                  update: {
                    mentions: { increment: 1 },
                  },
                  create: {
                    brandId: prompt.brandId,
                    competitorId: competitorBrand.id,
                  },
                });
              }
            } catch (err) {
              console.warn(
                `Failed to process competitor ${competitorNameRaw}:`,
                err,
              );
            }
          }
        }
      } catch (metricsError) {
        console.error(
          `Failed to analyze metrics for result ${resultId}:`,
          metricsError,
        );
        // Continue to save the raw response even if analysis fails
      }
    }

    // Update the Result with success data
    await prisma.result.update({
      where: { id: resultId },
      data: {
        status: 'SUCCESS',
        response: { result: responseData } as any, // Wrap to match previous structure
        sentiment,
        position,
        competitors: competitors as any,
      },
    });

    console.log(
      `[${orgId}] Successfully processed webhook for resultId: ${resultId}`,
    );
  } catch (error) {
    console.error('Background webhook processing failed:', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the webhook payload structure
    if (
      !body.task ||
      !body.task.id ||
      !body.task.idempotencyKey ||
      !body.response
    ) {
      console.error('Invalid webhook payload:', body);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Offload processing to background
    waitUntil(processWebhook(body));

    return NextResponse.json({
      message: 'Webhook received, processing in background',
    });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
