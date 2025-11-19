import prisma from '@/lib/prisma';
import { trackPrompt } from './cloro';
import { analyzeBrandMetrics, getCompetitorDomain } from './ai-service';
import { ProviderModel, Result } from '@prisma/client';

export async function trackAllPrompts(concurrency = 2) {
  const prompts = await prisma.prompt.findMany({
    include: {
      brand: {
        include: {
          organization: true,
        },
      },
    },
  });

  // Create a flat queue of all model tasks to process
  const taskQueue: any[] = [];
  for (const prompt of prompts) {
    const enabledModels = prompt.brand.organization
      ? (prompt.brand.organization.aiModels as string[]) || []
      : [];
    for (const modelString of enabledModels) {
      taskQueue.push({
        promptId: prompt.id,
        model: modelString,
        prompt,
      });
    }
  }

  let taskIndex = 0;
  const results: any[] = [];

  async function worker(workerId: number) {
    while (taskIndex < taskQueue.length) {
      const currentIndex = taskIndex++;
      const task = taskQueue[currentIndex];

      if (!task) {
        break;
      }

      const result = await trackSingleModel(
        task.promptId,
        task.model,
        task.prompt,
      );
      results.push(result);
    }
  }

  const workers = Array(concurrency)
    .fill(0)
    .map((_, i) => worker(i + 1));
  await Promise.all(workers);
}

async function trackSingleModel(
  promptId: string,
  modelString: string,
  prompt: any,
) {
  const model = modelString as ProviderModel;
  let result: Result | null = null;

  try {
    // Create a Result for this model
    result = await prisma.result.create({
      data: {
        promptId: prompt.id,
        model,
        status: 'PENDING',
      },
    });

    // Update to PROCESSING status
    await prisma.result.update({
      where: { id: result.id },
      data: { status: 'PROCESSING' },
    });

    // Use country code directly
    const countryCode = prompt.country;

    // Call the cloro API for this specific model
    const apiResponse = await trackPrompt(prompt.text, countryCode, model);

    // --- LLM-based Metrics Calculation ---
    const responseData = apiResponse as any;
    const brandName = prompt.brand.name || prompt.brand.domain;
    let sentiment: number | null = null;
    let position: number | null = null;
    let competitors: string[] | null = null;

    if (responseData?.result?.text) {
      const metrics = await analyzeBrandMetrics(
        responseData.result.text,
        brandName,
      );

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
              // We use 'organizationId: null' for unmanaged competitors
              let competitorBrand = await prisma.brand.findUnique({
                where: { domain: competitorDomain },
              });

              if (!competitorBrand) {
                competitorBrand = await prisma.brand.create({
                  data: {
                    domain: competitorDomain,
                    name: competitorNameRaw,
                    organizationId: null, // Not owned by the current org
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
                  mentions: {
                    increment: 1,
                  },
                },
                create: {
                  brandId: prompt.brandId,
                  competitorId: competitorBrand.id,
                },
              });
            }
          } catch (error) {
            console.warn(
              `Failed to process competitor ${competitorNameRaw}:`,
              error,
            );
          }
        }
      }
    } else {
      throw new Error('No text found in Cloro API response to analyze.');
    }

    // Update the Result with success data
    await prisma.result.update({
      where: { id: result.id },
      data: {
        status: 'SUCCESS',
        response: apiResponse as any,
        sentiment,
        position,
        competitors: competitors as any,
      },
    });

    // Success - no need to log
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `Failed to track prompt ${promptId} with model ${model}: ${errorMessage}`,
    );

    // Try to update the Result to FAILED status
    try {
      if (result) {
        await prisma.result.updateMany({
          where: {
            promptId,
            model,
            status: 'PROCESSING',
          },
          data: {
            status: 'FAILED',
            response: {
              error: errorMessage,
            } as any,
          },
        });
      }
    } catch (updateError) {
      // Non-critical error - Result already exists, don't log noise
    }
  }
}

export async function trackPromptById(promptId: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      brand: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!prompt) {
    console.error(`Prompt with id ${promptId} not found`);
    return;
  }

  if (!prompt.brand.organization) {
    console.warn(`Prompt ${promptId} belongs to an unmanaged brand.`);
    return;
  }

  // Get enabled AI models for the organization
  const enabledModels = (prompt.brand.organization.aiModels as string[]) || [];

  if (enabledModels.length === 0) {
    console.warn(
      `No AI models enabled for organization ${prompt.brand.organization.name}`,
    );
    return;
  }

  // Process models with concurrency limit of 2
  const taskQueue = enabledModels.map((modelString) => ({
    promptId,
    model: modelString,
    prompt,
  }));

  let taskIndex = 0;
  const concurrency = 2;

  async function worker(workerId: number) {
    while (taskIndex < taskQueue.length) {
      const currentIndex = taskIndex++;
      const task = taskQueue[currentIndex];

      if (!task) {
        break;
      }

      await trackSingleModel(task.promptId, task.model, task.prompt);
    }
  }

  const workers = Array(concurrency)
    .fill(0)
    .map((_, i) => worker(i + 1));
  await Promise.all(workers);
}
