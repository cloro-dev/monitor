import { NextResponse } from 'next/server';

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

    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries from Cloro API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 },
    );
  }
}
