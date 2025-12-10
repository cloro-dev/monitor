import { ProviderModel } from '@prisma/client';

const CLORO_API_BASE_URL = 'https://api.cloro.dev/v1';

// Configuration for different provider models
const MODEL_CONFIGS = {
  AIOVERVIEW: {
    taskType: 'GOOGLE' as const,
    payloadKey: 'query' as const,
    include: {
      html: true,
      aioverview: {
        markdown: true,
      },
    },
  },
  CHATGPT: {
    taskType: 'CHATGPT' as const,
    payloadKey: 'prompt' as const,
    include: {
      searchQueries: true,
      html: true,
      markdown: true,
    },
  },
} as const;

// Default configuration for standard models
const DEFAULT_CONFIG = {
  payloadKey: 'prompt' as const,
  include: {
    html: true,
    markdown: true,
  },
} as const;

/**
 * Gets the configuration for a specific model, falling back to defaults.
 */
function getModelConfig(model: ProviderModel) {
  return MODEL_CONFIGS[model as keyof typeof MODEL_CONFIGS] || DEFAULT_CONFIG;
}

/**
 * Initiates tracking with Cloro using the appropriate endpoint based on model.
 */
export async function trackPromptAsync(
  prompt: string,
  country: string,
  model: ProviderModel,
  idempotencyKey: string,
): Promise<void> {
  const apiKey = process.env.CLORO_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey) {
    throw new Error('CLORO_API_KEY is not set.');
  }
  if (!appUrl) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is not set. Required for webhook callbacks.',
    );
  }

  const webhookUrl = `${appUrl}/api/webhook/cloro`;
  const asyncBaseUrl = CLORO_API_BASE_URL.replace('/monitor', '');
  const config = getModelConfig(model);

  // Build the payload using the model-specific configuration
  const payload: any = {
    [config.payloadKey]: prompt,
    country,
  };

  // Add include configuration if it exists
  if ('include' in config) {
    payload.include = config.include;
  }

  const requestBody = {
    taskType: config.taskType || model,
    idempotencyKey,
    webhook: {
      url: webhookUrl,
    },
    payload,
  };

  const response = await fetch(`${asyncBaseUrl}/async/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to initiate async task for ${model}: ${response.status} ${errorBody}`,
    );
  }
}
