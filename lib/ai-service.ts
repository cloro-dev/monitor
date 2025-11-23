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
    .array(
      z.object({
        name: z.string(),
        sentiment: z
          .number()
          .min(0)
          .max(100)
          .describe('Sentiment score 0-100')
          .nullable(),
      }),
    )
    .describe(
      'A ranked list of all brand names mentioned in the text, including the primary brand, ordered by prominence. Each object contains the name and its sentiment.',
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

const enrichedDomainInfoSchema = z.object({
  brandName: z.string().max(100).describe('The cleaned brand name'),
  description: z
    .string()
    .max(200)
    .describe('A short description of what the website is/does'),
  sourceType: z
    .enum([
      'NEWS',
      'BLOG',
      'SOCIAL_MEDIA',
      'FORUM',
      'CORPORATE',
      'E_COMMERCE',
      'WIKI',
      'GOVERNMENT',
      'REVIEW',
      'OTHER',
    ])
    .describe('The classification of the website source'),
});

const generatedDomainInfoSchema = z.object({
  brandName: z.string().max(100).describe('The cleaned brand name'),
  description: z
    .string()
    .max(200)
    .describe('A short description of what the website is/does'),
  sourceType: z
    .enum([
      'NEWS',
      'BLOG',
      'SOCIAL_MEDIA',
      'FORUM',
      'CORPORATE',
      'E_COMMERCE',
      'WIKI',
      'GOVERNMENT',
      'REVIEW',
      'OTHER',
    ])
    .describe('The classification of the website source'),
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
      3.  Determine if "${brandName}" (or any variation of it, e.g. case-insensitive, partial match, or domain) is mentioned in the text.
      4.  If "${brandName}" (or variation) IS mentioned:
          a.  Calculate its sentiment on a scale of 0-100 (0=very negative, 50=neutral, 100=very positive).
          b.  Identify its rank in the list.
      5.  If "${brandName}" (or variation) is NOT mentioned, its 'sentiment' and 'position' should be null.

      Return a JSON object with the following structure:
      - sentiment: The numerical sentiment score (0-100) for "${brandName}". Should be null if the brand is not mentioned.
      - position: The integer rank of "${brandName}" in the prominence list. Should be null if the brand is not mentioned.
      - competitors: A JSON array of objects { name: string, sentiment: number | null } for ALL brand names identified, ordered by their rank. If no brands are mentioned at all, this should be null.

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

/**
 * Extract brand name and type from URL metadata using AI
 */
export async function enrichDomainInfoWithAI(
  metadata: any,
  domain: string,
): Promise<{ name: string; description: string | null; type: string }> {
  // Try multiple sources for the title/name in order of preference
  const titleSource =
    metadata['og:site_name'] ||
    metadata['twitter:site'] ||
    metadata['application-name'] ||
    metadata.title ||
    domain;

  // Extract og:type for hint
  const ogType = metadata['og:type'] || '';

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
    schema: enrichedDomainInfoSchema,
    prompt: `
Analyze this website metadata to extract the Brand Name, Description, and Classify the Source Type.

Given:
- Domain: "${domain}"
- Page Title/Site Name: "${titleSource}"
- OG Type: "${ogType}"

1. **Brand Name**: Extract the core brand name. Remove generic text ("Official Site", "Home", "Inc", "LLC").
2. **Description**: A concise summary (max 200 chars) of what this website/brand is known for. If not explicitly clear, infer it from the context or brand name.
3. **Source Type**: Classify the website into one of these categories:
   - NEWS: News outlets, newspapers, magazines (e.g., NYT, CNN, TechCrunch).
   - BLOG: Personal or niche blogs, Substack, Medium.
   - SOCIAL_MEDIA: Social platforms (e.g., Twitter, Reddit, LinkedIn, Instagram).
   - FORUM: Discussion boards, Q&A sites (e.g., Quora, StackOverflow).
   - CORPORATE: Business websites, SaaS landing pages, company portfolios.
   - E_COMMERCE: Online stores (e.g., Amazon, Shopify stores).
   - WIKI: Encyclopedias, documentation, wikis (e.g., Wikipedia).
   - GOVERNMENT: .gov sites, official agencies.
   - REVIEW: Review aggregators (e.g., G2, Capterra, Yelp, TripAdvisor).
   - OTHER: Anything else.

Examples:
- "nytimes.com" -> Name: "The New York Times", Description: "Leading global news organization.", Type: "NEWS"
- "reddit.com" -> Name: "Reddit", Description: "Social news aggregation and discussion website.", Type: "SOCIAL_MEDIA"
- "hubspot.com" -> Name: "HubSpot", Description: "CRM platform for scaling companies.", Type: "CORPORATE"
- "medium.com" -> Name: "Medium", Description: "Open platform for reading and writing.", Type: "BLOG"
      `.trim(),
  });

  return {
    name: object.brandName,
    description: object.description,
    type: object.sourceType,
  };
}

/**
 * Generate domain info using AI when scraping fails
 */
export async function generateDomainInfoWithAI(
  domain: string,
): Promise<{ name: string; description: string | null; type: string }> {
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
    schema: generatedDomainInfoSchema,
    prompt: `
The website "${domain}" is currently inaccessible for scraping.
Based on your knowledge, please identify the Brand Name, write a short Description, and Classify the Source Type.

1. **Brand Name**: The core name of the entity.
2. **Description**: A concise summary (max 200 chars) of what this website/brand is known for.
3. **Source Type**: Choose the best fit:
   - NEWS, BLOG, SOCIAL_MEDIA, FORUM, CORPORATE, E_COMMERCE, WIKI, GOVERNMENT, REVIEW, OTHER.
    `.trim(),
  });

  return {
    name: object.brandName,
    description: object.description,
    type: object.sourceType,
  };
}
