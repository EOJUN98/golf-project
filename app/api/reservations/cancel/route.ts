/**
 * SDD-04 V2: Reservation Cancellation API
 *
 * POST /api/reservations/cancel
 * - Validates cancellation request
 * - Processes cancellation
 * - Initiates refund (if applicable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  canUserCancelReservation,
  requestCancellation,
  processPaymentRefund
} from '@/utils/cancellationPolicyV2';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reservationId, userId, cancelReason = 'USER_REQUEST' } = body;

    // Validate input
    if (!reservationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: reservationId, userId' },
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
      userId,
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
    const searchParams = req.nextUrl.searchParams;
    const reservationId = searchParams.get('reservationId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing reservationId parameter' },
        { status: 400 }
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
