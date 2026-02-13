import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.redirect(
        new URL(`/payment/fail?code=UNAUTHORIZED&message=로그인이 필요합니다`, request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const teeTimeId = searchParams.get('tee_time_id');

    // Validation
    if (!paymentKey || !orderId || !amount) {
      return NextResponse.redirect(
        new URL(`/payment/fail?code=INVALID_REQUEST&message=Missing payment parameters`, request.url)
      );
    }

    if (!teeTimeId) {
      return NextResponse.redirect(
        new URL(`/payment/fail?code=INVALID_REQUEST&message=Missing tee time parameter`, request.url)
      );
    }

    // Step 1: Confirm payment with Toss Payments API
    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      console.error('TOSS_SECRET_KEY not found in environment');
      return NextResponse.redirect(
        new URL(`/payment/fail?code=CONFIG_ERROR&message=Payment system error`, request.url)
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
        amount: Number(amount),
      }),
    });

    const tossResult = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss payment confirmation failed:', tossResult);
      return NextResponse.redirect(
        new URL(
          `/payment/fail?code=${tossResult.code || 'PAYMENT_FAILED'}&message=${encodeURIComponent(tossResult.message || '결제 승인에 실패했습니다')}`,
          request.url
        )
      );
    }

    // Step 2: Check if tee time is still available
    const { data: teeTimeData, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('id, status, base_price')
      .eq('id', Number(teeTimeId))
      .single();

    const teeTime = teeTimeData as { id: number; status: string; base_price: number } | null;

    if (teeTimeError || !teeTime) {
      console.error('Tee time not found:', teeTimeError);
      return NextResponse.redirect(
        new URL(`/payment/fail?code=TEE_TIME_NOT_FOUND&message=티타임을 찾을 수 없습니다`, request.url)
      );
    }

    if (teeTime.status !== 'OPEN') {
      console.error('Tee time no longer available:', teeTime.status);
      return NextResponse.redirect(
        new URL(`/payment/fail?code=TEE_TIME_UNAVAILABLE&message=이미 예약된 티타임입니다`, request.url)
      );
    }

    // Step 3: Create reservation in database
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: authUser.id,
        tee_time_id: Number(teeTimeId),
        base_price: teeTime.base_price,
        final_price: Number(amount),
        discount_breakdown: null,
        payment_key: paymentKey,
        payment_status: 'PAID',
      })
      .select()
      .single();

    if (reservationError) {
      console.error('Reservation insert error:', reservationError);
      return NextResponse.redirect(
        new URL(`/payment/fail?code=DB_ERROR&message=예약 생성에 실패했습니다`, request.url)
      );
    }

    // Step 4: Update tee time status to BOOKED
    const { error: updateError } = await supabase
      .from('tee_times')
      .update({
        status: 'BOOKED',
        reserved_by: authUser.id,
        reserved_at: new Date().toISOString(),
      })
      .eq('id', Number(teeTimeId));

    if (updateError) {
      console.error('Tee time update error:', updateError);
      // Rollback: Delete the reservation
      await supabase.from('reservations').delete().eq('id', reservation.id);

      return NextResponse.redirect(
        new URL(`/payment/fail?code=DB_ERROR&message=티타임 상태 업데이트 실패`, request.url)
      );
    }

    // Success! Redirect to success page with payment details
    const successUrl = new URL('/payment/success', request.url);
    successUrl.searchParams.set('orderId', orderId);
    successUrl.searchParams.set('amount', amount);
    successUrl.searchParams.set('paymentKey', paymentKey);

    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.redirect(
      new URL(
        `/payment/fail?code=SERVER_ERROR&message=${encodeURIComponent(error instanceof Error ? error.message : '서버 오류가 발생했습니다')}`,
        request.url
      )
    );
  }
}
