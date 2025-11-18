import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { trackPrompt } from './cloro';
import { countries } from './countries';
import { analyzeBrandMetrics } from './ai-service';

export async function trackAllPrompts(concurrency = 2) {
  const prompts = await prisma.prompt.findMany({
    include: {
      brand: true,
    },
  });

  const results: any[] = [];
  let promptIndex = 0;

  async function worker(workerId: number) {
    while (promptIndex < prompts.length) {
      const currentIndex = promptIndex++;
      const prompt = prompts[currentIndex];

      if (!prompt) {
        break;
      }

      const result = await trackPromptById(prompt.id);
      results.push(result);
    }
  }

  const workers = Array(concurrency)
    .fill(0)
    .map((_, i) => worker(i + 1));
  await Promise.all(workers);
}

export async function trackPromptById(promptId: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: {
      brand: true,
    },
  });

  if (!prompt) {
    console.error(`Prompt with id ${promptId} not found`);
    return;
  }

  const countryEntry = countries.find((c) => c.label === prompt.country);
  if (!countryEntry) {
    console.error(
      `Invalid country name "${prompt.country}" for prompt ${prompt.id}. Cannot find ISO code.`,
    );
    await prisma.trackingResult.create({
      data: {
        promptId: prompt.id,
        status: 'FAILED',
        response: {
          error: `Invalid country name: ${prompt.country}`,
        } as Prisma.InputJsonValue,
      },
    });
    return;
  }
  const countryCode = countryEntry.value;

  let trackingResult;

  try {
    trackingResult = await prisma.trackingResult.create({
      data: {
        promptId: prompt.id,
        status: 'PENDING',
      },
    });

    trackingResult = await prisma.trackingResult.update({
      where: { id: trackingResult.id },
      data: { status: 'PROCESSING' },
    });

    const apiResponse = await trackPrompt(prompt.text, countryCode);

    // --- LLM-based Metrics Calculation ---
    const responseData = apiResponse as any;
    const brandName = prompt.brand.name || prompt.brand.domain;

    if (responseData?.result?.text) {
      const metrics = await analyzeBrandMetrics(
        responseData.result.text,
        brandName,
      );

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
      // Handle cases where the Cloro response has no text
      throw new Error('No text found in Cloro API response to analyze.');
    }
  } catch (error) {
    console.error(`Failed to track prompt ${prompt.id}:`, error);
    if (trackingResult) {
      await prisma.trackingResult.update({
        where: { id: trackingResult.id },
        data: { status: 'FAILED' },
      });
    }
  }
}
