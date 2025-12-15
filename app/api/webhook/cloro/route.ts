import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { analyzeBrandMetrics, getCompetitorDomain } from '@/lib/ai-service';
import { processAndSaveSources } from '@/lib/source-service';
import { waitUntil } from '@vercel/functions';
import { fetchDomainInfo } from '@/lib/domain-fetcher';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { metricsService } from '@/lib/metrics-service';
import { sourceMetricsService } from '@/lib/source-metrics-service';
import { trackPromptAsync } from '@/lib/cloro';

const MAX_RETRIES = 3;

const safeStartsWith = (value: any, prefix: string) =>
  typeof value === 'string' && value.startsWith(prefix);

/**
 * Fetches HTML content for sources that have HTML URLs
 */
async function processHtmlContent(
  responseData: any,
  resultId?: string,
): Promise<any> {
  if (!responseData || typeof responseData !== 'object') return responseData;

  const processedData = { ...responseData };
  let htmlFetchCount = 0;

  // Process HTML arrays (AI Overview)
  if (Array.isArray(processedData.html)) {
    const firstUrl = processedData.html[0];
    if (safeStartsWith(firstUrl, 'http')) {
      try {
        const res = await fetch(firstUrl, {
          headers: { 'User-Agent': 'Cloro-HtmlFetcher/1.0' },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) processedData.html = await res.text();
      } catch {} // Keep array on failure
    }
  }

  // Helper function to process sources array
  const processSourcesArray = async (sources: any[]) => {
    if (!Array.isArray(sources)) return sources;

    const processedSources = await Promise.all(
      sources.map(async (source) => {
        if (!source || typeof source !== 'object') return source;

        const processedSource = { ...source };

        // Check if source has an HTML URL that we need to fetch
        if (source.html && safeStartsWith(source.html, 'http')) {
          try {
            logInfo('Webhook', 'Fetching HTML for source', {
              url: source.url,
              htmlUrl: source.html,
            });

            const response = await fetch(source.html, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Cloro-HtmlFetcher/1.0)',
              },
              signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            if (response.ok) {
              const html = await response.text();
              // Store full HTML content
              processedSource.html = html;
              htmlFetchCount++;

              logInfo('Webhook', 'Successfully fetched HTML', {
                url: source.url,
                size: processedSource.html.length,
              });
            } else {
              logWarn('Webhook', 'Failed to fetch HTML', {
                url: source.url,
                htmlUrl: source.html,
                status: response.status,
              });
              // Remove the HTML field if we couldn't fetch it
              delete processedSource.html;
            }
          } catch (error) {
            logError('Webhook', 'Error fetching HTML content', error, {
              url: source.url,
              htmlUrl: source.html,
            });
            // Remove the HTML field if there was an error
            delete processedSource.html;
          }
        }

        return processedSource;
      }),
    );

    return processedSources;
  };

  // Process sources in different response formats
  if (processedData.result?.aioverview?.sources) {
    processedData.result.aioverview.sources = await processSourcesArray(
      processedData.result.aioverview.sources,
    );
  } else if (processedData.aioverview?.sources) {
    processedData.aioverview.sources = await processSourcesArray(
      processedData.aioverview.sources,
    );
  } else if (processedData.sources) {
    processedData.sources = await processSourcesArray(processedData.sources);
  } else if (processedData.citations) {
    processedData.citations = await processSourcesArray(
      processedData.citations,
    );
  } else if (processedData.references) {
    processedData.references = await processSourcesArray(
      processedData.references,
    );
  }

  // Also handle top-level HTML field
  if (processedData.html && safeStartsWith(processedData.html, 'http')) {
    try {
      logInfo('Webhook', 'Fetching top-level HTML content', {
        htmlUrl: processedData.html,
      });

      const response = await fetch(processedData.html, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Cloro-HtmlFetcher/1.0)',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();
        // Store full HTML content
        processedData.html = html;
        htmlFetchCount++;

        logInfo('Webhook', 'Successfully fetched top-level HTML', {
          size: processedData.html.length,
        });
      } else {
        logWarn('Webhook', 'Failed to fetch top-level HTML', {
          htmlUrl: processedData.html,
          status: response.status,
        });
        delete processedData.html;
      }
    } catch (error) {
      logError('Webhook', 'Error fetching top-level HTML content', error, {
        htmlUrl: processedData.html,
      });
      delete processedData.html;
    }
  }

  if (htmlFetchCount > 0) {
    logInfo('Webhook', 'Processed HTML content', {
      htmlFetchCount,
    });
  }

  return processedData;
}

