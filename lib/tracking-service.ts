// lib/tracking-service.ts
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { trackPrompt } from './cloro';
import { countries } from './countries';
import { analyzeBrandMetrics } from './ai-service';

export async function trackAllPrompts() {
  const prompts = await prisma.prompt.findMany({
    include: {
      brand: true,
    },
  });

  for (const prompt of prompts) {
    await trackPromptById(prompt.id);
  }
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

    const updatedTrackingResult = await prisma.trackingResult.update({
      where: { id: trackingResult.id },
      data: {
        response: apiResponse as Prisma.InputJsonValue,
        status: 'SUCCESS',
      },
    });

    // --- LLM-based Metrics Calculation ---
    const responseData = apiResponse as any;
    const brandName = prompt.brand.name || prompt.brand.domain;

    if (responseData?.result?.text) {
      const metrics = await analyzeBrandMetrics(
        responseData.result.text,
        brandName,
      );

      // Create metrics object, regardless of whether the brand was found.
      await prisma.brandMetrics.create({
        data: {
          sentiment: metrics.sentiment,
          position: metrics.position,
          competitors: (metrics.competitors ?? []) as Prisma.InputJsonValue,
          trackingResultId: updatedTrackingResult.id,
        },
      });
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
