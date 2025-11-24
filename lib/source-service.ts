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

  console.log(
    `[SourceProcess] Processing ${sources.length} sources for result ${resultId}`,
  );

  // Process sources in parallel
  await Promise.all(
    sources.map(async (source) => {
      try {
        // 1. Check if source already exists by URL
        let existingSource = await prisma.source.findUnique({
          where: { url: source.url },
        });

        if (!existingSource) {
          // 2. If new source, fetch metadata
          const domainInfo = await fetchDomainInfo(source.hostname, resultId);
          try {
            console.log(
              `[SourceCreate] Creating new source for ${source.url} and linking to result ${resultId}`,
            );
            // 3. Try to Create new Source and link to Result
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
            console.log(
              `[SourceCreate] SUCCESS: Created source ${createdSource.id} (${createdSource.hostname}) linked to result ${resultId}`,
            );
            return;
          } catch (createError: any) {
            // Handle race condition: Unique constraint failed means it was created by another process
            if (createError.code === 'P2002') {
              console.log(
                `[SourceCreate] Race condition detected for ${source.url} - finding existing source`,
              );
              existingSource = await prisma.source.findUnique({
                where: { url: source.url },
              });
              if (existingSource) {
                console.log(
                  `[SourceCreate] Found existing source ${existingSource.id} due to race condition`,
                );
              } else {
                console.error(
                  `[SourceCreate] Race condition but no existing source found for ${source.url}`,
                );
              }
            } else {
              console.error(
                `[SourceCreate] UNEXPECTED ERROR creating source ${source.url}:`,
                createError,
              );
              throw createError;
            }
          }
        }

        // 4. Link existing source (found initially or after race condition) to this result
        if (existingSource) {
          try {
            console.log(
              `[SourceLink] Attempting to link existing source ${existingSource.id} to result ${resultId}`,
            );
            await prisma.result.update({
              where: { id: resultId },
              data: {
                sources: {
                  connect: { id: existingSource.id },
                },
              },
            });
            console.log(
              `[SourceLink] SUCCESS: Linked source ${existingSource.id} to result ${resultId}`,
            );
          } catch (linkError) {
            const errorMsg =
              linkError instanceof Error
                ? linkError.message
                : String(linkError);
            console.error(
              `[SourceLink] FAILED: Could not link source ${existingSource.id} to result ${resultId}:`,
              linkError,
            );
            console.error(`[SourceLink] Error details:`, {
              sourceId: existingSource.id,
              resultId,
              error: errorMsg,
            });
            throw linkError; // Re-throw to make it visible in the main catch block
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[SourceProcess] FAILED to process source ${source.url}:`,
          {
            error: errorMsg,
            url: source.url,
            resultId,
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
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
