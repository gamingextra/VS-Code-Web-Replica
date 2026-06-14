import { NextRequest, NextResponse } from 'next/server';

const SEARCH_API_URL = 'http://127.0.0.1:3003';
const TIMEOUT_MS = 5000;

export async function POST(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = await request.json();

    const response = await fetch(`${SEARCH_API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Search service request timed out',
          message: 'The Rust search service did not respond within the timeout period. The search index may be rebuilding or the service is overloaded.',
          service: 'search',
          language: 'Rust',
          port: 3003,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'Search service is unavailable',
        message: 'The Rust search service is not running or not reachable. Please ensure the search microservice is started on port 3003.',
        service: 'search',
        language: 'Rust',
        port: 3003,
        hint: 'Start the search service and try again. Full-text search and symbol search features require this service to be available.',
      },
      { status: 503 }
    );
  }
}
