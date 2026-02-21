import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserWithRoles } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

type TeeTimeRow = Database['public']['Tables']['tee_times']['Row'];
type TeeTimeStatus = TeeTimeRow['status'];
type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserWithRoles>>>;

type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

function errorResponse(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Unknown error';
}

function toUpdatedBy(user: AdminUser) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)
    ? user.id
    : null;
}

function isValidStatus(value: unknown): value is TeeTimeStatus {
  return value === 'OPEN' || value === 'BLOCKED' || value === 'BOOKED';
}

function canAccessClub(user: AdminUser, golfClubId: number) {
  if (user.isSuperAdmin || user.isAdmin) return true;
  return user.isClubAdmin && user.clubIds.includes(golfClubId);
}

function hasAdminConsoleAccess(user: AdminUser | null): user is AdminUser {
  return Boolean(user && (user.isSuperAdmin || user.isAdmin || user.isClubAdmin));
}

function getKstDayRange(dateYmd: string) {
  const start = new Date(`${dateYmd}T00:00:00+09:00`);
  const end = new Date(`${dateYmd}T23:59:59.999+09:00`);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

async function getSupabaseClient() {
  const adminClient = createSupabaseAdminClientOptional();
  return adminClient ?? await createSupabaseServerClient();
}

async function getAuthorizedUser() {
  const user = await getCurrentUserWithRoles();
  if (!hasAdminConsoleAccess(user)) return null;
  return user;
}

async function getTeeTimeOrNull(supabase: Awaited<ReturnType<typeof getSupabaseClient>>, id: number) {
  const { data, error } = await supabase.from('tee_times').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const clubIdRaw = req.nextUrl.searchParams.get('clubId');
    const date = req.nextUrl.searchParams.get('date');
    const clubId = Number(clubIdRaw);

    if (!clubIdRaw || !Number.isInteger(clubId) || clubId <= 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'clubId는 양의 정수여야 합니다.');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'date는 YYYY-MM-DD 형식이어야 합니다.');
    }
    if (!canAccessClub(user, clubId)) {
      return errorResponse(403, 'FORBIDDEN', '해당 골프장에 접근할 수 없습니다.');
    }

    const { startISO, endISO } = getKstDayRange(date);
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('tee_times')
      .select('*')
      .eq('golf_club_id', clubId)
      .gte('tee_off', startISO)
      .lte('tee_off', endISO)
      .order('tee_off', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const body = (await req.json()) as Record<string, unknown>;
    const golfClubId = Number(body.golf_club_id);
    const teeOff = typeof body.tee_off === 'string' ? body.tee_off : '';
    const basePriceRaw = Number(body.base_price);
    const statusRaw = body.status;
    const status = statusRaw === undefined ? 'OPEN' : statusRaw;

    if (!Number.isInteger(golfClubId) || golfClubId <= 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'golf_club_id는 양의 정수여야 합니다.');
    }
    if (!canAccessClub(user, golfClubId)) {
      return errorResponse(403, 'FORBIDDEN', '해당 골프장에 접근할 수 없습니다.');
    }
    if (!teeOff || Number.isNaN(new Date(teeOff).getTime())) {
      return errorResponse(400, 'VALIDATION_ERROR', 'tee_off는 유효한 ISO datetime이어야 합니다.');
    }
    if (!Number.isFinite(basePriceRaw) || basePriceRaw < 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'base_price는 0 이상의 숫자여야 합니다.');
    }
    if (!isValidStatus(status) || status === 'BOOKED') {
      return errorResponse(400, 'VALIDATION_ERROR', 'status는 OPEN 또는 BLOCKED만 허용됩니다.');
    }

    const basePrice = Math.floor(basePriceRaw);
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('tee_times')
      .insert({
        golf_club_id: golfClubId,
        tee_off: teeOff,
        base_price: basePrice,
        current_price: basePrice,
        status,
        updated_by: toUpdatedBy(user),
      } as any)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = getErrorMessage(error);
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthorizedUser();
    if (!user) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    if (action !== 'set-status' && action !== 'update-base-price') {
      return errorResponse(400, 'VALIDATION_ERROR', 'action은 set-status 또는 update-base-price여야 합니다.');
    }

    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'id는 양의 정수여야 합니다.');
    }

    const supabase = await getSupabaseClient();
    const existing = await getTeeTimeOrNull(supabase, id);
    if (!existing) return errorResponse(404, 'NOT_FOUND', 'Tee time not found.');
    if (!canAccessClub(user, existing.golf_club_id)) {
      return errorResponse(403, 'FORBIDDEN', '해당 골프장에 접근할 수 없습니다.');
    }
    if (existing.status === 'BOOKED') {
      return errorResponse(409, 'CONFLICT', '예약된 티타임은 수정할 수 없습니다.');
    }

    if (action === 'set-status') {
      const status = body.status;
      if (!isValidStatus(status) || status === 'BOOKED') {
        return errorResponse(400, 'VALIDATION_ERROR', 'status는 OPEN 또는 BLOCKED만 허용됩니다.');
      }

      const { data, error } = await supabase
        .from('tee_times')
        .update({ status, updated_by: toUpdatedBy(user) } as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    const basePriceRaw = Number(body.base_price);
    if (!Number.isFinite(basePriceRaw) || basePriceRaw < 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'base_price는 0 이상의 숫자여야 합니다.');
    }
    const basePrice = Math.floor(basePriceRaw);
    const { data, error } = await supabase
      .from('tee_times')
      .update({ base_price: basePrice, current_price: basePrice, updated_by: toUpdatedBy(user) } as any)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = getErrorMessage(error);
    return errorResponse(500, 'INTERNAL_ERROR', message);
  }
}
