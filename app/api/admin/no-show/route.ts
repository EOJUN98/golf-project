/**
 * SDD-04 V2: Admin No-Show API
 *
 * POST /api/admin/no-show
 * - Mark reservation as no-show (admin only)
 * - Suspend user if policy requires
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import { markNoShow } from '@/utils/cancellationPolicyV2';

export async function POST(req: NextRequest) {
  try {
    await requireAdminAccess();
    const supabase = await createSupabaseServerClient();

    const body = await req.json();
    const { reservationId } = body;

    // Validate input
    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing required field: reservationId' },
        { status: 400 }
      );
    }

    // Mark as no-show
    const result = await markNoShow(reservationId, supabase);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      userSuspended: result.userSuspended
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    console.error('[POST /api/admin/no-show] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/no-show?date=2026-01-16
 * - Get all reservations that need no-show checking
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAccess();
    const supabase = await createSupabaseServerClient();

    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    // Get all PAID reservations for the date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        *,
        tee_times (
          tee_off,
          golf_clubs (
            name
          )
        ),
        users (
          name,
          phone,
          no_show_count
        )
      `)
      .eq('status', 'PAID')
      .gte('tee_times.tee_off', startOfDay.toISOString())
      .lte('tee_times.tee_off', endOfDay.toISOString());

    if (error) {
      console.error('[GET /api/admin/no-show] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      );
    }

    // Filter reservations that are past grace period
    const now = new Date();
    const gracePeriodMinutes = 30;

    const candidatesForNoShow = reservations
      .filter((res: any) => {
        const teeOff = new Date(res.tee_times.tee_off);
        const gracePeriodEnd = new Date(teeOff.getTime() + gracePeriodMinutes * 60 * 1000);
        return now >= gracePeriodEnd;
      })
      .map((res: any) => ({
        reservationId: res.id,
        userId: res.user_id,
        userName: res.users?.name,
        userPhone: res.users?.phone,
        userNoShowCount: res.users?.no_show_count || 0,
        teeOff: res.tee_times.tee_off,
        golfClubName: res.tee_times.golf_clubs?.name,
        finalPrice: res.final_price
      }));

    return NextResponse.json({
      date,
      totalReservations: reservations.length,
      candidatesForNoShow: candidatesForNoShow.length,
      reservations: candidatesForNoShow
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    console.error('[GET /api/admin/no-show] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
