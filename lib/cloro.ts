import { ProviderModel } from '@prisma/client';

const CLORO_API_BASE_URL = 'https://api.cloro.dev/v1/monitor';

/**
 * Initiates an asynchronous tracking task with Cloro.
 * @param prompt The text of the prompt.
 * @param country The country code.
 * @param model The AI model to use.
 * @param idempotencyKey A unique key (usually the Result ID) to track this specific task.
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

  // Construct the webhook URL
  const webhookUrl = `${appUrl}/api/webhook/cloro`;

  // The base URL for async tasks is slightly different (remove /monitor)
  const asyncBaseUrl = CLORO_API_BASE_URL.replace('/monitor', '');

  const response = await fetch(`${asyncBaseUrl}/async/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      taskType: model, // Now directly using the model enum value
      idempotencyKey,
      webhook: {
        url: webhookUrl,
      },
      payload: {
        prompt,
        country,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to initiate async task for ${model}: ${response.status} ${errorBody}`,
    );
  }
}
