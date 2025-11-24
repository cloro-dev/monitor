import { NextResponse } from 'next/server';
import { logError, logInfo } from '@/lib/logger';

export async function GET() {
  try {
    const apiKey = process.env.CLORO_API_KEY;

    if (!apiKey) {
      throw new Error('CLORO_API_KEY is not set in environment variables');
    }

    const response = await fetch('https://api.cloro.dev/v1/countries', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Cloro API error: ${response.status}`);
    }

    const countries = await response.json();

    logInfo('CountriesGET', 'Countries fetched successfully from Cloro API', {
      source: 'cloro_api',
      count: Array.isArray(countries) ? countries.length : 'unknown',
    });

    return NextResponse.json(countries);
  } catch (error) {
    logError('CountriesGET', 'Error fetching countries from Cloro API', error, {
      source: 'cloro_api',
      apiKeyExists: !!process.env.CLORO_API_KEY,
    });
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 },
    );
  }
}
