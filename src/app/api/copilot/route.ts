import { NextRequest, NextResponse } from 'next/server';

const COPILOT_API_URL = 'http://127.0.0.1:3004';
const TIMEOUT_MS = 5000;

export async function POST(request: NextRequest) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = await request.json();

    const response = await fetch(`${COPILOT_API_URL}/api/completions`, {
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
          error: 'Copilot service request timed out',
          message: 'The Python copilot service did not respond within the timeout period. The AI model may be processing a complex request or the service is overloaded.',
          service: 'copilot',
          language: 'Python',
          port: 3004,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error: 'Copilot service is unavailable',
        message: 'The Python copilot service is not running or not reachable. Please ensure the copilot microservice is started on port 3004.',
        service: 'copilot',
        language: 'Python',
        port: 3004,
        hint: 'Start the copilot service and try again. AI code completions and suggestions require this service to be available.',
      },
      { status: 503 }
    );
  }
}
