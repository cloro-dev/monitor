/**
 * Consolidated logging utility following Vercel's metadata approach
 * Minimal console output with structured metadata for debugging
 */

// Environment-based log level control
const LOG_LEVEL = process.env.LOG_LEVEL || 'WARN';

/**
 * Check if a log level should be printed based on current LOG_LEVEL
 */
export const shouldLog = (
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG',
): boolean => {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const checkLevelIndex = levels.indexOf(level);

  return checkLevelIndex <= currentLevelIndex;
};

export interface LogMetadata {
  resultId?: string;
  organizationId?: string;
  operation?: string;
  url?: string;
  domain?: string;
  sourceId?: string;
  brandId?: string;
  [key: string]: any;
}

/**
 * Primary logging function with structured metadata
 */
function logWithMetadata(
  level: 'log' | 'error',
  logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG',
  section: string,
  message: string,
  metadata: LogMetadata = {},
) {
  const logData: any = {
    level: logLevel,
    section,
    message,
    ...metadata,
  };

  // Include log level, section, and primary identifier in the message for easy filtering
  const prefix = metadata.resultId || metadata.organizationId || '';
  const formattedMessage = prefix
    ? `[${logLevel}] [${section}] [${prefix}] ${message}`
    : `[${logLevel}] [${section}] ${message}`;

  if (level === 'error') {
    console.error(formattedMessage, logData);
  } else {
    console.log(formattedMessage, logData);
  }
}

/**
 * Core logging functions with section parameter
 */
export const logInfo = (
  section: string,
  message: string,
  metadata?: LogMetadata,
) => {
  if (shouldLog('INFO')) {
    logWithMetadata('log', 'INFO', section, message, metadata);
  }
};

export const logWarn = (
  section: string,
  message: string,
  metadata?: LogMetadata,
) => {
  if (shouldLog('WARN')) {
    logWithMetadata('log', 'WARN', section, message, metadata);
  }
};

export const logError = (
  section: string,
  message: string,
  error?: any,
  metadata?: LogMetadata,
) => {
  if (shouldLog('ERROR')) {
    logWithMetadata('error', 'ERROR', section, message, {
      ...metadata,
      error: error?.message || String(error),
    });
  }
};

export const logDebug = (
  section: string,
  message: string,
  metadata?: LogMetadata,
) => {
  if (shouldLog('DEBUG')) {
    logWithMetadata('log', 'DEBUG', section, message, metadata);
  }
};

/**
 * Specialized logging for source processing - concise with metadata
 */
export class SourceProcessingLogger {
  constructor(private resultId: string) {}

  logStart(sourcesCount: number) {
    logInfo('SourceProcess', 'Processing sources', {
      resultId: this.resultId,
      sourcesCount,
    });
  }

  logSourceFailed(url: string, error: any, type: 'create' | 'link') {
    logError('SourceProcess', `Source ${type} failed`, error, {
      resultId: this.resultId,
      url,
      operation: `Source${type.charAt(0).toUpperCase() + type.slice(1)}`,
      critical: true,
    });
  }
}

/**
 * Specialized logging for domain fetching - concise with metadata
 */
export class DomainInfoLogger {
  private metrics = {
    total: 0,
    cacheHits: 0,
    scrapingSuccess: 0,
    scrapingFailures: 0,
    aiEnrichmentSuccess: 0,
    aiEnrichmentFailures: 0,
    aiGenerationSuccess: 0,
  };

  constructor(public context: { resultId?: string; organizationId?: string }) {}

  trackCacheHit() {
    this.metrics.total++;
    this.metrics.cacheHits++;
  }

  trackScraping(success: boolean) {
    if (!this.metrics.total) this.metrics.total++; // Count only if not already tracked
    if (success) {
      this.metrics.scrapingSuccess++;
    } else {
      this.metrics.scrapingFailures++;
      // Note: Error context should be passed by caller
    }

    this.logBatchMetrics();
  }

  trackAIEnrichment(success: boolean) {
    if (success) {
      this.metrics.aiEnrichmentSuccess++;
    } else {
      this.metrics.aiEnrichmentFailures++;
      // Error logging is handled in the calling context with domain info
    }
  }

  trackAIGeneration() {
    this.metrics.aiGenerationSuccess++;
  }

  private logBatchMetrics() {
    // Log every 20 domains to reduce volume
    if (this.metrics.total % 20 === 0 && shouldLog('INFO')) {
      const scrapingSuccessRate =
        this.metrics.scrapingSuccess + this.metrics.scrapingFailures > 0
          ? (
              (this.metrics.scrapingSuccess /
                (this.metrics.scrapingSuccess +
                  this.metrics.scrapingFailures)) *
              100
            ).toFixed(1)
          : '0';

      const aiEnrichmentSuccessRate =
        this.metrics.aiEnrichmentSuccess + this.metrics.aiEnrichmentFailures > 0
          ? (
              (this.metrics.aiEnrichmentSuccess /
                (this.metrics.aiEnrichmentSuccess +
                  this.metrics.aiEnrichmentFailures)) *
              100
            ).toFixed(1)
          : '0';

      const cacheHitRate =
        this.metrics.total > 0
          ? ((this.metrics.cacheHits / this.metrics.total) * 100).toFixed(1)
          : '0';

      logInfo('DomainFetch', 'Domain processing batch', {
        ...this.context,
        batchTotal: this.metrics.total,
        cacheHitRate: `${cacheHitRate}%`,
        scrapingSuccessRate: `${scrapingSuccessRate}%`,
        aiEnrichmentSuccessRate: `${aiEnrichmentSuccessRate}%`,
        aiGenerationCount: this.metrics.aiGenerationSuccess,
      });
    }
  }
}

/**
 * Quick logging functions for common operations
 */
export const logBrandCreated = (
  organizationId: string,
  domain: string,
  name: string,
  brandId: string,
) =>
  logInfo('BrandCreate', 'Brand created', {
    organizationId,
    domain,
    name,
    brandId,
  });

export const logWebhookReceived = (resultId: string) =>
  logInfo('Webhook', 'Webhook received', {
    resultId,
  });

export const logWebhookCompleted = (resultId: string, orgId: string) =>
  logInfo('Webhook', 'Webhook processed', {
    resultId,
    organizationId: orgId,
  });
