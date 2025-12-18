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

  // Handle the new Google endpoint format: { result: { aioverview: { sources: [...] } } }
  if (
    responseData?.result?.aioverview?.sources &&
    Array.isArray(responseData.result.aioverview.sources)
  ) {
    rawSources.push(...responseData.result.aioverview.sources);
  }
  // Handle direct aioverview format (fallback)
  else if (
    responseData?.aioverview?.sources &&
    Array.isArray(responseData.aioverview.sources)
  ) {
    rawSources.push(...responseData.aioverview.sources);
  }
  // Handle organic search results from Google endpoint: { result: { organicResults: [...] } }
  else if (
    responseData?.result?.organicResults &&
    Array.isArray(responseData.result.organicResults)
  ) {
    rawSources.push(
      ...responseData.result.organicResults.map((result: any) => ({
        url: result.link,
        title: result.title,
      })),
    );
  }
  // Handle direct organic results (fallback)
  else if (
    responseData?.organicResults &&
    Array.isArray(responseData.organicResults)
  ) {
    rawSources.push(
      ...responseData.organicResults.map((result: any) => ({
        url: result.link,
        title: result.title,
      })),
    );
  }
  // specific checks for common AI response structures (Perplexity, ChatGPT, etc)
  else if (Array.isArray(responseData.sources)) {
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
  organizationId: string,
  params: SourcesQueryParams,
): Promise<SourcesAnalyticsResponse> {
  const { brandId, timeRange, tab, page, limit } = params;
  const dateRange = getDateRange(timeRange);

  // 1. Get Summary Counts
  // Total prompts checked in this period (Total Result Count)
  const totalResults = await prisma.result.count({
    where: {
      prompt: {
        brandId,
        brand: {
          organizationBrands: {
            some: {
              organizationId,
            },
          },
        },
      },
      status: 'SUCCESS',
      createdAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
  });

  // Total unique prompts involved (Approximation: Count unique prompt IDs in Results)
  // This is faster than joining tables
  const uniquePromptsResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT r."promptId") as count
    FROM "result" r
    INNER JOIN "prompt" p ON r."promptId" = p.id
    WHERE p."brandId" = ${brandId}
    AND r.status = 'SUCCESS'
    AND r."createdAt" >= ${dateRange.from}
    AND r."createdAt" <= ${dateRange.to}
  `;
  const totalPrompts = Number(uniquePromptsResult[0]?.count || 0);

  // 2. Aggregate Source Stats from SourceMetrics
  // This replaces the heavy "Prompt -> Result -> Source" scan
  const sourceMetrics = await prisma.sourceMetrics.findMany({
    where: {
      brandId,
      organizationId,
      date: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    },
    select: {
      totalMentions: true,
      uniquePrompts: true, // Daily unique prompts
      source: {
        select: {
          url: true,
          hostname: true,
          type: true,
        },
      },
    },
  });

  // Aggregation Map
  const statsMap = new Map<string, any>();

  for (const metric of sourceMetrics) {
    const { source, totalMentions, uniquePrompts } = metric;

    // Normalize key based on tab (Domain vs URL)
    let key: string;
    let domain: string;
    let url: string;
    let hostname: string;

    if (tab === 'domain') {
      hostname = source.hostname.replace(/^www\./, '');
      domain = getRootDomain(hostname);
      key = domain;
      url = source.url; // Placeholder
    } else {
      url = normalizeUrl(source.url);
      hostname = source.hostname;
      key = url;
      domain = getRootDomain(hostname);
    }

    if (!statsMap.has(key)) {
      statsMap.set(key, {
        key,
        domain: tab === 'domain' ? key : domain,
        url: tab === 'url' ? key : url,
        hostname: hostname,
        type: source.type,
        mentions: 0,
        uniquePromptsSum: 0, // Sum of daily unique prompts
      });
    }

    const stat = statsMap.get(key);
    stat.mentions += totalMentions;
    stat.uniquePromptsSum += uniquePrompts;
    if (source.type && !stat.type) stat.type = source.type;
  }

  // Convert to array and calculate final utilization
  const allStats = Array.from(statsMap.values()).map((stat) => {
    // Utilization Proxy: (Sum of Daily Unique Prompts / Total Result-Days) * 100
    // "totalResults" is effectively "Total Result-Days" (Total successful checks)
    // "uniquePromptsSum" is "Total Source-Appearances-In-Checks"
    const utilization =
      totalResults > 0 ? (stat.uniquePromptsSum / totalResults) * 100 : 0;

    return {
      domain: stat.domain,
      url: stat.url,
      hostname: stat.hostname,
      mentions: stat.mentions,
      utilization,
      type: stat.type,
      uniquePrompts: stat.uniquePromptsSum, // Note: This is "Total Days appeared", slightly different from "Unique Prompts IDs"
    };
  });

  // Sort by utilization descending
  allStats.sort((a, b) => b.utilization - a.utilization);

  // Pagination
  const totalItems = allStats.length;
  const start = (page - 1) * limit;
  const end = limit > 0 ? start + limit : totalItems;
  const paginatedStats = allStats.slice(start, end);

  // Return formatted response
  // We populate both domainStats and urlStats with the SAME paginated data
  // depending on the 'tab' param, but the interface expects both arrays.
  // The UI will likely only use the one corresponding to the active tab.
  return {
    domainStats: tab === 'domain' ? paginatedStats : [],
    urlStats: tab === 'url' ? paginatedStats : [],
    chartData: { data: [], config: {} },
    summary: {
      totalPrompts, // Count of unique Prompt IDs
      totalResults, // Count of successful checks
      totalDomains: tab === 'domain' ? totalItems : 0, // Approx
      totalUrls: tab === 'url' ? totalItems : 0, // Approx
    },
    pagination: {
      page,
      limit,
      total: totalItems,
      totalPages: limit > 0 ? Math.ceil(totalItems / limit) : 1,
    },
  };
}
