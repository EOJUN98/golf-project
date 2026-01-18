/**
 * SDD-05: Reservation Detail API
 *
 * GET /api/reservation/[id]
 * - Fetch reservation with all related data
 * - Include weather forecast
 * - Include cancellation eligibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canUserCancelReservation } from '@/utils/cancellationPolicyV2';
import { calculateHoursLeft } from '@/utils/reservationDetailHelpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const reservationId = resolvedParams.id;

    if (!reservationId) {
      return NextResponse.json(
        { success: false, error: 'Missing reservation ID' },
        { status: 400 }
      );
    }

    // Fetch reservation with all relations
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        *,
        tee_times (
          *,
          golf_clubs (
            id,
            name,
            location_name,
            location_lat,
            location_lng
          )
        ),
        users (
          id,
          email,
          name,
          phone,
          segment,
          is_suspended,
          suspended_reason,
          suspended_at,
          suspension_expires_at,
          no_show_count
        )
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      console.error('[GET /api/reservation/:id] Error:', reservationError);
      return NextResponse.json(
        { success: false, error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Extract nested data (Supabase returns nested objects)
    const teeTime = Array.isArray(reservation.tee_times)
      ? reservation.tee_times[0]
      : reservation.tee_times;
    const golfClub = Array.isArray(teeTime?.golf_clubs)
      ? teeTime.golf_clubs[0]
      : teeTime?.golf_clubs;
    const user = Array.isArray(reservation.users)
      ? reservation.users[0]
      : reservation.users;

    if (!teeTime || !golfClub || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid reservation data structure' },
        { status: 500 }
      );
    }

    // Get weather data from tee_time.weather_condition (if exists)
    let weather = null;
    if (teeTime.weather_condition && typeof teeTime.weather_condition === 'object') {
      weather = teeTime.weather_condition;
    }

    // Check cancellation eligibility
    const eligibilityResult = await canUserCancelReservation(reservationId, supabase);
    const hoursLeft = calculateHoursLeft(teeTime.tee_off);

    const eligibility = {
      canCancel: eligibilityResult.canCancel,
      reason: eligibilityResult.reason,
      hoursLeft: hoursLeft,
      isImminentDeal: reservation.is_imminent_deal,
      isUserSuspended: user.is_suspended,
      reservationStatus: reservation.status,
      cutoffHours: eligibilityResult.policy?.cancel_cutoff_hours || 24
    };

    // Return structured data
    return NextResponse.json({
      success: true,
      data: {
        reservation: {
          id: reservation.id,
          user_id: reservation.user_id,
          tee_time_id: reservation.tee_time_id,
          final_price: reservation.final_price,
          discount_breakdown: reservation.discount_breakdown,
          agreed_penalty: reservation.agreed_penalty,
          payment_status: reservation.payment_status,
          payment_key: reservation.payment_key,
          order_id: reservation.order_id,
          created_at: reservation.created_at,
          updated_at: reservation.updated_at,
          status: reservation.status,
          is_imminent_deal: reservation.is_imminent_deal,
          cancelled_at: reservation.cancelled_at,
          cancel_reason: reservation.cancel_reason,
          refund_amount: reservation.refund_amount,
          no_show_marked_at: reservation.no_show_marked_at,
          policy_version: reservation.policy_version
        },
        teeTime: {
          id: teeTime.id,
          tee_off: teeTime.tee_off,
          base_price: teeTime.base_price,
          status: teeTime.status,
          golf_club_id: teeTime.golf_club_id,
          weather_condition: teeTime.weather_condition,
          reserved_by: teeTime.reserved_by,
          reserved_at: teeTime.reserved_at
        },
        golfClub: {
          id: golfClub.id,
          name: golfClub.name,
          location_name: golfClub.location_name,
          location_lat: golfClub.location_lat,
          location_lng: golfClub.location_lng
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          segment: user.segment,
          is_suspended: user.is_suspended,
          suspended_reason: user.suspended_reason,
          suspended_at: user.suspended_at,
          suspension_expires_at: user.suspension_expires_at,
          no_show_count: user.no_show_count
        },
        weather,
        eligibility
      }
    });
  } catch (error) {
    console.error('[GET /api/reservation/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
