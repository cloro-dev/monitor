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
    )
    .nullable(),
  position: z
    .number()
    .int()
    .describe(
      'The rank of the primary brand mentioned in the text. 1 is the most prominent.',
    )
    .nullable(),
  competitors: z
    .array(z.string())
    .describe(
      'A ranked list of all brand names mentioned in the text, including the primary brand, ordered by prominence.',
    )
    .nullable(),
});

// Define schema for generated prompts
const generatedPromptsSchema = z.object({
  prompts: z
    .array(z.string())
    .describe(
      'A list of 5 high-quality, distinct search prompts that potential customers might use.',
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
      1.  Read the text carefully to identify all brand names mentioned.
      2.  Create a ranked list of all brand names based on their prominence in the text. The most prominent brand should be at rank 1.
      3.  Determine if "${brandName}" is mentioned in the text.
      4.  If "${brandName}" IS mentioned:
          a.  Calculate its sentiment on a scale of 0-100 (0=very negative, 50=neutral, 100=very positive).
          b.  Identify its rank in the list.
      5.  If "${brandName}" is NOT mentioned, its 'sentiment' and 'position' should be null.

      Return a JSON object with the following structure:
      - sentiment: The numerical sentiment score (0-100) for "${brandName}". Should be null if the brand is not mentioned.
      - position: The integer rank of "${brandName}" in the prominence list. Should be null if the brand is not mentioned.
      - competitors: A JSON array of ALL brand names you identified, ordered by their rank. If no brands are mentioned at all, this should be null.

      Text to analyze:
      ---
      ${text}
      ---
    `,
  });

  return object;
}

/**
 * Generates a list of high-intent prompts for a brand based on its description.
 * @param brandName The name of the brand.
 * @param brandDescription The description of what the brand does.
 * @returns A promise that resolves to a list of suggested prompts.
 */
export async function generateBrandPrompts(
  brandName: string,
  brandDescription: string,
) {
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
    schema: generatedPromptsSchema,
    prompt: `
      You are an expert SEO and Brand Reputation Manager.
      Your goal is to generate 5 strategic, high-intent prompts to test the visibility of the brand "${brandName}" in AI search engines (like ChatGPT, Perplexity, Gemini).

      Brand Description: "${brandDescription}"

      Generate 5 distinct prompts that a potential customer might use when they are looking for a solution like this, BUT DO NOT KNOW THE BRAND YET.
      
      CRITICAL RULE: DO NOT INCLUDE THE BRAND NAME ("${brandName}") IN ANY OF THE PROMPTS.
      The goal is to see if the AI *suggests* this brand organically.

      Structure the 5 prompts to cover these specific angles:
      1.  **Category Leader:** A "Best [Specific Niche] tools" query. Make the niche specific to the brand's core value (e.g., not just "Best CRM", but "Best CRM for small plumbing businesses").
      2.  **Problem Solution:** A "How do I [solve specific pain point]?" query where this brand is the natural answer.
      3.  **Software Recommendation:** A query asking for software recommendations for a specific use case (e.g., "What software should I use to...").
      4.  **Alternative Hunt:** A query asking for alternatives to a generic method or a major competitor (if known/implied), but NOT the brand itself.
      5.  **Feature-Specific Search:** A query looking for a tool with a specific, unique feature mentioned in the description.

      Constraints:
      - Phrased as natural questions to an AI assistant.
      - **NEVER mention "${brandName}"**.
      - Focus on "unbranded" search queries.
    `,
  });

  return object.prompts;
}

export async function getCompetitorDomain(
  competitorName: string,
  contextPrompt: string,
) {
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
    schema: z.object({
      domain: z
        .string()
        .describe('The official website domain (e.g. "example.com")')
        .nullable(),
    }),
    prompt: `
      Identify the official website domain for the brand "${competitorName}".
      Context: The brand was mentioned in relation to the query: "${contextPrompt}".

      Return ONLY the domain name (e.g. "example.com", "google.com", "notion.so").
      Do not include "https://" or "www.".
      If you are unsure or if the brand does not have a distinct website, return null.
    `,
  });

  return object.domain;
}
