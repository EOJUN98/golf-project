import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolveBaseUrl(request: NextRequest) {
  const requestOrigin = request.nextUrl?.origin;
  if (requestOrigin && requestOrigin.trim() && requestOrigin !== 'null') {
    return requestOrigin.replace(/\/+$/, '');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl && siteUrl.trim()) {
    return siteUrl.replace(/\/+$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim()) {
    return `https://${vercelUrl.replace(/\/+$/, '')}`;
  }

  return 'http://localhost:3000';
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const baseUrl = resolveBaseUrl(request);

  try {
    const response = await fetch(`${baseUrl}/api/admin/crawler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Crawler run API failed',
          status: response.status,
          detail: json,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      result: json?.data ?? json,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown';
    return NextResponse.json(
      { success: false, error: 'Crawl execution failed', detail },
      { status: 500 }
    );
  }
}
