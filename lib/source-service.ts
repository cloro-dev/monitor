import prisma from '@/lib/prisma';
import { fetchDomainInfo } from '@/lib/domain-fetcher';
import { logInfo, logError, shouldLog } from '@/lib/logger';

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

  logInfo('SourceProcess', 'Processing sources', {
    resultId,
    sourcesCount: sources.length,
  });

  let failureCount = 0;
  let createdCount = 0;
  let linkedCount = 0;

  // Process sources in parallel
  await Promise.all(
    sources.map(async (source) => {
      try {
        // 1. Check if source already exists by URL
        let existingSource = await prisma.source.findUnique({
          where: { url: source.url },
        });

        if (!existingSource) {
          // 2. If new source, fetch metadata and create
          const domainInfo = await fetchDomainInfo(source.hostname, resultId);
          try {
            const createdSource = await prisma.source.create({
              data: {
                url: source.url,
                hostname: source.hostname,
                title: source.title,
                type: domainInfo.type,
                results: {
                  connect: { id: resultId },
                },
              },
            });

            createdCount++;
            return;
          } catch (createError: any) {
            // Handle race condition: Unique constraint failed means it was created by another process
            if (createError.code === 'P2002') {
              existingSource = await prisma.source.findUnique({
                where: { url: source.url },
              });
            } else {
              logError('SourceProcess', 'Source create failed', createError, {
                resultId,
                url: source.url,
                operation: 'SourceCreate',
              });
              failureCount++;
              return;
            }
          }
        }

        // 3. Link existing source (found initially or after race condition) to this result
        if (existingSource) {
          try {
            await prisma.result.update({
              where: { id: resultId },
              data: {
                sources: {
                  connect: { id: existingSource.id },
                },
              },
            });

            linkedCount++;
          } catch (linkError) {
            logError('SourceProcess', 'Source link failed', linkError, {
              resultId,
              url: source.url,
              operation: 'SourceLink',
            });
            failureCount++;
          }
        }
      } catch (error) {
        // Log any unexpected errors
        logError('SourceProcess', 'Unexpected error processing source', error, {
          resultId,
          url: source.url,
          operation: 'SourceCreate',
        });
        failureCount++;
      }
    }),
  );

  // Log enhanced final processing summary
  const successCount = createdCount + linkedCount;
  const successRate =
    sources.length > 0
      ? ((successCount / sources.length) * 100).toFixed(1)
      : '0';

  if (shouldLog('INFO') || failureCount > 0) {
    logInfo('SourceProcess', 'Sources processed', {
      resultId,
      operation: 'SourceProcess',
      totalCount: sources.length,
      created: createdCount,
      linked: linkedCount,
      successCount,
      failureCount,
      successRate: `${successRate}%`,
    });
  }
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