/**
 * Helper to process competitors in background
 */
async function processCompetitorBrands(
  competitors: any[],
  prompt: any,
  resultId: string,
) {
  if (!competitors || competitors.length === 0) return;

  // Process all competitors in parallel to avoid timeouts
  await Promise.all(
    competitors.map(async (competitorObj) => {
      const competitorNameRaw = competitorObj.name;
      try {
        let competitorDomain: string | null = null;

        // 1. Check if we already have a brand with this name
        const existingBrandByName = await prisma.brand.findFirst({
          where: {
            name: {
              equals: competitorNameRaw,
              mode: 'insensitive',
            },
          },
          select: { domain: true },
        });

        if (existingBrandByName) {
          competitorDomain = existingBrandByName.domain;
        } else {
          // 2. Fallback: Resolve domain using LLM
          competitorDomain = await getCompetitorDomain(
            competitorNameRaw,
            prompt.text,
          );
        }

        if (competitorDomain) {
          // 3. Find or Create the Competitor Brand
          // Check if brand exists first to avoid race conditions in parallel creation
          let competitorBrand = await prisma.brand.findUnique({
            where: { domain: competitorDomain },
          });

          if (!competitorBrand) {
            // Fetch domain info to get description and official name
            // We catch errors to ensure one failed fetch doesn't break the whole webhook
            let domainInfo;
            try {
              domainInfo = await fetchDomainInfo(competitorDomain);
            } catch (e) {
              logWarn(
                'CompetitorCreation',
                'Failed to fetch domain info for competitor during creation',
                {
                  competitorDomain,
                  competitorName: competitorNameRaw,
                  resultId,
                  critical: false,
                },
              );
              domainInfo = {
                domain: competitorDomain,
                name: competitorNameRaw,
                description: null,
              };
            }

            // Try to create. If it fails (race condition), fetch it again.
            try {
              competitorBrand = await prisma.brand.create({
                data: {
                  domain: domainInfo.domain,
                  name: domainInfo.name || competitorNameRaw,
                  description: domainInfo.description,
                },
              });
            } catch (createError) {
              // Likely a unique constraint violation from another parallel execution
              competitorBrand = await prisma.brand.findUnique({
                where: { domain: competitorDomain },
              });
            }
          }

          if (competitorBrand) {
            // Prevent adding the brand itself as a competitor
            if (competitorBrand.id === prompt.brandId) {
              return;
            }

            // 2. Link it as a competitor to the current brand
            await prisma.competitor.upsert({
              where: {
                brandId_competitorId: {
                  brandId: prompt.brandId,
                  competitorId: competitorBrand.id,
                },
              },
              update: {
                mentions: { increment: 1 },
              },
              create: {
                brandId: prompt.brandId,
                competitorId: competitorBrand.id,
              },
            });
          }
        }
      } catch (err) {
        // Competitor processing failure - log as warning but continue
        logWarn(
          'Webhook',
          'Competitor processing failed, continuing with webhook',
          {
            resultId,
            competitorName: competitorNameRaw,
            critical: false,
            error: err instanceof Error ? err.message : String(err),
          },
        );
      }
    }),
  );
}

/**
 * Extract retry count from result response metadata
 */
function getRetryCount(resultResponse: any): number {
  if (!resultResponse || typeof resultResponse !== 'object') return 0;
  return resultResponse._retryMetadata?.attemptCount || 0;
}

/**
 * Create retry metadata object
 */
function createRetryMetadata(
  currentAttempt: number,
  failureReason: string,
): any {
  return {
    _retryMetadata: {
      attemptCount: currentAttempt + 1,
      lastFailureAt: new Date().toISOString(),
      lastFailureReason: failureReason,
    },
  };
}

