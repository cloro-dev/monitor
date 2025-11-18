// lib/cloro.ts
import { Prisma } from '@prisma/client';

// Corrected API endpoint for ChatGPT monitoring
const CLORO_API_URL = 'https://api.cloro.dev/v1/monitor/chatgpt';

/**
 * Calls the cloro.dev API to track a prompt's response from ChatGPT.
 * @param prompt The text of the prompt to send to the model.
 * @param country The full country name (e.g., "United States") for regional tracking.
 * @returns The full JSON response from the cloro.dev API.
 */
export async function trackPrompt(
  prompt: string,
  country: string,
): Promise<Prisma.JsonValue> {
  const apiKey = process.env.CLORO_API_KEY;

  if (!apiKey) {
    throw new Error('CLORO_API_KEY is not set in the environment variables.');
  }

  const response = await fetch(CLORO_API_URL, {
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
      `cloro API request failed with status ${response.status}: ${errorBody}`,
    );
  }

  const data = await response.json();
  return data as Prisma.JsonValue;
}
