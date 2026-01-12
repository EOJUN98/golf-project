import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentKey, orderId, amount, metadata } = body;

    // Validation
    if (!paymentKey || !orderId || !amount || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: paymentKey, orderId, amount, metadata' },
        { status: 400 }
      );
    }

    const { userId, teeTimeId, finalPrice, discountBreakdown } = metadata;

    if (!userId || !teeTimeId || !finalPrice) {
      return NextResponse.json(
        { error: 'Invalid metadata: userId, teeTimeId, finalPrice required' },
        { status: 400 }
      );
    }

    // Step 1: Confirm payment with Toss Payments API
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      console.error('TOSS_SECRET_KEY not found in environment');
      return NextResponse.json(
        { error: 'Payment system configuration error' },
        { status: 500 }
      );
    }

    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const tossResult = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss payment confirmation failed:', tossResult);
      return NextResponse.json(
        {
          error: 'Payment confirmation failed',
          details: tossResult.message || 'Unknown error from Toss',
          code: tossResult.code
        },
        { status: 400 }
      );
    }

    // Step 2: Check if tee time is still available
    const { data: teeTime, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('id, status')
      .eq('id', teeTimeId)
      .single();

    if (teeTimeError || !teeTime) {
      console.error('Tee time not found:', teeTimeError);
      // Payment succeeded but booking failed - should trigger refund in production
      return NextResponse.json(
        {
          error: 'Tee time not found',
          warning: 'Payment succeeded but booking failed. Contact support for refund.',
          paymentKey
        },
        { status: 404 }
      );
    }

    if (teeTime.status !== 'OPEN') {
      console.error('Tee time no longer available:', teeTime.status);
      // Payment succeeded but tee time taken - should trigger refund
      return NextResponse.json(
        {
          error: 'Tee time is no longer available',
          warning: 'Payment succeeded but tee time was already booked. Contact support for refund.',
          paymentKey,
          status: teeTime.status
        },
        { status: 409 }
      );
    }

    // Step 3: Create reservation in database
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: userId,
        tee_time_id: teeTimeId,
        final_price: finalPrice,
        discount_breakdown: discountBreakdown || null,
        payment_status: 'PAID',
        payment_key: paymentKey,
        order_id: orderId,
      })
      .select()
      .single();

    if (reservationError) {
      console.error('Reservation insert error:', reservationError);
      // Payment succeeded but DB insert failed - critical error
      return NextResponse.json(
        {
          error: 'Failed to create reservation',
          warning: 'Payment succeeded but booking failed. Contact support immediately.',
          paymentKey,
          details: reservationError.message
        },
        { status: 500 }
      );
    }

    // Step 4: Update tee time status to BOOKED
    const { error: updateError } = await supabase
      .from('tee_times')
      .update({
        status: 'BOOKED',
        reserved_by: userId,
        reserved_at: new Date().toISOString(),
      })
      .eq('id', teeTimeId);

    if (updateError) {
      console.error('Tee time update error:', updateError);
      // Rollback: Delete the reservation
      await supabase.from('reservations').delete().eq('id', reservation.id);

      return NextResponse.json(
        {
          error: 'Failed to update tee time status',
          warning: 'Payment succeeded but booking failed. Contact support for refund.',
          paymentKey,
          details: updateError.message
        },
        { status: 500 }
      );
    }

    // Success!
    return NextResponse.json(
      {
        success: true,
        message: 'Payment confirmed and booking created',
        reservation: {
          id: reservation.id,
          teeTimeId: reservation.tee_time_id,
          finalPrice: reservation.final_price,
          paymentStatus: reservation.payment_status,
          orderId: reservation.order_id,
        },
        payment: {
          paymentKey: tossResult.paymentKey,
          orderId: tossResult.orderId,
          method: tossResult.method,
          totalAmount: tossResult.totalAmount,
          approvedAt: tossResult.approvedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
