/**
 * SDD-04 V2: Reservation Cancellation API
 *
 * POST /api/reservations/cancel
 * - Validates cancellation request
 * - Processes cancellation
 * - Initiates refund (if applicable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  canUserCancelReservation,
  requestCancellation,
  processPaymentRefund
} from '@/utils/cancellationPolicyV2';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reservationId, cancelReason = 'USER_REQUEST' } = body;

    // Validate input
    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing required field: reservationId' },
        { status: 400 }
      );
    }

    // Step 1: Check if cancellation is allowed
    const checkResult = await canUserCancelReservation(reservationId, supabase);

    if (!checkResult.canCancel) {
      return NextResponse.json(
        {
          error: 'Cancellation not allowed',
          reason: checkResult.reason,
          canCancel: false
        },
        { status: 400 }
      );
    }

    // Step 2: Process cancellation (update DB)
    const cancelResult = await requestCancellation(
      reservationId,
      authUser.id,
      cancelReason,
      supabase
    );

    if (!cancelResult.success) {
      return NextResponse.json(
        { error: cancelResult.message },
        { status: 500 }
      );
    }

    // Step 3: Process payment refund (if refund amount > 0)
    let refundResult = null;
    if (cancelResult.refundAmount && cancelResult.refundAmount > 0) {
      // Get payment key
      const { data: reservation } = await supabase
        .from('reservations')
        .select('payment_key')
        .eq('id', reservationId)
        .eq('user_id', authUser.id)
        .single();

      if (reservation?.payment_key) {
        refundResult = await processPaymentRefund(
          reservationId,
          cancelResult.refundAmount,
          reservation.payment_key
        );

        if (!refundResult.success) {
          // Log refund failure but don't fail the entire cancellation
          console.error('[POST /api/reservations/cancel] Refund failed:', refundResult.message);
        }
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: cancelResult.message,
      refundAmount: cancelResult.refundAmount,
      refundStatus: refundResult?.success ? 'pending' : 'failed',
      reservationId: cancelResult.reservationId
    });
  } catch (error) {
    console.error('[POST /api/reservations/cancel] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reservations/cancel?reservationId=xxx
 * - Check if cancellation is allowed (for UI gating)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing reservationId parameter' },
        { status: 400 }
      );
    }

    const { data: ownedReservation, error: ownershipError } = await supabase
      .from('reservations')
      .select('id')
      .eq('id', reservationId)
      .eq('user_id', authUser.id)
      .single();

    if (ownershipError || !ownedReservation) {
      return NextResponse.json(
        { error: 'Reservation not found or not owned by current user' },
        { status: 404 }
      );
    }

    // Check cancellation eligibility
    const checkResult = await canUserCancelReservation(reservationId, supabase);

    return NextResponse.json({
      canCancel: checkResult.canCancel,
      reason: checkResult.reason,
      hoursLeft: checkResult.hoursLeft,
      policy: checkResult.policy
    });
  } catch (error) {
    console.error('[GET /api/reservations/cancel] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
