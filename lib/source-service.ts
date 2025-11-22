import prisma from '@/lib/prisma';
import { fetchDomainInfo } from '@/lib/domain-fetcher';

interface ExtractedSource {
  url: string;
  title?: string;
  hostname: string;
}

/**
 * Process and save sources from the AI response.
 * Extracts URLs, fetches metadata (favicons), creates Source records, and links them to the Result.
 */
export async function processAndSaveSources(
  resultId: string,
  responseData: any,
) {
  if (!responseData) return;

  const sources = extractSourcesFromResponse(responseData);

  if (sources.length === 0) return;

  // Process sources in parallel
  await Promise.all(
    sources.map(async (source) => {
      try {
        // 1. Check if source already exists by URL
        const existingSource = await prisma.source.findUnique({
          where: { url: source.url },
        });

        if (existingSource) {
          // Link existing source to this result
          await prisma.result.update({
            where: { id: resultId },
            data: {
              sources: {
                connect: { id: existingSource.id },
              },
            },
          });
          return;
        }

        // 2. If new source, fetch metadata (favicon)
        // We use the domain-fetcher utility which handles favicon extraction
        const domainInfo = await fetchDomainInfo(source.hostname, resultId);

        // 3. Create new Source and link to Result
        await prisma.source.create({
          data: {
            url: source.url,
            hostname: source.hostname,
            title: source.title,
            type: domainInfo.type, // Added type
            results: {
              connect: { id: resultId },
            },
          },
        });
      } catch (error) {
        console.warn(`Failed to process source ${source.url}:`, error);
      }
    }),
  );
}

/**
 * Extract standard source objects from various AI response formats
 */
function extractSourcesFromResponse(responseData: any): ExtractedSource[] {
  const rawSources: any[] = [];

  // specific checks for common AI response structures (Perplexity, ChatGPT, etc)
  if (Array.isArray(responseData.sources)) {
    rawSources.push(...responseData.sources);
  } else if (Array.isArray(responseData.citations)) {
    rawSources.push(...responseData.citations);
  } else if (Array.isArray(responseData.references)) {
    rawSources.push(...responseData.references);
  }

  // Normalize and deduplicate
  const validSources = new Map<string, ExtractedSource>();

  for (const item of rawSources) {
    let url: string | null = null;
    let title: string | undefined = undefined;

    // Handle string citations (just URLs)
    if (typeof item === 'string') {
      url = item;
    }
    // Handle object citations
    else if (typeof item === 'object' && item !== null) {
      url = item.url || item.link || item.uri;
      title = item.title || item.name || item.label;
    }

    if (url) {
      try {
        // Normalize URL
        const urlObj = new URL(url);
        const normalizedUrl = urlObj.href;
        const hostname = urlObj.hostname.replace(/^www\./, '');

        if (!validSources.has(normalizedUrl)) {
          validSources.set(normalizedUrl, {
            url: normalizedUrl,
            hostname,
            title,
          });
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  }

  return Array.from(validSources.values());
}
