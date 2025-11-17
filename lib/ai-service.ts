import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { LanguageModel, generateObject } from 'ai';
import { z } from 'zod';

// Define the schema for the structured object we want the LLM to return.
const brandMetricsSchema = z.object({
  sentiment: z
    .enum(['positive', 'negative', 'neutral'])
    .describe(
      'The overall sentiment of the text concerning the primary brand. Must be one of: positive, negative, or neutral.',
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
      3.  Determine the overall sentiment towards "${brandName}".

      Return a JSON object with the following structure:
      - sentiment: The sentiment towards "${brandName}" (must be 'positive', 'negative', or 'neutral').
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
