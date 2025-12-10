import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { LanguageModel, generateObject } from 'ai';
import { z } from 'zod';
import { shouldLog, logDebug, logError, logWarn } from '@/lib/logger';

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
        position: z
          .number()
          .int()
          .describe(
            'The rank position of this competitor brand mentioned in the text. 1 is the most prominent.',
          )
          .nullable(),
        sentiment: z
          .number()
          .min(0)
          .max(100)
          .describe('Sentiment score 0-100')
          .nullable(),
      }),
    )
    .describe(
      'A ranked list of all brand names mentioned in the text, including the primary brand, ordered by prominence. Each object contains the name, position, and sentiment.',
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
  description: z.string().describe('A description of what the website is/does'),
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
  description: z.string().describe('A description of what the website is/does'),
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

// In-memory cache for domain enrichment (simple Map-based cache)
const enrichmentCache = new Map<
  string,
  { data: any; timestamp: number; ttl: number }
>();

// Cache helper functions
function getFromCache(key: string): any | null {
  const cached = enrichmentCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    enrichmentCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCache(key: string, data: any, ttlMinutes: number = 30): void {
  enrichmentCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000, // Convert minutes to milliseconds
  });
}

// Generate cache key from domain and description
function generateCacheKey(domain: string, description: string): string {
  // Use domain + first 50 chars of description for uniqueness
  const descKey = description.substring(0, 50).replace(/\s+/g, ' ').trim();
  return `${domain}:${descKey}`;
}

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

      **IMPORTANT: Focus on the core content ONLY. Ignore and exclude:**
      - Source citations and references (e.g., "[Source 1]", "Forbes Advisor", "Zapier")
      - Article titles and publication names
      - Links and URLs
      - Generic technology platforms mentioned in citations (e.g., Slack, Zapier, Google Drive)
      - "Best X of Y" list references
      - "X sites" or "X sources" mentions

      **ANALYZE ONLY the main substantive content that discusses actual competitors.**

      Please perform the following analysis:
      1.  Read the core text content carefully to identify actual competing brands mentioned in the substance of the response.
      2.  Create a ranked list of competing brand names based on their prominence in the CORE content. The most prominent brand should be at rank 1.
      3.  Determine if "${brandName}" (or any variation of it, e.g. case-insensitive, partial match, or domain) is mentioned in the core content.
      4.  If "${brandName}" (or variation) IS mentioned:
          a.  Calculate its sentiment on a scale of 0-100 (0=very negative, 50=neutral, 100=very positive).
          b.  Identify its rank in the list.
      5.  If "${brandName}" (or variation) is NOT mentioned, its 'sentiment' and 'position' should be null.

      Return a JSON object with the following structure:
      - sentiment: The numerical sentiment score (0-100) for "${brandName}". Should be null if the brand is not mentioned.
      - position: The integer rank of "${brandName}" in the prominence list. Should be null if the brand is not mentioned.
      - competitors: A JSON array of objects { name: string, position: number | null, sentiment: number | null } for ACTUAL competing brands identified in the core content, ordered by their rank. If no competing brands are mentioned, this should be null.

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

  // Extract description from metadata in order of preference
  const descriptionSource =
    metadata['og:description'] ||
    metadata['twitter:description'] ||
    metadata.description ||
    '';

  // Extract og:type for hint
  const ogType = metadata['og:type'] || '';

  // Log the description source for debugging (DEBUG level only)
  if (shouldLog('DEBUG')) {
    logDebug('AIEnrichment', 'AI enrichment details', {
      domain,
      descriptionSource: descriptionSource.substring(0, 100), // Truncate for logs
      descriptionLength: descriptionSource.length,
    });
  }

  // Check cache first
  const cacheKey = generateCacheKey(domain, descriptionSource);
  const cachedResult = getFromCache(cacheKey);
  if (cachedResult) {
    return {
      name: cachedResult.name,
      description: cachedResult.description,
      type: cachedResult.type,
    };
  }

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

  let object;
  try {
    const result = await generateObject({
      model,
      schema: enrichedDomainInfoSchema,
      prompt: `
Extract brand information for "${domain}".

CONTEXT:
- Domain: "${domain}"
- Title: "${titleSource}"
- Scraped Description: "${descriptionSource}"
- Type: "${ogType}"

INSTRUCTIONS:
1. **Brand Name**: Extract the core brand name (max 100 chars).

2. **Description**: Create a clear, informative description (ideally under 200 chars):
   - If scraped description is available: Use and clean up as needed (summarize if very long)
   - If scraped description is empty: Research and generate based on domain/title
   - Focus on what the website/company actually does
   - Aim for concise but comprehensive descriptions

3. **Source Type**: Choose one: NEWS, BLOG, SOCIAL_MEDIA, FORUM, CORPORATE, E_COMMERCE, WIKI, GOVERNMENT, REVIEW, OTHER

EXAMPLES:
- Corporate: "Custom software development company providing web development, mobile applications, and enterprise solutions."
- Platform: "No-code platform for building AI apps, automations, and internal tools efficiently."
- Service: "AI research and writing partner that helps users learn faster and work smarter."

Focus on providing meaningful descriptions that accurately represent the brand/website. Prefer concise descriptions under 200 characters when possible.
      `.trim(),
    });
    object = result.object;
  } catch (schemaError) {
    logWarn(
      'AIEnrichment',
      'Schema validation error during AI enrichment, retrying with fallback',
      {
        domain,
        error:
          schemaError instanceof Error
            ? schemaError.message
            : String(schemaError),
      },
    );
    // Try with a simpler fallback prompt
    const result = await generateObject({
      model,
      schema: enrichedDomainInfoSchema,
      prompt: `
Simplified extraction for "${domain}".

Brand Name (max 100 chars):

Description (ideally under 200 chars):
- If scraped available: "${descriptionSource}" → Use and clean up as needed
- If empty: research domain "${domain}" and generate informative description

Type (choose one: NEWS, BLOG, SOCIAL_MEDIA, FORUM, CORPORATE, E_COMMERCE, WIKI, GOVERNMENT, REVIEW, OTHER):

Focus on providing meaningful, accurate descriptions. Prefer concise descriptions under 200 characters when possible.
      `.trim(),
    });
    object = result.object;
  }

  // Cache the result before returning
  const result = {
    name: object.brandName,
    description: object.description,
    type: object.sourceType,
  };

  setCache(cacheKey, result, 30); // Cache for 30 minutes

  return result;
}

/**
 * Generate domain info using AI when scraping fails
 */
export async function generateDomainInfoWithAI(
  domain: string,
): Promise<{ name: string; description: string | null; type: string }> {
  // Log AI generation fallback for debugging
  if (shouldLog('DEBUG')) {
    logDebug('AIGeneration', 'AI generation fallback', {
      domain,
      reason: 'No scraped data available',
    });
  }

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
2. **Description**: A descriptive summary of what this website/brand is known for (ideally under 200 chars).
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
