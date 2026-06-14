import { NextRequest, NextResponse } from 'next/server';

const SANDBOX_API_URL = 'http://127.0.0.1:3002';
const TIMEOUT_MS = 5000;

export async function POST(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = await request.json();

    const response = await fetch(`${SANDBOX_API_URL}/api/execute`, {
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
          error: 'Sandbox service request timed out',
          message: 'The Go sandbox service did not respond within the timeout period. The sandbox may be overloaded or unresponsive.',
          service: 'sandbox',
          language: 'Go',
          port: 3002,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'Sandbox service is unavailable',
        message: 'The Go sandbox service is not running or not reachable. Please ensure the sandbox microservice is started on port 3002.',
        service: 'sandbox',
        language: 'Go',
        port: 3002,
        hint: 'Start the sandbox service and try again. Code execution features require the sandbox to be available.',
      },
      { status: 503 }
    );
  }
}
