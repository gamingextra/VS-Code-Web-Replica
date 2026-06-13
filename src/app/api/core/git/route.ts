import { NextRequest, NextResponse } from 'next/server';

const CORE_API_URL = 'http://127.0.0.1:3001';
const TIMEOUT_MS = 5000;

export async function GET(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const queryString = request.nextUrl.searchParams.toString();
    const url = `${CORE_API_URL}/api/git/status${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Core API git status request timed out', service: 'core-api', port: 3001 },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Core API is unavailable', service: 'core-api', port: 3001 },
      { status: 503 }
    );
  }
}
