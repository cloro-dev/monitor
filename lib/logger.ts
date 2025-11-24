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
