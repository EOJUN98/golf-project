/**
 * SDD-04 V2: Admin No-Show API
 *
 * POST /api/admin/no-show
 * - Mark reservation as no-show (admin only)
 * - Suspend user if policy requires
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { markNoShow } from '@/utils/cancellationPolicyV2';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservationId, adminUserId } = body;

    // Validate input
    if (!reservationId || !adminUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: reservationId, adminUserId' },
        { status: 400 }
      );
    }

    // Verify admin permissions
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('is_admin, is_super_admin')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminUser?.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
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
    console.error('[GET /api/admin/no-show] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
