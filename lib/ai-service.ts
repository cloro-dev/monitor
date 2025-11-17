import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { LanguageModel, generateObject } from 'ai';
import { z } from 'zod';

// Define the schema for the structured object we want the LLM to return.
const brandMetricsSchema = z.object({
  sentiment: z
    .number()
    .min(0)
    .max(100)
    .describe(
      'A score from 0-100 representing the sentiment of the text concerning the primary brand. 0 is very negative, 50 is neutral, and 100 is very positive.',
    ),
  position: z
    .number()
    .int()
    .describe(
      'The rank of the primary brand mentioned in the text. 1 is the most prominent.',
    ),
  competitors: z
    .array(z.string())
    .describe(
      'A ranked list of all brand names mentioned in the text, including the primary brand, ordered by prominence.',
    ),
});

// Hardcoded model instances
const models = {
  openai: openai('gpt-4o-mini'),
  google: google('gemini-2.5-flash'),
};

/**
 * Analyzes a given text to extract brand metrics using an LLM.
 * @param text The text to analyze.
 * @param brandName The name of the primary brand to focus on.
 * @returns A promise that resolves to the structured brand metrics.
 */
export async function analyzeBrandMetrics(text: string, brandName: string) {
  let model: LanguageModel;

  // Select the LLM provider based on available environment variables.
  if (process.env.OPENAI_API_KEY) {
    model = models.openai;
  } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    model = models.google;
  } else {
    throw new Error(
      'No LLM provider API key found. Please set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.',
    );
  }

  const { object } = await generateObject({
    model,
    schema: brandMetricsSchema,
    prompt: `
      You are a professional market analyst. Your task is to analyze the following text
      to understand the competitive landscape for the brand "${brandName}".

      Please perform the following analysis:
      1.  Identify all brands mentioned in the text, including "${brandName}".
      2.  Rank these brands based on their prominence and context. The most important or central brand should be rank 1.
      3.  Determine the sentiment towards "${brandName}" on a scale of 0-100. Use the following rules for the score:
          - Positive indicators (score towards 100): Words like “trusted,” “reliable,” “innovative,” “leading,” “expert.”
          - Neutral indicators (score around 50): Factual language with little emotional tone.
          - Negative indicators (score towards 0): Critical language, concerns, or negative associations.

      Return a JSON object with the following structure:
      - sentiment: The numerical sentiment score (0-100) towards "${brandName}".
      - position: The specific integer rank of "${brandName}".
      - competitors: A simple JSON array of ALL brand names you identified, ordered by their rank.

      Text to analyze:
      ---
      ${text}
      ---
    `,
  });

  return object;
}
