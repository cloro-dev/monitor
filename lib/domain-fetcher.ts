import urlMetadata from 'url-metadata';
import {
  enrichDomainInfoWithAI,
  generateDomainInfoWithAI,
} from '@/lib/ai-service';
import prisma from '@/lib/prisma';
import { logInfo, logError, logWarn } from '@/lib/logger';

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
  const normalizedDomain = normalizeDomain(domain);

  // Check if there's already an in-flight request for this domain
  const existingRequest = inFlightRequests.get(normalizedDomain);
  if (existingRequest) {
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
        logInfo('DomainFetch', 'Using cached brand data', {
          resultId,
          domain: normalizedDomain,
          source: 'brand_cache',
        });
        return {
          domain: existingBrand.domain,
          name: existingBrand.name,
          description: existingBrand.description,
          type: 'CORPORATE',
        };
      }

      const existingSource = await prisma.source.findFirst({
        where: { hostname: normalizedDomain },
        orderBy: { createdAt: 'desc' },
      });

      if (existingSource && existingSource.type) {
        logInfo('DomainFetch', 'Using cached source data', {
          resultId,
          domain: normalizedDomain,
          source: 'source_cache',
        });
        return {
          domain: existingSource.hostname,
          name: existingSource.title || existingSource.hostname,
          description: null,
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
        timeout: 10000,
      });
      metadataFetched = true;
    } catch (error) {
      logWarn(
        'DomainFetch',
        'Scraping failed, will use AI generation fallback',
        {
          resultId,
          domain: normalizedDomain,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // AI enrichment if metadata was fetched
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
        logWarn('DomainFetch', 'AI enrichment failed, using basic metadata', {
          resultId,
          domain: normalizedDomain,
          error:
            aiEnrichmentError instanceof Error
              ? aiEnrichmentError.message
              : String(aiEnrichmentError),
        });
      }
    }

    // Fallback: AI generation from scratch
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

    // Final fallback: Use metadata if available
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
