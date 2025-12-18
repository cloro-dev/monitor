import prisma from '@/lib/prisma';
import { analyzeBrandMetrics } from '@/lib/ai-service';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { ProviderModel } from '@prisma/client';

interface MetricsData {
  brandId: string;
  organizationId: string;
  competitorId: string | null;
  date: Date;
  model: ProviderModel;
  totalMentions: number;
  averagePosition: number | null;
  averageSentiment: number | null;
  visibilityScore: number;
  totalResults: number;
}

export class MetricsService {
  /**
   * Process a single result and update BrandMetrics table (real-time webhook processing)
   */
  async processResult(resultId: string, preLoadedResult?: any): Promise<void> {
    try {
      // Get the result with all necessary relationships
      let result = preLoadedResult;

      if (!result) {
        result = await prisma.result.findUnique({
          where: { id: resultId },
          select: {
            id: true,
            status: true,
            response: true,
            createdAt: true,
            sentiment: true,
            position: true,
            competitors: true,
            model: true,
            prompt: {
              select: {
                brand: {
                  select: {
                    id: true,
                    name: true,
                    domain: true,
                    organizationBrands: {
                      select: {
                        organization: {
                          select: {
                            id: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }

      if (!result || result.status !== 'SUCCESS') {
        logWarn('MetricsProcessor', 'Skipping non-successful result', {
          resultId,
          status: result?.status,
        });
        return;
      }

      const brand = result.prompt.brand;

      // Parse response JSON to get the actual data
      let responseData = null;
      try {
        if (
          result.response &&
          typeof result.response === 'object' &&
          !Array.isArray(result.response) &&
          'result' in result.response
        ) {
          // Webhook stores response as { result: responseData }
          responseData = (result.response as any).result;
        } else if (result.response && typeof result.response === 'string') {
          // Fallback for direct string responses
          responseData = JSON.parse(result.response);
        } else if (result.response && typeof result.response === 'object') {
          // Fallback for direct object responses
          responseData = result.response;
        }
      } catch (error) {
        logWarn('MetricsProcessor', 'Failed to parse response JSON', {
          resultId,
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      if (!responseData?.text) {
        logWarn('MetricsProcessor', 'No response text to process', {
          resultId,
        });
        return;
      }

      // Get all organizations that own this brand
      const organizations = brand.organizationBrands.map(
        (ob: any) => ob.organization,
      );
      if (organizations.length === 0) {
        logWarn('MetricsProcessor', 'No organization found for brand', {
          resultId,
          brandId: brand.id,
        });
        return;
      }

      // Get date from result creation (group by day)
      const resultDate = new Date(result.createdAt);
      resultDate.setHours(0, 0, 0, 0); // Set to start of day

      // Analyze metrics from the response text
      let sentiment: number | null = null;
      let position: number | null = null;
      let competitors: any = null;

      if (
        result.sentiment !== null ||
        result.position !== null ||
        (result.competitors &&
          Array.isArray(result.competitors) &&
          result.competitors.length > 0)
      ) {
        sentiment = result.sentiment;
        position = result.position;
        competitors = result.competitors;
      } else {
        try {
          const metrics = await analyzeBrandMetrics(
            responseData.text,
            brand.name || brand.domain,
          );
          sentiment = metrics.sentiment;
          position = metrics.position;
          competitors = metrics.competitors;
        } catch (error) {
          logWarn('MetricsProcessor', 'Metrics analysis failed', {
            resultId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue to save basic metrics even if analysis fails
        }
      }

      // Find competitor brands once to avoid duplicate lookups
      const competitorBrands = new Map();
      if (competitors && competitors.length > 0) {
        for (const competitorObj of competitors) {
          try {
            const competitorBrand = await prisma.brand.findFirst({
              where: {
                name: {
                  equals: competitorObj.name,
                  mode: 'insensitive',
                },
              },
            });

            if (competitorBrand && competitorBrand.id !== brand.id) {
              competitorBrands.set(competitorObj.name, competitorBrand);
            }
          } catch (error) {
            logWarn('MetricsProcessor', 'Failed to find competitor brand', {
              resultId,
              competitorName: competitorObj.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // Process metrics for ALL organizations that own this brand
      for (const organization of organizations) {
        // Process own brand metrics (competitorId: null)
        await this.upsertMetrics({
          brandId: brand.id,
          organizationId: organization.id,
          competitorId: null,
          date: resultDate,
          model: result.model as any,
          totalMentions: position !== null && position > 0 ? 1 : 0,
          averagePosition: position,
          averageSentiment: sentiment,
          visibilityScore: this.calculateVisibilityScore(position),
          totalResults: 1,
        });

        // Process competitor metrics if they exist
        if (competitors && competitors.length > 0) {
          for (const competitorObj of competitors) {
            try {
              const competitorBrand = competitorBrands.get(competitorObj.name);

              if (!competitorBrand) {
                // Skip if we can't identify the competitor brand
                continue;
              }

              // Create competitor relationship
              await prisma.competitor.upsert({
                where: {
                  brandId_competitorId: {
                    brandId: brand.id,
                    competitorId: competitorBrand.id,
                  },
                },
                update: {
                  mentions: { increment: 1 },
                },
                create: {
                  brandId: brand.id,
                  competitorId: competitorBrand.id,
                },
              });

              // Create competitor metrics (use the competitor's position if available)
              const competitorPosition = competitorObj.position || null;
              await this.upsertMetrics({
                brandId: brand.id,
                organizationId: organization.id,
                competitorId: competitorBrand.id,
                date: resultDate,
                model: result.model as any,
                totalMentions: 1,
                averagePosition: competitorPosition,
                averageSentiment: competitorObj.sentiment || null,
                visibilityScore:
                  this.calculateVisibilityScore(competitorPosition),
                totalResults: 1,
              });
            } catch (error) {
              logWarn('MetricsProcessor', 'Failed to process competitor', {
                resultId,
                organizationId: organization.id,
                competitorName: competitorObj.name,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      }

      logInfo('MetricsProcessor', 'Result processed successfully', {
        resultId,
        organizationIds: organizations.map((org: any) => org.id),
        brandId: brand.id,
        model: result.model,
      });
    } catch (error) {
      logError('MetricsProcessor', 'Failed to process result', error, {
        resultId,
        critical: false, // Don't fail the webhook
      });
    }
  }

  /**
   * Upsert metrics data (aggregate multiple entries per day)
   */
  private async upsertMetrics(data: MetricsData): Promise<void> {
    // Handle null competitorId separately since it's part of the unique constraint
    const existing = data.competitorId
      ? await prisma.brandMetrics.findUnique({
          where: {
            brandId_organizationId_competitorId_date_model: {
              brandId: data.brandId,
              organizationId: data.organizationId,
              competitorId: data.competitorId,
              date: data.date,
              model: data.model,
            },
          },
        })
      : await prisma.brandMetrics.findFirst({
          where: {
            brandId: data.brandId,
            organizationId: data.organizationId,
            competitorId: null,
            date: data.date,
            model: data.model,
          },
        });

    if (existing) {
      // Update existing entry with aggregated values
      const newTotalMentions = existing.totalMentions + data.totalMentions;
      const newTotalResults = existing.totalResults + data.totalResults;

      // Calculate new averages
      const newAveragePosition = this.calculateWeightedAverage(
        existing.averagePosition,
        existing.totalMentions,
        data.averagePosition,
        data.totalMentions,
      );

      const newAverageSentiment = this.calculateWeightedAverage(
        existing.averageSentiment,
        existing.totalMentions,
        data.averageSentiment,
        data.totalMentions,
      );

      const newVisibilityScore =
        newTotalResults > 0 ? (newTotalMentions / newTotalResults) * 100 : 0;

      await prisma.brandMetrics.update({
        where: {
          id: existing.id,
        },
        data: {
          totalMentions: newTotalMentions,
          averagePosition: newAveragePosition,
          averageSentiment: newAverageSentiment,
          visibilityScore: newVisibilityScore,
          totalResults: newTotalResults,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new entry
      await prisma.brandMetrics.create({
        data: {
          brandId: data.brandId,
          organizationId: data.organizationId,
          competitorId: data.competitorId,
          date: data.date,
          model: data.model,
          totalMentions: data.totalMentions,
          averagePosition: data.averagePosition,
          averageSentiment: data.averageSentiment,
          visibilityScore: data.visibilityScore,
          totalResults: data.totalResults,
        },
      });
    }
  }

  /**
   * Calculate weighted average for aggregation
   */
  private calculateWeightedAverage(
    existingAvg: number | null,
    existingCount: number,
    newAvg: number | null,
    newCount: number,
  ): number | null {
    if (existingAvg === null && newAvg === null) return null;
    if (existingAvg === null) return newAvg;
    if (newAvg === null) return existingAvg;

    return (
      (existingAvg * existingCount + newAvg * newCount) /
      (existingCount + newCount)
    );
  }

  /**
   * Calculate visibility score based on whether brand appeared in results
   * Returns 100 if brand was mentioned (position > 0), 0 otherwise
   */
  private calculateVisibilityScore(position: number | null): number {
    if (position === null || position <= 0) return 0;
    return 100;
  }
}

export const metricsService = new MetricsService();