export const maxDuration = 60; // Allow up to 60s for the webhook handler to run

async function processWebhook(body: any) {
  try {
    const { idempotencyKey, status } = body.task;
    const resultId = idempotencyKey; // The idempotencyKey is our Result ID
    const responseData = body.response;

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        prompt: {
          include: {
            brand: {
              include: {
                organizationBrands: {
                  include: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!result) {
      logError('Webhook', 'Webhook result not found', null, {
        resultId,
      });
      return;
    }

    if (status !== 'COMPLETED') {
      // Handle FAILED or other statuses from Cloro
      const failureReason = `Task failed with status: ${status}`;

      // Update result status
      await prisma.result.update({
        where: { id: resultId },
        data: {
          status: 'FAILED',
          response: { error: failureReason } as any,
        },
      });

      logError('Webhook', 'Webhook task failed', null, {
        resultId,
        status,
        reason: failureReason,
      });

      // Handle retry logic inline
      waitUntil(
        (async () => {
          try {
            // Get the current result with prompt
            const retryResult = await prisma.result.findUnique({
              where: { id: resultId },
              include: {
                prompt: true,
              },
            });

            if (!retryResult) {
              logError('Webhook', 'Result not found for retry', null, {
                resultId,
              });
              return;
            }

            const retryCount = getRetryCount(retryResult.response);

            if (retryCount >= MAX_RETRIES) {
              logWarn('Webhook', 'Max retries exceeded, giving up', {
                resultId,
                retryCount,
                maxRetries: MAX_RETRIES,
              });
              return;
            }

            logInfo('Webhook', 'Re-queuing failed request', {
              resultId,
              attempt: retryCount + 1,
              maxRetries: MAX_RETRIES,
            });

            // Update result with retry metadata and set back to PENDING
            await prisma.result.update({
              where: { id: resultId },
              data: {
                status: 'PENDING',
                response: createRetryMetadata(retryCount, failureReason),
              },
            });

            // Immediately re-queue with Cloro using same idempotency key
            await trackPromptAsync(
              retryResult.prompt.text,
              retryResult.prompt.country,
              retryResult.model,
              resultId, // Use result ID as idempotency key
            );

            logInfo('Webhook', 'Request re-queued successfully', {
              resultId,
              attempt: retryCount + 1,
            });
          } catch (retryError) {
            logError('Webhook', 'Failed to re-queue request', retryError, {
              resultId,
              failureReason,
              critical: false,
            });

            // Mark as permanently failed if re-queue fails
            await prisma.result.update({
              where: { id: resultId },
              data: {
                status: 'FAILED',
                response: createRetryMetadata(
                  0,
                  `Re-queue failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`,
                ),
              },
            });
          }
        })(),
      );

      return;
    }

    const prompt = result.prompt;
    const brandName = prompt.brand.name || prompt.brand.domain;
    // Get the first organization ID for logging purposes (brands can belong to multiple orgs)
    const orgId =
      prompt.brand.organizationBrands.length > 0
        ? prompt.brand.organizationBrands[0].organizationId
        : 'N/A';

    let sentiment: number | null = null;
    let position: number | null = null;
    let competitors: any = null;

    // Extract text from different response formats based on the source
    let textForAnalysis = null;

    // Handle the new Google endpoint format: { result: { aioverview: { text/markdown: ... } } }
    // Prioritize markdown over text for cleaner content
    if (responseData?.result?.aioverview?.markdown) {
      textForAnalysis = responseData.result.aioverview.markdown;
    } else if (responseData?.result?.aioverview?.text) {
      textForAnalysis = responseData.result.aioverview.text;
    }
    // For direct aioverview format (fallback)
    else if (responseData?.aioverview?.markdown) {
      textForAnalysis = responseData.aioverview.markdown;
    } else if (responseData?.aioverview?.text) {
      textForAnalysis = responseData.aioverview.text;
    }
    // For the old async task format, check for markdown first, then text directly
    else if (responseData?.markdown) {
      textForAnalysis = responseData.markdown;
    } else if (responseData?.text) {
      textForAnalysis = responseData.text;
    }

    if (textForAnalysis) {
      try {
        const metrics = await analyzeBrandMetrics(textForAnalysis, brandName);
        sentiment = metrics.sentiment;
        position = metrics.position;
        competitors = metrics.competitors;
      } catch (metricsError) {
        logWarn('Webhook', 'Metrics analysis failed, continuing with webhook', {
          resultId,
          critical: false, // Continue processing even if metrics fail
          error:
            metricsError instanceof Error
              ? metricsError.message
              : String(metricsError),
        });
        // Continue to save the raw response even if analysis fails
      }
    }

    // Update the Result with success data IMMEDIATELY
    // Use original responseData initially (HTML will be fetched in background)
    await prisma.result.update({
      where: { id: resultId },
      data: {
        status: 'SUCCESS',
        response: { result: responseData } as any,
        sentiment,
        position,
        competitors: competitors as any,
      },
    });

    // Prepare complete result for background processing
    const completeResult = {
      ...result,
      status: 'SUCCESS',
      response: { result: responseData },
      sentiment,
      position,
      competitors,
    };

    // Offload heavy tasks to background
    waitUntil(
      Promise.all([
        // 1. Fetch HTML Content and Update Result
        (async () => {
          try {
            const enrichedResponse = await processHtmlContent(
              responseData,
              resultId,
            );
            // Only update if changes were made (simple check could be done but safe to just update)
            if (enrichedResponse !== responseData) {
              await prisma.result.update({
                where: { id: resultId },
                data: {
                  response: { result: enrichedResponse } as any,
                },
              });
            }
          } catch (e) {
            logError('Webhook', 'Background HTML processing failed', e, {
              resultId,
            });
          }
        })(),

        // 2. Process Competitors AND THEN Metrics
        // MetricsService requires competitors to be created in DB first
        (async () => {
          try {
            // Create competitor brands/relations
            if (competitors && competitors.length > 0) {
              await processCompetitorBrands(competitors, prompt, resultId);
            }

            // Run metrics service (depends on competitors)
            await metricsService
              .processResult(resultId, completeResult)
              .catch((err) => {
                logError('Webhook', 'Metrics processing failed', err, {
                  resultId,
                  organizationId: orgId,
                  critical: false,
                });
              });

            // Run source metrics service
            await sourceMetricsService
              .processResultSources(resultId, completeResult)
              .then(() => {
                logInfo(
                  'Webhook',
                  'Source metrics processing completed successfully',
                  {
                    resultId,
                    organizationId: orgId,
                  },
                );
              })
              .catch((err) => {
                logError('Webhook', 'Source metrics processing failed', err, {
                  resultId,
                  organizationId: orgId,
                  critical: false,
                });
              });
          } catch (e) {
            logError(
              'Webhook',
              'Background competitor/metrics processing failed',
              e,
              { resultId },
            );
          }
        })(),

        // 3. Extract and save sources (Independent)
        processAndSaveSources(resultId, responseData).catch((err) => {
          logError('Webhook', 'Source processing failed', err, {
            resultId,
            organizationId: orgId,
            critical: true,
          });
        }),
      ]),
    );
  } catch (error) {
    logError('Webhook', 'Webhook processing failed', error, {
      critical: true,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resultId = body.task?.idempotencyKey;

    logInfo('Webhook', 'Webhook received', {
      resultId,
    });

    // Validate the webhook payload structure
    if (
      !body.task ||
      !body.task.id ||
      !body.task.idempotencyKey ||
      !body.response
    ) {
      logError('Webhook', 'Webhook invalid payload', null, {
        resultId,
        error: 'Missing required fields',
      });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Offload processing to background
    waitUntil(
      processWebhook(body).catch((error) => {
        logError('Webhook', 'Webhook background processing failed', error, {
          resultId,
          critical: true,
        });
      }),
    );

    return NextResponse.json({
      message: 'Webhook received, processing in background',
    });
  } catch (error) {
    logError('Webhook', 'Webhook endpoint failed', error, {
      critical: true,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
