import { NextRequest, NextResponse } from 'next/server';

const KILOCODE_PORT = process.env.KILOCODE_SERVICE_PORT || '3005';
const KILOCODE_HOST = process.env.KILOCODE_HOST || 'localhost';
const KILOCODE_BASE = `http://${KILOCODE_HOST}:${KILOCODE_PORT}`;

/**
 * Kilocode API Proxy — /api/kilocode/[...path]
 * 
 * Proxies all requests to the Kilocode integration service (port 3005),
 * which in turn communicates with the Kilo Code CLI daemon.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${KILOCODE_BASE}/${pathStr}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Kilocode service unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const url = `${KILOCODE_BASE}/${pathStr}`;

  try {
    let body: string | null = null;
    try { body = await request.text(); } catch { /* no body */ }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
      signal: AbortSignal.timeout(30000),
    });

    const contentType = res.headers.get('content-type') || 'application/json';

    if (contentType.includes('text/event-stream')) {
      const stream = res.body;
      return new NextResponse(stream, {
        status: res.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Kilocode service unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const url = `${KILOCODE_BASE}/${pathStr}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Kilocode service unavailable' },
      { status: 503 }
    );
  }
}
