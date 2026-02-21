/**
 * SDD-04 V2: Admin No-Show API
 *
 * POST /api/admin/no-show
 * - Mark reservation as no-show (admin only)
 * - Suspend user if policy requires
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import { detectReservationStatusColumn } from '@/lib/reservations/statusColumn';
import { markNoShow } from '@/utils/cancellationPolicyV2';

function errorResponse(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function mapAuthError(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return { status: 401, message: '로그인이 필요합니다.' };
  }
  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return { status: 403, message: '관리자 권한이 필요합니다.' };
  }
  return null;
}

async function getNoShowSupabase() {
  const adminClient = createSupabaseAdminClientOptional();
  return adminClient ?? await createSupabaseServerClient();
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayKst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminAccess();
    const supabase = await getNoShowSupabase();

    const body = await req.json() as { reservationId?: unknown };
    const reservationId = typeof body.reservationId === 'string'
      ? body.reservationId.trim()
      : '';

    // Validate input
    if (!reservationId) {
      return errorResponse(400, 'reservationId는 필수 문자열입니다.');
    }

    const statusColumn = await detectReservationStatusColumn(supabase);
    if (statusColumn === 'payment_status') {
      return errorResponse(
        409,
        '현재 DB 스키마는 노쇼 처리(status/no_show_marked_at)를 지원하지 않습니다. v1 마이그레이션 적용 후 다시 시도하세요.'
      );
    }

    // Mark as no-show
    const result = await markNoShow(reservationId, supabase);

    if (!result.success) {
      return errorResponse(400, result.message);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      userSuspended: result.userSuspended
    });
  } catch (error) {
    const authError = mapAuthError(error);
    if (authError) {
      return errorResponse(authError.status, authError.message);
    }
    console.error('[POST /api/admin/no-show] Error:', error);
    return errorResponse(500, 'Internal server error');
  }
}

/**
 * GET /api/admin/no-show?date=2026-01-16
 * - Get all reservations that need no-show checking
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAccess();
    const supabase = await getNoShowSupabase();
    const statusColumn = await detectReservationStatusColumn(supabase);
    const statusSelect = statusColumn;

    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const date = dateParam && isValidDate(dateParam)
      ? dateParam
      : getTodayKst();

    if (dateParam && !isValidDate(dateParam)) {
      return errorResponse(400, 'date는 YYYY-MM-DD 형식이어야 합니다.');
    }

    // Get all PAID reservations for the date
    const startOfDay = new Date(`${date}T00:00:00+09:00`);
    const endOfDay = new Date(`${date}T23:59:59.999+09:00`);

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        final_price,
        ${statusSelect},
        tee_times!inner (
          tee_off,
          golf_clubs (
            name
          )
        ),
        users!inner (
          name,
          phone,
          no_show_count
        )
      `)
      .eq(statusColumn, 'PAID')
      .gte('tee_times.tee_off', startOfDay.toISOString())
      .lte('tee_times.tee_off', endOfDay.toISOString());

    if (error) {
      console.error('[GET /api/admin/no-show] Error:', error);
      return errorResponse(500, 'Failed to fetch reservations');
    }

    // Filter reservations that are past grace period
    const now = new Date();
    const gracePeriodMinutes = 30;
    const rows = (reservations || []) as any[];

    const candidatesForNoShow = rows
      .filter((res: any) => {
        const teeTime = firstOf(res.tee_times);
        if (!teeTime?.tee_off) return false;
        const teeOff = new Date(teeTime.tee_off);
        const gracePeriodEnd = new Date(teeOff.getTime() + gracePeriodMinutes * 60 * 1000);
        return now >= gracePeriodEnd;
      })
      .map((res: any) => {
        const teeTime = firstOf(res.tee_times);
        const golfClubRaw = teeTime ? firstOf(teeTime.golf_clubs) : null;
        const userRaw = firstOf(res.users);

        return {
          reservationId: res.id,
          userId: res.user_id,
          userName: userRaw?.name || null,
          userPhone: userRaw?.phone || null,
          userNoShowCount: userRaw?.no_show_count || 0,
          teeOff: teeTime?.tee_off || null,
          golfClubName: golfClubRaw?.name || null,
          finalPrice: Number(res.final_price || 0)
        };
      });

    return NextResponse.json({
      success: true,
      date,
      totalReservations: rows.length,
      candidatesForNoShow: candidatesForNoShow.length,
      reservations: candidatesForNoShow
    });
  } catch (error) {
    const authError = mapAuthError(error);
    if (authError) {
      return errorResponse(authError.status, authError.message);
    }
    console.error('[GET /api/admin/no-show] Error:', error);
    return errorResponse(500, 'Internal server error');
  }
}
