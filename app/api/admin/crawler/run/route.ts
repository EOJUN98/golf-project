import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);

type AvailabilityStatus = 'AVAILABLE' | 'NO_DATA' | 'FAILED' | 'AUTH_REQUIRED' | 'REMOVED' | null;
type TargetOutcome = 'AVAILABLE' | 'NO_DATA' | 'FAILED' | 'AUTH_REQUIRED';

interface SiteBreakdown {
  siteCode: string;
  total: number;
  succeeded: number;
  noData: number;
  authRequired: number;
  failed: number;
}

interface RunErrorItem {
  targetId?: number;
  siteCode?: string;
  courseName?: string;
  message: string;
}

interface RunResult {
  total: number;
  succeeded: number;
  noData: number;
  authRequired: number;
  failed: number;
  siteBreakdown: SiteBreakdown[];
  errors: RunErrorItem[];
  executedAt: string;
}

interface RunRequestBody {
  targetIds?: unknown;
}

function errorResponse(
  status: number,
  code: 'FORBIDDEN' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR',
  message: string
) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function parseTargetIds(value: unknown): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const out = new Set<number>();
  for (const item of value) {
    const num = Number(item);
    if (!Number.isInteger(num) || num <= 0) return null;
    out.add(num);
  }
  return Array.from(out);
}

function isCronAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader = request.headers.get('x-cron-secret');
  if (!cronSecret) return false;
  return cronHeader === cronSecret;
}

async function runCrawlerCommand(extraArgs: string[] = []) {
  const crawlerDir = path.join(process.cwd(), 'crawler');
  const commandArgs = ['src/crawl-final-prices.mjs', ...extraArgs];
  return execFileAsync('node', commandArgs, {
    cwd: crawlerDir,
    timeout: 10 * 60 * 1000,
    maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });
}

function deriveTargetStatus(rows: Array<{ availability_status: AvailabilityStatus; crawl_status: string | null }>): TargetOutcome {
  if (rows.some((row) => row.availability_status === 'AVAILABLE')) return 'AVAILABLE';
  if (
    rows.some(
      (row) =>
        row.availability_status === 'FAILED' ||
        String(row.crawl_status || '').toUpperCase() === 'FAILED'
    )
  ) {
    return 'FAILED';
  }
  if (rows.some((row) => row.availability_status === 'AUTH_REQUIRED')) return 'AUTH_REQUIRED';
  return 'NO_DATA';
}

