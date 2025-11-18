import { Prisma, ProviderModel } from '@prisma/client';

const CLORO_API_BASE_URL = 'https://api.cloro.dev/v1/monitor';

const MODEL_ENDPOINTS: Record<ProviderModel, string> = {
  CHATGPT: `${CLORO_API_BASE_URL}/chatgpt`,
  PERPLEXITY: `${CLORO_API_BASE_URL}/perplexity`,
  MICROSOFT_COPILOT: `${CLORO_API_BASE_URL}/copilot`,
  GOOGLE_AI_MODE: `${CLORO_API_BASE_URL}/aimode`,
  GOOGLE_AI_OVERVIEW: `${CLORO_API_BASE_URL}/aioverview`,
};

/**
 * Calls the cloro.dev API to track a prompt's response from a specific AI model.
 * @param prompt The text of the prompt to send to the model.
 * @param country The full country name (e.g., "United States") for regional tracking.
 * @param model The AI model to use for tracking.
 * @returns The full JSON response from the cloro.dev API.
 */
export async function trackPrompt(
  prompt: string,
  country: string,
  model: ProviderModel,
): Promise<Prisma.JsonValue> {
  const apiKey = process.env.CLORO_API_KEY;

  if (!apiKey) {
    throw new Error('CLORO_API_KEY is not set in the environment variables.');
  }

  const endpoint = MODEL_ENDPOINTS[model];
  if (!endpoint) {
    throw new Error(`No endpoint found for model: ${model}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The API key is sent as a Bearer token in the Authorization header.
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      country,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // Provide a more informative error message.
    throw new Error(
      `cloro API request failed for ${model} with status ${response.status}: ${errorBody}`,
    );
  }

  const data = await response.json();
  return data as Prisma.JsonValue;
}
