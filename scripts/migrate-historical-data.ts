#!/usr/bin/env tsx

/**
 * Migration script to populate BrandMetrics table with historical data
 * Run this after database schema migration with: npx tsx scripts/migrate-historical-data.ts
 */

import { metricsService } from '../lib/metrics-service';
import prisma from '../lib/prisma';
import { logInfo, logError, logWarn } from '../lib/logger';

async function processMultipleResults(resultIds: string[]): Promise<void> {
  logInfo(
    'Migration',
    `Starting batch processing of ${resultIds.length} results`,
  );

  let processed = 0;
  let failed = 0;

  // Process results in batches to avoid memory issues
  const BATCH_SIZE = 50;
  for (let i = 0; i < resultIds.length; i += BATCH_SIZE) {
    const batch = resultIds.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (resultId) => {
        try {
          await metricsService.processResult(resultId);
          processed++;
        } catch (error) {
          failed++;
          logWarn('Migration', 'Failed to process result in batch', {
            resultId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );

    // Log progress every 100 results
    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= resultIds.length) {
      console.log(
        `📊 Progress: ${processed + failed}/${resultIds.length} (${processed} processed, ${failed} failed)`,
      );
    }
  }

  logInfo('Migration', `Batch processing completed`, {
    total: resultIds.length,
    processed,
    failed,
  });
}

async function runMigration() {
  try {
    console.log('🚀 Starting historical data migration...\n');

    const startTime = Date.now();

    // Get all successful results
    const results = await prisma.result.findMany({
      where: {
        status: 'SUCCESS',
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (results.length === 0) {
      console.log('ℹ️ No successful results found for backfill');
      process.exit(0);
    }

    console.log(`📊 Found ${results.length} successful results to process\n`);

    const resultIds = results.map((r) => r.id);
    await processMultipleResults(resultIds);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Migration completed successfully in ${duration}s!`);
    console.log(
      '\n📊 BrandMetrics table has been populated with historical data.',
    );
    console.log('\nNext steps:');
    console.log(
      '1. Verify data in database: SELECT COUNT(*) FROM brand_metrics;',
    );
    console.log('2. Test the competitors API endpoint');
    console.log('3. Check frontend displays own brand in competitors table');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);

    logError('Migration', 'Historical data migration failed', error, {
      critical: true,
    });

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the migration
runMigration();
