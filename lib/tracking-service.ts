// lib/tracking-service.ts
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { trackPrompt } from './cloro';
import { countries } from './countries';

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

    // --- Visibility Calculation Logic ---
    let visibility = 0;
    let extractedEntities: any[] = [];

    const responseData = apiResponse as any;
    const brandName = prompt.brand.name?.toLowerCase();
    const brandDomain = prompt.brand.domain.toLowerCase();

    // Step 1: Prioritize the entities field
    if (
      responseData?.result?.entities &&
      Array.isArray(responseData.result.entities) &&
      responseData.result.entities.length > 0
    ) {
      extractedEntities = responseData.result.entities;
      const brandEntity = extractedEntities.find(
        (entity) =>
          entity.name?.toLowerCase() === brandName ||
          entity.domain?.toLowerCase() === brandDomain,
      );

      if (brandEntity) {
        visibility = brandEntity.visibility_score || 100;
      }
    } else if (responseData?.result?.text) {
      // Step 2: Fallback to Text Inspection
      const responseText = responseData.result.text.toLowerCase();
      if (
        (brandName && responseText.includes(brandName)) ||
        responseText.includes(brandDomain)
      ) {
        visibility = 100;
      }
    }

    // Step 3: Store the Results in BrandMetrics
    await prisma.brandMetrics.create({
      data: {
        visibility,
        entities: extractedEntities as Prisma.InputJsonValue,
        trackingResultId: updatedTrackingResult.id,
      },
    });
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