export async function POST(request: NextRequest) {
  const allowCron = isCronAuthorized(request);

  if (!allowCron) {
    try {
      await requireAdminAccess();
    } catch (error) {
      const message = error instanceof Error && error.message === 'UNAUTHORIZED'
        ? '로그인이 필요합니다.'
        : '관리자 권한이 필요합니다.';
      const code = error instanceof Error && error.message === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'FORBIDDEN';
      const status = code === 'UNAUTHORIZED' ? 401 : 403;
      return errorResponse(status, code, message);
    }
  }

  let body: RunRequestBody = {};
  try {
    body = (await request.json()) as RunRequestBody;
  } catch {
    body = {};
  }

  const targetIds = parseTargetIds(body.targetIds);
  if (targetIds === null) {
    return errorResponse(400, 'VALIDATION_ERROR', 'targetIds는 양의 정수 배열이어야 합니다.');
  }

  const supabase = createSupabaseAdminClient();

  let targetQuery = (supabase as any)
    .from('external_price_targets')
    .select('id, site_code, course_name, active')
    .eq('active', true);

  if (targetIds.length > 0) {
    targetQuery = targetQuery.in('id', targetIds);
  }

  const { data: activeTargets, error: targetError } = await targetQuery;
  if (targetError) {
    return errorResponse(500, 'INTERNAL_ERROR', `타겟 조회 실패: ${targetError.message}`);
  }

  const targetList: Array<{ id: number; site_code: string; course_name: string }> = (activeTargets || []).map((row: any) => ({
    id: Number(row.id),
    site_code: String(row.site_code || 'unknown'),
    course_name: String(row.course_name || ''),
  }));

  if (targetList.length === 0) {
    const empty: RunResult = {
      total: 0,
      succeeded: 0,
      noData: 0,
      authRequired: 0,
      failed: 0,
      siteBreakdown: [],
      errors: [],
      executedAt: new Date().toISOString(),
    };
    return NextResponse.json({ success: true, data: empty });
  }

  const runStartedAt = new Date(Date.now() - 5000).toISOString();
  const errors: RunErrorItem[] = [];
  const targetMetaById = new Map<number, { siteCode: string; courseName: string }>();
  for (const target of targetList) {
    targetMetaById.set(target.id, {
      siteCode: target.site_code,
      courseName: target.course_name,
    });
  }

  if (targetIds.length > 0) {
    for (const id of targetList.map((t) => t.id)) {
      try {
        await runCrawlerCommand([`--target=${id}`]);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown crawler error';
        const meta = targetMetaById.get(id);
        errors.push({
          targetId: id,
          siteCode: meta?.siteCode,
          courseName: meta?.courseName,
          message,
        });
      }
    }
  } else {
    try {
      await runCrawlerCommand();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown crawler error';
      errors.push({ message });
    }
  }

  const targetIdList = targetList.map((target) => target.id);
  const { data: snapshotRows, error: snapshotError } = await (supabase as any)
    .from('external_price_snapshots')
    .select('target_id, availability_status, crawl_status, crawled_at')
    .gte('crawled_at', runStartedAt)
    .in('target_id', targetIdList);

  if (snapshotError) {
    return errorResponse(500, 'INTERNAL_ERROR', `스냅샷 집계 실패: ${snapshotError.message}`);
  }

  const rowsByTarget = new Map<number, Array<{ availability_status: AvailabilityStatus; crawl_status: string | null }>>();
  for (const row of snapshotRows || []) {
    const targetId = Number((row as any).target_id);
    if (!Number.isInteger(targetId)) continue;
    if (!rowsByTarget.has(targetId)) rowsByTarget.set(targetId, []);
    rowsByTarget.get(targetId)!.push({
      availability_status: ((row as any).availability_status ?? null) as AvailabilityStatus,
      crawl_status: ((row as any).crawl_status ?? null) as string | null,
    });
  }

  let succeeded = 0;
  let noData = 0;
  let authRequired = 0;
  let failed = 0;
  const siteStats = new Map<string, SiteBreakdown>();

  const ensureSite = (siteCode: string) => {
    if (!siteStats.has(siteCode)) {
      siteStats.set(siteCode, {
        siteCode,
        total: 0,
        succeeded: 0,
        noData: 0,
        authRequired: 0,
        failed: 0,
      });
    }
    return siteStats.get(siteCode)!;
  };

  for (const target of targetList) {
    const site = ensureSite(target.site_code);
    site.total += 1;

    const rows = rowsByTarget.get(target.id) || [];
    if (rows.length === 0) {
      failed += 1;
      site.failed += 1;
      errors.push({
        targetId: target.id,
        siteCode: target.site_code,
        courseName: target.course_name,
        message: '실행 후 스냅샷이 생성되지 않았습니다.',
      });
      continue;
    }

    const status = deriveTargetStatus(rows);
    if (status === 'AVAILABLE') {
      succeeded += 1;
      site.succeeded += 1;
    } else if (status === 'FAILED') {
      failed += 1;
      site.failed += 1;
    } else if (status === 'AUTH_REQUIRED') {
      authRequired += 1;
      site.authRequired += 1;
    } else {
      noData += 1;
      site.noData += 1;
    }
  }

  const data: RunResult = {
    total: targetList.length,
    succeeded,
    noData,
    authRequired,
    failed,
    siteBreakdown: Array.from(siteStats.values()).sort((a, b) => a.siteCode.localeCompare(b.siteCode)),
    errors: errors.slice(0, 20),
    executedAt: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, data });
}
