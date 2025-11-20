import urlMetadata from 'url-metadata';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface DomainInfo {
  domain: string;
  name: string | null;
  description: string | null;
  faviconUrl: string | null;
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

    // Extract brand name from metadata
    const name = await extractBrandNameFromMetadata(metadata, normalizedDomain);

    // Extract description from metadata
    const description = extractDescriptionFromMetadata(metadata);

    // Extract favicon URL from metadata
    const faviconUrl = extractFaviconUrl(metadata, normalizedDomain);

    return {
      domain: normalizedDomain,
      name,
      description,
      faviconUrl,
    };
  } catch (error) {
    console.error(`Error fetching domain info for ${domain}:`, error);

    // Fallback: use domain-based extraction
    const normalizedDomain = normalizeDomain(domain);
    const name = extractBrandNameFromDomain(normalizedDomain);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${normalizedDomain}&sz=64`;

    return {
      domain: normalizedDomain,
      name,
      description: null,
      faviconUrl,
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
 * Extract brand name from URL metadata using AI cleaning
 */
async function extractBrandNameFromMetadata(
  metadata: any,
  domain: string,
): Promise<string> {
  // Try multiple sources in order of preference
  const sources = [
    metadata['og:site_name'],
    metadata['twitter:site'],
    metadata['application-name'],
    metadata.title,
  ];

  for (const source of sources) {
    if (source && typeof source === 'string') {
      const cleaned = await cleanBrandNameWithAI(source, domain);
      if (cleaned && cleaned.length > 1) {
        return cleaned;
      }
    }
  }

  // Fallback to domain-based extraction
  return extractBrandNameFromDomain(domain);
}

/**
 * Clean and extract meaningful brand name using AI
 */
async function cleanBrandNameWithAI(
  text: string,
  domain: string,
): Promise<string | null> {
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
        brandName: z
          .string()
          .max(100)
          .nullable()
          .describe('The cleaned brand name or null if no valid brand found'),
      }),
      prompt: `
Extract the actual brand name from this website title/metadata.

Given:
- Domain: "${domain}"
- Text: "${text}"

Return only the core brand/company name. Remove:
- Descriptive text like "SEO Content Optimization Platform", "Official Website", etc.
- Generic terms like "Home", "Welcome", "Dashboard", "Login"
- Legal endings like "Inc", "LLC", "Ltd" unless essential to the name
- Domain references like ".com"

Examples:
- "Surfer: SEO Content Optimization Platform" → "Surfer"
- "Google - Search Engine" → "Google"
- "Welcome to ACME Corp - Home" → "ACME Corp"
- "Tesla: Electric Cars, Solar & Clean Energy" → "Tesla"
- "Microsoft Official Website" → "Microsoft"
- "Amazon.com: Online Shopping" → "Amazon"

Return just the brand name, nothing else.
      `.trim(),
    });

    return object.brandName;
  } catch (error) {
    // Fallback: return original text if AI fails
    return text;
  }
}

/**
 * Extract favicon URL from URL metadata
 */
function extractFaviconUrl(metadata: any, domain: string): string | null {
  // Try to get favicon from metadata
  const faviconUrl = metadata.favicon;

  if (faviconUrl && typeof faviconUrl === 'string') {
    // Convert relative URLs to absolute
    if (faviconUrl.startsWith('/')) {
      return `https://${domain}${faviconUrl}`;
    }
    if (faviconUrl.startsWith('//')) {
      return `https:${faviconUrl}`;
    }
    if (faviconUrl.startsWith('http')) {
      return faviconUrl;
    }
    if (!faviconUrl.startsWith('http') && !faviconUrl.startsWith('//')) {
      return `https://${domain}/${faviconUrl}`;
    }
  }

  // Fallback to Google favicon service
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/**
 * Extract brand name from domain (fallback method)
 */
function extractBrandNameFromDomain(domain: string): string {
  // Remove subdomains and extract the main domain
  let name = '';
  const parts = domain.split('.');

  // Handle common TLDs like .co.uk, .com.au, etc.
  if (
    parts.length >= 3 &&
    ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(
      parts[parts.length - 2],
    )
  ) {
    name = parts[parts.length - 3];
  } else {
    // For regular domains, use the second-level domain
    name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  }

  // Capitalize the first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
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
