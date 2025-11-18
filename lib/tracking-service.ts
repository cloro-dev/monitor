import prisma from '@/lib/prisma';
import { trackPrompt } from './cloro';
import { analyzeBrandMetrics } from './ai-service';
import { ProviderModel } from '@prisma/client';

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
    const enabledModels =
      (prompt.brand.organization.aiModels as string[]) || [];
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
  let providerResult: any = null;

  try {
    // Create a ProviderResult for this model
    providerResult = await prisma.providerResult.create({
      data: {
        promptId: prompt.id,
        model,
        status: 'PENDING',
      },
    });

    // Update to PROCESSING status
    await prisma.providerResult.update({
      where: { id: providerResult.id },
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

      // Add new competitors to the BrandCompetitors table
      if (metrics.competitors) {
        for (const competitor of metrics.competitors) {
          await prisma.brandCompetitors.upsert({
            where: {
              brandId_name: {
                brandId: prompt.brandId,
                name: competitor,
              },
            },
            update: {},
            create: {
              brandId: prompt.brandId,
              name: competitor,
            },
          });
        }
      }
    } else {
      throw new Error('No text found in Cloro API response to analyze.');
    }

    // Update the ProviderResult with success data
    await prisma.providerResult.update({
      where: { id: providerResult.id },
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

    // Try to update the ProviderResult to FAILED status
    try {
      if (providerResult) {
        await prisma.providerResult.updateMany({
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
      // Non-critical error - ProviderResult already exists, don't log noise
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
