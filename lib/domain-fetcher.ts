import urlMetadata from 'url-metadata';
import {
  enrichDomainInfoWithAI,
  generateDomainInfoWithAI,
} from '@/lib/ai-service';
import prisma from '@/lib/prisma';

// In-flight request cache to prevent duplicate processing
const inFlightRequests = new Map<string, Promise<DomainInfo>>();

export interface DomainInfo {
  domain: string;
  name: string | null;
  description: string | null;
  type: string | null;
}

/**
 * Extract brand information from a domain
 */
export async function fetchDomainInfo(
  domain: string,
  resultId?: string,
): Promise<DomainInfo> {
  const logPrefix = resultId ? `[${resultId}]` : '[DomainFetcher]';
  const normalizedDomain = normalizeDomain(domain);

  // Check if there's already an in-flight request for this domain
  const existingRequest = inFlightRequests.get(normalizedDomain);
  if (existingRequest) {
    console.log(
      `${logPrefix} Reusing in-flight request for ${normalizedDomain}`,
    );
    return existingRequest;
  }

  // Create the request promise
  const requestPromise = (async () => {
    // 0. Cache Check: Check DB for existing Brand or Source info to save resources
    try {
      // Check Brand first (usually has description)
      const existingBrand = await prisma.brand.findUnique({
        where: { domain: normalizedDomain },
      });

      if (existingBrand) {
        console.log(`${logPrefix} Cache hit (Brand) for ${normalizedDomain}`);
        return {
          domain: existingBrand.domain,
          name: existingBrand.name,
          description: existingBrand.description,
          type: 'CORPORATE', // Brands are typically corporate/product entities
        };
      }

      // Check Source second (has type)
      const existingSource = await prisma.source.findFirst({
        where: { hostname: normalizedDomain },
        orderBy: { createdAt: 'desc' }, // Use most recent
      });

      if (existingSource && existingSource.type) {
        console.log(`${logPrefix} Cache hit (Source) for ${normalizedDomain}`);
        return {
          domain: existingSource.hostname,
          name: existingSource.title || existingSource.hostname,
          description: null, // Sources don't store description yet
          type: existingSource.type,
        };
      }
    } catch (dbError) {
      // Continue to scraping if cache check fails
    }

    let metadata;
    let metadataFetched = false;

    try {
      const url = `https://${normalizedDomain}`;
      metadata = await urlMetadata(url, {
        timeout: 10000, // 10 second timeout
      });
      metadataFetched = true;
    } catch (error) {
      // Scraping failed, will fall back to AI generation
    }

    // 1. Attempt AI enrichment if metadata was fetched
    if (metadataFetched) {
      try {
        const enrichedInfo = await enrichDomainInfoWithAI(
          metadata,
          normalizedDomain,
        );

        return {
          domain: normalizedDomain,
          name: enrichedInfo.name,
          description: enrichedInfo.description,
          type: enrichedInfo.type,
        };
      } catch (aiEnrichmentError) {
        const msg =
          aiEnrichmentError instanceof Error
            ? aiEnrichmentError.message
            : String(aiEnrichmentError);
        console.error(`AI enrichment failed for ${normalizedDomain}: ${msg}`);
        // Fall through to AI generation
      }
    }

    // 2. Fallback: AI generation from scratch (if metadata failed OR enrichment failed)
    try {
      const aiGeneratedInfo = await generateDomainInfoWithAI(normalizedDomain);
      return {
        domain: normalizedDomain,
        name: aiGeneratedInfo.name,
        description: aiGeneratedInfo.description,
        type: aiGeneratedInfo.type,
      };
    } catch (aiGenerationError) {
      // Continue to final fallback
    }

    // 3. Final Fallback: Use metadata if available (even if enrichment failed), otherwise basic info
    const metadataDescription = metadata
      ? extractDescriptionFromMetadata(metadata)
      : null;

    return {
      domain: normalizedDomain,
      name: normalizedDomain,
      description: metadataDescription,
      type: 'WEBSITE',
    };
  })();

  // Store the in-flight request
  inFlightRequests.set(normalizedDomain, requestPromise);

  // Clean up when done (both success and error)
  requestPromise.finally(() => {
    inFlightRequests.delete(normalizedDomain);
  });

  return requestPromise;
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
