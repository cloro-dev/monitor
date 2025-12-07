#!/usr/bin/env tsx

import prisma from '../lib/prisma';
import { sourceMetricsService } from '../lib/source-metrics-service';
import { logInfo, logError, logWarn } from '../lib/logger';
import { subDays } from 'date-fns';

/**
 * Migration script to populate SourceMetrics table with historical data
 * This processes existing results and calculates daily source utilization metrics
 */

interface MigrationOptions {
  daysBack?: number; // How many days of historical data to process (default: 90)
  batchSize?: number; // Number of results to process in each batch (default: 50)
  dryRun?: boolean; // If true, only log what would be processed without actually processing
}

const DEFAULT_OPTIONS: Required<MigrationOptions> = {
  daysBack: 90,
  batchSize: 50,
  dryRun: false,
};

async function processHistoricalData(options: Required<MigrationOptions>) {
  const { daysBack, batchSize, dryRun } = options;
  const startDate = subDays(new Date(), daysBack);

  logInfo('SourceMetricsMigration', 'Starting historical data migration', {
    daysBack,
    startDate: startDate.toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    batchSize,
    dryRun,
  });

  try {
    // Get all successful results within the date range
    const totalResults = await prisma.result.count({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: startDate },
      },
    });

    if (totalResults === 0) {
      logInfo(
        'SourceMetricsMigration',
        'No results found in the specified date range',
      );
      return;
    }

    logInfo(
      'SourceMetricsMigration',
      `Found ${totalResults} results to process`,
    );

    let processedCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    // Process results in batches to avoid memory issues
    for (let offset = 0; offset < totalResults; offset += batchSize) {
      const results = await prisma.result.findMany({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startDate },
        },
        include: {
          sources: {
            select: {
              url: true,
              hostname: true,
              type: true,
            },
          },
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
        orderBy: { createdAt: 'asc' },
        take: batchSize,
        skip: offset,
      });

      logInfo(
        'SourceMetricsMigration',
        `Processing batch ${Math.floor(offset / batchSize) + 1}`,
        {
          batchResults: results.length,
          totalProcessed: processedCount,
          progress: `${Math.round((processedCount / totalResults) * 100)}%`,
        },
      );

      // Process each result
      for (const result of results) {
        try {
          const brand = result.prompt.brand;
          const organizations = brand.organizationBrands.map(
            (ob) => ob.organization,
          );

          if (organizations.length === 0) {
            logWarn(
              'SourceMetricsMigration',
              'Skipping result - no organization found for brand',
              {
                resultId: result.id,
                brandId: brand.id,
              },
            );
            skipCount++;
            continue;
          }

          if (dryRun) {
            logInfo(
              'SourceMetricsMigration',
              'DRY RUN - Would process result',
              {
                resultId: result.id,
                brandId: brand.id,
                organizationIds: organizations.map((org) => org.id),
                sourcesCount: result.sources.length,
                createdAt: result.createdAt.toISOString(),
              },
            );
            processedCount++;
            continue;
          }

          // Process sources for this result using the source metrics service
          await sourceMetricsService.processResultSources(result.id, result);
          processedCount++;

          if (processedCount % 10 === 0) {
            logInfo('SourceMetricsMigration', 'Progress update', {
              processedCount,
              totalResults,
              progress: `${Math.round((processedCount / totalResults) * 100)}%`,
            });
          }
        } catch (error) {
          logError(
            'SourceMetricsMigration',
            'Failed to process result',
            error,
            {
              resultId: result.id,
              brandId: result.prompt.brandId,
            },
          );
          errorCount++;
        }
      }
    }

    // After processing all results, recalculate daily utilization for each date
    if (!dryRun) {
      logInfo(
        'SourceMetricsMigration',
        'Recalculating daily utilization percentages',
      );

      const uniqueDates = await prisma.result.findMany({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          prompt: {
            select: {
              brandId: true,
            },
          },
        },
      });

      const recalculatedDates = new Set<string>();
      let recalculationErrors = 0;

      for (const { createdAt, prompt } of uniqueDates) {
        const dateKey = createdAt.toISOString().split('T')[0];
        const brandId = prompt.brandId;

        if (recalculatedDates.has(`${dateKey}-${brandId}`)) {
          continue;
        }

        try {
          // Get organization for this brand
          const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: {
              organizationBrands: {
                include: { organization: true },
              },
            },
          });

          if (!brand || brand.organizationBrands.length === 0) {
            continue;
          }

          const organization = brand.organizationBrands[0].organization;
          const date = new Date(createdAt);
          date.setHours(0, 0, 0, 0);

          await sourceMetricsService.recalculateDailyUtilization(
            brandId,
            organization.id,
            date,
          );
          recalculatedDates.add(`${dateKey}-${brandId}`);
        } catch (error) {
          logError(
            'SourceMetricsMigration',
            'Failed to recalculate daily utilization',
            error,
            {
              date: dateKey,
              brandId,
            },
          );
          recalculationErrors++;
        }
      }

      logInfo(
        'SourceMetricsMigration',
        'Daily utilization recalculation completed',
        {
          recalculatedDates: recalculatedDates.size,
          recalculationErrors,
        },
      );
    }

    logInfo('SourceMetricsMigration', 'Migration completed successfully', {
      totalResults,
      processedCount,
      errorCount,
      skipCount,
      dryRun,
    });
  } catch (error) {
    logError('SourceMetricsMigration', 'Migration failed', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--days' && args[i + 1]) {
      options.daysBack = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      console.log(`
Source Metrics Historical Data Migration

Usage: tsx scripts/migrate-source-metrics.ts [options]

Options:
  --days <number>        Number of days of historical data to process (default: 90)
  --batch-size <number>  Number of results to process in each batch (default: 50)
  --dry-run             Simulate migration without making changes
  --help                Show this help message

Examples:
  tsx scripts/migrate-source-metrics.ts                    # Process last 90 days
  tsx scripts/migrate-source-metrics.ts --days 30         # Process last 30 days
  tsx scripts/migrate-source-metrics.ts --dry-run         # Simulate migration
  tsx scripts/migrate-source-metrics.ts --batch-size 100  # Use larger batches
      `);
      process.exit(0);
    }
  }

  const finalOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    await processHistoricalData(finalOptions);
    logInfo('SourceMetricsMigration', 'Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logError('SourceMetricsMigration', 'Migration failed', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  main();
}

export { processHistoricalData };
export type { MigrationOptions };
