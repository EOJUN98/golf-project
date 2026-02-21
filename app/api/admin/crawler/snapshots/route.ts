import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_NOTE_LENGTH = 300;
const MAX_TRAITS = 8;
const MAX_TRAIT_LENGTH = 30;

interface ManualNoteView {
  text: string | null;
  traits: string[];
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
}

interface SnapshotNoteRow {
  id: number;
  siteCode: string;
  courseName: string;
  playDate: string | null;
  collectionWindow: string | null;
  availabilityStatus: string | null;
  crawlStatus: string | null;
  finalPrice: number | null;
  crawledAt: string;
  manualNote: ManualNoteView | null;
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('CRAWLER_CONFIG_MISSING:NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!serviceRoleKey) {
    throw new Error('CRAWLER_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseTraitsValue(value: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: 'traits는 문자열 배열이어야 합니다.' };
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      return { ok: false, error: 'traits는 문자열 배열이어야 합니다.' };
    }

    const trimmed = item.trim();
    if (!trimmed) continue;

    if (trimmed.length > MAX_TRAIT_LENGTH) {
      return { ok: false, error: `traits 각 항목은 ${MAX_TRAIT_LENGTH}자 이하여야 합니다.` };
    }

    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  if (normalized.length > MAX_TRAITS) {
    return { ok: false, error: `traits는 최대 ${MAX_TRAITS}개까지 허용됩니다.` };
  }

  return { ok: true, value: normalized };
}

function parseManualNote(payload: unknown): ManualNoteView | null {
  if (!isRecord(payload)) return null;
  const raw = payload.manual_note;
  if (!isRecord(raw)) return null;

  const text = typeof raw.text === 'string' ? raw.text.trim() : null;
  const traitsResult = parseTraitsValue(raw.traits);
  const traits = traitsResult.ok ? traitsResult.value : [];

  return {
    text: text && text.length > 0 ? text : null,
    traits,
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    updatedBy: typeof raw.updated_by === 'string' ? raw.updated_by : null,
    updatedByEmail: typeof raw.updated_by_email === 'string' ? raw.updated_by_email : null,
  };
}

function mapSnapshotRow(row: any): SnapshotNoteRow {
  return {
    id: Number(row.id),
    siteCode: String(row.site_code || ''),
    courseName: String(row.course_name || ''),
    playDate: row.play_date ? String(row.play_date) : null,
    collectionWindow: row.collection_window ? String(row.collection_window) : null,
    availabilityStatus: row.availability_status ? String(row.availability_status) : null,
    crawlStatus: row.crawl_status ? String(row.crawl_status) : null,
    finalPrice: toNumber(row.final_price),
    crawledAt: String(row.crawled_at),
    manualNote: parseManualNote(row.payload),
  };
}

function errorResponse(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function mapCaughtError(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return { status: 401, message: '로그인이 필요합니다.' };
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return { status: 403, message: '관리자 권한이 필요합니다.' };
  }
  if (error instanceof Error && error.message.startsWith('CRAWLER_CONFIG_MISSING:')) {
    const missing = error.message.split(':')[1] || '환경변수';
    return { status: 500, message: `Crawler config missing: ${missing}` };
  }
  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }
  return { status: 500, message: 'Internal server error' };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminAccess();
    const courseName = (request.nextUrl.searchParams.get('courseName') || '').trim();
    const limitRaw = Number(request.nextUrl.searchParams.get('limit') || DEFAULT_LIMIT);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitRaw)))
      : DEFAULT_LIMIT;

    if (!courseName) {
      return errorResponse(400, 'courseName is required');
    }

    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from('external_price_snapshots')
      .select('id, site_code, course_name, play_date, collection_window, availability_status, crawl_status, final_price, crawled_at, payload')
      .eq('course_name', courseName)
      .order('crawled_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map(mapSnapshotRow),
    });
  } catch (error) {
    const mapped = mapCaughtError(error);
    return errorResponse(mapped.status, mapped.message);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdminAccess();
    const body = (await request.json()) as Record<string, unknown>;

    const snapshotId = Number(body.snapshotId);
    if (!Number.isInteger(snapshotId) || snapshotId <= 0) {
      return errorResponse(400, 'snapshotId는 양의 정수여야 합니다.');
    }

    const hasNoteKey = Object.prototype.hasOwnProperty.call(body, 'note');
    const hasTraitsKey = Object.prototype.hasOwnProperty.call(body, 'traits');

    if (!hasNoteKey && !hasTraitsKey) {
      return errorResponse(400, 'note 또는 traits 중 하나는 포함되어야 합니다.');
    }

    let nextNoteText: string | null | undefined;
    if (hasNoteKey) {
      if (body.note === null || body.note === undefined) {
        nextNoteText = null;
      } else if (typeof body.note !== 'string') {
        return errorResponse(400, 'note는 문자열이어야 합니다.');
      } else {
        const trimmed = body.note.trim();
        if (trimmed.length > MAX_NOTE_LENGTH) {
          return errorResponse(400, `note는 ${MAX_NOTE_LENGTH}자 이하여야 합니다.`);
        }
        nextNoteText = trimmed.length > 0 ? trimmed : null;
      }
    }

    const traitsResult = parseTraitsValue(body.traits);
    if (!traitsResult.ok) {
      return errorResponse(400, traitsResult.error);
    }

    const supabase = getAdminSupabase();

    const { data: existing, error: findError } = await supabase
      .from('external_price_snapshots')
      .select('id, site_code, course_name, play_date, collection_window, availability_status, crawl_status, final_price, crawled_at, payload')
      .eq('id', snapshotId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!existing) {
      return errorResponse(404, 'Snapshot not found');
    }

    const payloadBase: Record<string, unknown> = isRecord(existing.payload) ? { ...existing.payload } : {};
    const currentManualNote = parseManualNote(payloadBase);

    const resolvedNoteText = hasNoteKey
      ? (nextNoteText ?? null)
      : (currentManualNote?.text ?? null);

    const resolvedTraits = hasTraitsKey
      ? traitsResult.value
      : (currentManualNote?.traits ?? []);

    if (!resolvedNoteText && resolvedTraits.length === 0) {
      delete payloadBase.manual_note;
    } else {
      payloadBase.manual_note = {
        text: resolvedNoteText,
        traits: resolvedTraits,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        updated_by_email: user.email || null,
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from('external_price_snapshots')
      .update({ payload: payloadBase })
      .eq('id', snapshotId)
      .select('id, site_code, course_name, play_date, collection_window, availability_status, crawl_status, final_price, crawled_at, payload')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: mapSnapshotRow(updated),
    });
  } catch (error) {
    const mapped = mapCaughtError(error);
    return errorResponse(mapped.status, mapped.message);
  }
}
