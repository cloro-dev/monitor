import prisma from '@/lib/prisma';
import { fetchDomainInfo } from '@/lib/domain-fetcher';
import { logInfo, logError, shouldLog } from '@/lib/logger';
import { Prisma } from '@prisma/client';
import { getDateRange } from '@/lib/date-utils';

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

// Types for the sources analytics API
export interface SourcesAnalyticsDomainStat {
  domain: string;
  mentions: number;
  utilization: number;
  type?: string;
  uniquePrompts: number; // Number of unique prompts that mentioned this domain
  uniquePromptIds?: Set<string>; // Temporary field for server-side processing only
}

export interface SourcesAnalyticsURLStat {
  url: string;
  hostname: string;
  mentions: number;
  utilization: number;
  type?: string;
  uniquePrompts: number; // Number of unique prompts that mentioned this URL
  uniquePromptIds?: Set<string>; // Temporary field for server-side processing only
}

export interface SourcesAnalyticsResponse {
  domainStats: SourcesAnalyticsDomainStat[];
  urlStats: SourcesAnalyticsURLStat[];
  chartData: {
    data: any[];
    config: Record<string, { label: string; color: string }>;
  };
  summary: {
    totalPrompts: number;
    totalResults: number;
    totalDomains: number;
    totalUrls: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SourcesQueryParams {
  brandId: string;
  timeRange: '7d' | '30d' | '90d';
  tab: 'domain' | 'url';
  page: number;
  limit: number;
}

// Helper function to get root domain
function getRootDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

// Process URL to normalize it
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
}

// Main service function to get sources analytics data
export async function getSourcesAnalyticsData(
  userId: string,
  params: SourcesQueryParams,
): Promise<SourcesAnalyticsResponse> {
  const { brandId, timeRange, tab, page, limit } = params;
  const dateRange = getDateRange(timeRange);

  // Build where clause for prompts with user's organization access
  const baseWhereClause: Prisma.promptWhereInput = {
    userId,
    brandId, // Now required for performance
  };

  console.log(
    `[SourceService] Fetching data for user ${userId}, brand ${brandId}`,
  );
  const queryStart = Date.now();

  // First, get total counts for summary
  const [totalPrompts, totalResults] = await Promise.all([
    prisma.prompt.count({
      where: baseWhereClause,
    }),
    prisma.result.count({
      where: {
        prompt: baseWhereClause,
        status: 'SUCCESS',
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
      },
    }),
  ]);

  console.log(
    `[SourceService] Counts - Prompts: ${totalPrompts}, Results: ${totalResults}`,
  );

  // Get paginated prompts with their results and sources for the date range
  const prompts = await prisma.prompt.findMany({
    where: {
      ...baseWhereClause,
      results: {
        some: {
          status: 'SUCCESS',
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
      },
    },
    select: {
      id: true,
      results: {
        where: {
          status: 'SUCCESS',
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        // optimization: use select to exclude the heavy 'response' JSON field
        select: {
          sources: {
            select: {
              url: true,
              hostname: true,
              type: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    ...(limit > 0 && {
      skip: (page - 1) * limit,
      take: limit,
    }),
  });

  console.log(
    `[SourceService] Query execution time: ${Date.now() - queryStart}ms. Fetched ${prompts.length} prompts.`,
  );

  // Process all sources server-side
  const domainMap = new Map<string, SourcesAnalyticsDomainStat>();
  const urlMap = new Map<string, SourcesAnalyticsURLStat>();
  const processedPromptIds = new Set<string>();

  prompts.forEach((prompt) => {
    processedPromptIds.add(prompt.id);

    prompt.results.forEach((result) => {
      // Combine DB sources (legacy sources are now stored in DB)
      const allSources: Array<{
        url: string;
        type?: string;
      }> = [];

      // Add DB sources
      result.sources.forEach((source) => {
        allSources.push({
          url: source.url,
          type: source.type || undefined,
        });
      });

      // Process each source
      allSources.forEach(({ url, type }) => {
        try {
          if (!url) return;

          const urlObj = new URL(url);
          const hostname = urlObj.hostname.replace(/^www\./, '');
          const domain = getRootDomain(hostname);
          const cleanUrl = normalizeUrl(url);

          // Update domain stats
          if (!domainMap.has(domain)) {
            domainMap.set(domain, {
              domain,
              mentions: 0,
              utilization: 0,
              type,
              uniquePrompts: 0,
              uniquePromptIds: new Set<string>(), // Temporary Set for tracking unique prompts
            });
          }

          const domainStat = domainMap.get(domain)!;
          domainStat.mentions += 1;
          domainStat.uniquePromptIds?.add(prompt.id); // Track this prompt ID
          if (type && !domainStat.type) domainStat.type = type;

          // Update URL stats
          if (!urlMap.has(cleanUrl)) {
            urlMap.set(cleanUrl, {
              url: cleanUrl,
              hostname,
              mentions: 0,
              utilization: 0,
              type,
              uniquePrompts: 0,
              uniquePromptIds: new Set<string>(), // Temporary Set for tracking unique prompts
            });
          }

          const urlStat = urlMap.get(cleanUrl)!;
          urlStat.mentions += 1;
          urlStat.uniquePromptIds?.add(prompt.id); // Track this prompt ID
          if (type && !urlStat.type) urlStat.type = type;
        } catch (e) {
          // Invalid URL, skip
        }
      });
    });
  });

  const totalPromptsWithResults = processedPromptIds.size;

  // Calculate final stats for domains
  const domainStats = Array.from(domainMap.values())
    .map((stat: any) => ({
      domain: stat.domain,
      mentions: stat.mentions,
      utilization:
        totalPromptsWithResults > 0
          ? ((stat.uniquePromptIds?.size || 0) / totalPromptsWithResults) * 100
          : 0,
      type: stat.type,
      uniquePrompts: stat.uniquePromptIds?.size || 0, // Actual unique count for this domain
    }))
    .sort((a, b) => b.utilization - a.utilization);

  // Calculate final stats for URLs
  const urlStats = Array.from(urlMap.values())
    .map((stat: any) => ({
      url: stat.url,
      hostname: stat.hostname,
      mentions: stat.mentions,
      utilization:
        totalPromptsWithResults > 0
          ? ((stat.uniquePromptIds?.size || 0) / totalPromptsWithResults) * 100
          : 0,
      type: stat.type,
      uniquePrompts: stat.uniquePromptIds?.size || 0, // Actual unique count for this URL
    }))
    .sort((a, b) => b.utilization - a.utilization);

  // Note: Chart data is generated client-side to match original behavior
  return {
    domainStats,
    urlStats,
    chartData: { data: [], config: {} }, // Client will generate this
    summary: {
      totalPrompts,
      totalResults,
      totalDomains: domainStats.length,
      totalUrls: urlStats.length,
    },
    pagination: {
      page,
      limit,
      total: totalPrompts,
      totalPages: limit > 0 ? Math.ceil(totalPrompts / limit) : 1,
    },
  };
}
