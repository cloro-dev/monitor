import urlMetadata from 'url-metadata';
import {
  enrichDomainInfoWithAI,
  generateDomainInfoWithAI,
} from '@/lib/ai-service';
import prisma from '@/lib/prisma';

export interface DomainInfo {
  domain: string;
  name: string | null;
  description: string | null;
  type: string | null;
}

/**
 * Extract brand information from a domain including name and favicon
 */
export async function fetchDomainInfo(
  domain: string,
  resultId?: string,
): Promise<DomainInfo> {
  const logPrefix = resultId ? `[${resultId}]` : '[DomainFetcher]';
  const normalizedDomain = normalizeDomain(domain);

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
    console.warn(`${logPrefix} DB Cache check failed for ${domain}:`, dbError);
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
    const msg = error instanceof Error ? error.message : String(error);
    console.info(
      `${logPrefix} Metadata fetch failed for ${domain} (${msg}). Using AI fallback.`,
    );
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
      console.warn(
        `${logPrefix} AI enrichment failed for ${domain} (${msg}). Falling back to AI generation.`,
      );
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
    const msg =
      aiGenerationError instanceof Error
        ? aiGenerationError.message
        : String(aiGenerationError);
    console.warn(`${logPrefix} AI generation failed for ${domain}: ${msg}`);
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
