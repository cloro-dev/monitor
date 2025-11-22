import prisma from '@/lib/prisma';
import { trackPromptAsync } from './cloro';
import { ProviderModel, Result } from '@prisma/client';

export async function trackAllPrompts(concurrency = 20) {
  const prompts = await prisma.prompt.findMany({
    where: {
      status: 'ACTIVE',
    },
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
    const orgId = prompt.brand.organization?.id || 'N/A';

    await trackPromptAsync(prompt.text, countryCode, model, result.id);

    console.log(
      `[${orgId}] Async task initiated for prompt:${promptId}, model:${model}, resultId:${result.id}`,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `Failed to initiate tracking for prompt ${promptId} with model ${model}: ${errorMessage}`,
    );

    // Try to update the Result to FAILED status
    try {
      if (result) {
        await prisma.result.updateMany({
          where: {
            id: result.id,
            status: { in: ['PENDING', 'PROCESSING'] },
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
