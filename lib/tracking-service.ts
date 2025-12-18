import prisma from '@/lib/prisma';
import { trackPromptAsync } from './cloro';
import { ProviderModel, Result } from '@prisma/client';
import { logInfo, logError, logWarn } from '@/lib/logger';

export async function trackAllPrompts(concurrency = 5) {
  const batchSize = 50;
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const prompts = await prisma.prompt.findMany({
      where: {
        status: 'ACTIVE',
      },
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        text: true,
        country: true,
        brand: {
          select: {
            organizationBrands: {
              select: {
                organizationId: true,
                organization: {
                  select: {
                    aiModels: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (prompts.length < batchSize) {
      hasMore = false;
    } else {
      cursor = prompts[prompts.length - 1].id;
    }

    if (prompts.length === 0) {
      break;
    }

    // Create a flat queue of all model tasks to process for this batch
    const taskQueue: any[] = [];
    for (const prompt of prompts) {
      // For each organization that has access to this brand, check AI models
      for (const orgBrand of prompt.brand.organizationBrands) {
        const enabledModels =
          (orgBrand.organization.aiModels as string[]) || [];
        for (const modelString of enabledModels) {
          taskQueue.push({
            promptId: prompt.id,
            model: modelString,
            prompt,
            organizationId: orgBrand.organizationId,
          });
        }
      }
    }

    if (taskQueue.length > 0) {
      let taskIndex = 0;

      const worker = async () => {
        while (true) {
          const currentIndex = taskIndex++;
          if (currentIndex >= taskQueue.length) {
            break;
          }
          const task = taskQueue[currentIndex];

          await trackSingleModel(
            task.promptId,
            task.model,
            task.prompt,
            task.organizationId,
          );
        }
      };

      const workers = Array(concurrency)
        .fill(0)
        .map(() => worker());

      await Promise.all(workers);
    }
  }
}

async function trackSingleModel(
  promptId: string,
  modelString: string,
  prompt: any,
  organizationId?: string,
) {
  const model = modelString as ProviderModel;
  let result: Result | null = null;
  let orgId: string | undefined;

  try {
    // Create a Result for this model directly with PROCESSING status
    result = await prisma.result.create({
      data: {
        promptId: prompt.id,
        model,
        status: 'PROCESSING',
      },
    });

    // Use country code directly
    const countryCode = prompt.country;
    orgId = organizationId || 'N/A';

    await trackPromptAsync(prompt.text, countryCode, model, result.id);

    logInfo('PromptTracking', 'Async task initiated', {
      resultId: result.id,
      organizationId: orgId,
      promptId,
      model,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logError(
      'PromptTracking',
      'Failed to initiate tracking for prompt',
      error,
      {
        promptId,
        model,
        organizationId: orgId,
      },
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
    select: {
      id: true,
      text: true,
      country: true,
      brand: {
        select: {
          id: true,
          name: true,
          organizationBrands: {
            select: {
              organizationId: true,
              organization: {
                select: {
                  name: true,
                  aiModels: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!prompt) {
    logWarn('PromptTracking', 'Prompt not found, skipping tracking', {
      promptId,
    });
    return;
  }

  if (prompt.brand.organizationBrands.length === 0) {
    logWarn(
      'PromptTracking',
      'Prompt belongs to brand with no organization access',
      {
        promptId,
      },
    );
    return;
  }

  // Collect all enabled AI models from all organizations that have access to this brand
  const taskQueue: any[] = [];
  for (const orgBrand of prompt.brand.organizationBrands) {
    const enabledModels = (orgBrand.organization.aiModels as string[]) || [];
    if (enabledModels.length === 0) {
      logWarn(
        'PromptTracking',
        'No AI models enabled for organization, skipping tracking',
        {
          organizationId: orgBrand.organizationId,
          organizationName: orgBrand.organization.name,
        },
      );
      continue;
    }

    for (const modelString of enabledModels) {
      taskQueue.push({
        promptId,
        model: modelString,
        prompt,
        organizationId: orgBrand.organizationId,
      });
    }
  }

  if (taskQueue.length === 0) {
    logWarn(
      'PromptTracking',
      'No AI models enabled for any organization with brand access, skipping tracking',
      {
        brandId: prompt.brand.id,
        brandName: prompt.brand.name,
        promptId,
      },
    );
    return;
  }

  let taskIndex = 0;
  const concurrency = 2;

  async function worker(workerId: number) {
    while (taskIndex < taskQueue.length) {
      const currentIndex = taskIndex++;
      const task = taskQueue[currentIndex];

      if (!task) {
        break;
      }

      await trackSingleModel(
        task.promptId,
        task.model,
        task.prompt,
        task.organizationId,
      );
    }
  }

  const workers = Array(concurrency)
    .fill(0)
    .map((_, i) => worker(i + 1));
  await Promise.all(workers);
}
