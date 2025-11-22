import urlMetadata from 'url-metadata';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface DomainInfo {
  domain: string;
  name: string | null;
  description: string | null;
  faviconUrl: string | null;
  type: string | null;
}

/**
 * Extract brand information from a domain including name and favicon
 */
export async function fetchDomainInfo(domain: string): Promise<DomainInfo> {
  try {
    // Normalize the domain
    const normalizedDomain = normalizeDomain(domain);
    const url = `https://${normalizedDomain}`;

    // Get metadata using url-metadata
    const metadata = await urlMetadata(url, {
      timeout: 10000, // 10 second timeout
    });

    // Extract information using AI (combines name and type extraction)
    const enrichedInfo = await enrichDomainInfoWithAI(
      metadata,
      normalizedDomain,
    );

    // Extract description from metadata
    const description = extractDescriptionFromMetadata(metadata);

    // Use Google favicon service
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${normalizedDomain}&sz=64`;

    return {
      domain: normalizedDomain,
      name: enrichedInfo.name,
      type: enrichedInfo.type,
      description,
      faviconUrl,
    };
  } catch (error) {
    console.warn(`Error fetching domain info for ${domain}:`, error);

    // Fallback: use domain-based extraction
    const normalizedDomain = normalizeDomain(domain);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${normalizedDomain}&sz=64`;

    return {
      domain: normalizedDomain,
      name: normalizedDomain,
      description: null,
      faviconUrl,
      type: 'WEBSITE', // Default fallback type
    };
  }
}

/**
 * Extract description from metadata
 */
function extractDescriptionFromMetadata(metadata: any): string | null {
  const description =
    metadata['og:description'] ||
    metadata['twitter:description'] ||
    metadata.description;

  if (description && typeof description === 'string') {
    return description.trim();
  }

  return null;
}

/**
 * Extract brand name and type from URL metadata using AI
 */
async function enrichDomainInfoWithAI(
  metadata: any,
  domain: string,
): Promise<{ name: string; type: string }> {
  // Try multiple sources for the title/name in order of preference
  const titleSource =
    metadata['og:site_name'] ||
    metadata['twitter:site'] ||
    metadata['application-name'] ||
    metadata.title ||
    domain;

  // Extract og:type for hint
  const ogType = metadata['og:type'] || '';

  try {
    // Import AI models (same as ai-service.ts)
    const { openai } = require('@ai-sdk/openai');
    const { google } = require('@ai-sdk/google');

    let model;
    if (process.env.OPENAI_API_KEY) {
      model = openai('gpt-4o-mini');
    } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      model = google('gemini-2.5-flash-lite');
    } else {
      throw new Error('No LLM provider API key found');
    }

    const { object } = await generateObject({
      model,
      schema: z.object({
        brandName: z.string().max(100).describe('The cleaned brand name'),
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
      }),
      prompt: `
Analyze this website metadata to extract the Brand Name and Classify the Source Type.

Given:
- Domain: "${domain}"
- Page Title/Site Name: "${titleSource}"
- OG Type: "${ogType}"

1. **Brand Name**: Extract the core brand name. Remove generic text ("Official Site", "Home", "Inc", "LLC").
2. **Source Type**: Classify the website into one of these categories:
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
- "nytimes.com" -> Name: "The New York Times", Type: "NEWS"
- "reddit.com" -> Name: "Reddit", Type: "SOCIAL_MEDIA"
- "hubspot.com" -> Name: "HubSpot", Type: "CORPORATE"
- "medium.com" -> Name: "Medium", Type: "BLOG"
      `.trim(),
    });

    return {
      name: object.brandName,
      type: object.sourceType,
    };
  } catch (error) {
    // Fallback if AI fails
    return {
      name: domain,
      type: 'WEBSITE',
    };
  }
}

/**
 * Normalize a domain string
 */
function normalizeDomain(domain: string): string {
  try {
    // If domain already has protocol, use URL constructor
    if (domain.startsWith('http')) {
      const url = new URL(domain);
      return url.hostname
        .replace(/^www\./, '')
        .toLowerCase()
        .trim();
    }

    // Otherwise, just clean up the string
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '') // Remove any path
      .toLowerCase()
      .trim();
  } catch (error) {
    // If all else fails, return a cleaned version of the input
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .toLowerCase()
      .trim();
  }
}

/**
 * Validate if a string is a valid domain format
 */
export function isValidDomain(domain: string): boolean {
  const normalizedDomain = normalizeDomain(domain);

  // Basic domain regex
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;

  return (
    domainRegex.test(normalizedDomain) &&
    normalizedDomain.length <= 253 &&
    !normalizedDomain.startsWith('.') &&
    !normalizedDomain.endsWith('.')
  );
}
