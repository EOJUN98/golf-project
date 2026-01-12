// ==================================================================
// Reservations API Route
// ==================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, teeTimeId, finalPrice, discountBreakdown } = body;

    // Validation
    if (!userId || !teeTimeId || !finalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, teeTimeId, finalPrice' },
        { status: 400 }
      );
    }

    // Check if tee time is still available
    const { data: teeTime, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('id, status')
      .eq('id', teeTimeId)
      .single();

    if (teeTimeError) {
      return NextResponse.json(
        { error: 'Tee time not found', details: teeTimeError.message },
        { status: 404 }
      );
    }

    if (teeTime.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Tee time is no longer available', status: teeTime.status },
        { status: 409 }
      );
    }

    // Create reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: userId,
        tee_time_id: teeTimeId,
        final_price: finalPrice,
        discount_breakdown: discountBreakdown,
        payment_status: 'PENDING',
      })
      .select()
      .single();

    if (reservationError) {
      console.error('Reservation insert error:', reservationError);
      return NextResponse.json(
        { error: 'Failed to create reservation', details: reservationError.message },
        { status: 500 }
      );
    }

    // Update tee time status to BOOKED
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
      // Rollback reservation if tee time update fails
      await supabase.from('reservations').delete().eq('id', reservation.id);
      return NextResponse.json(
        { error: 'Failed to update tee time status', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: reservation.id,
          teeTimeId: reservation.tee_time_id,
          finalPrice: reservation.final_price,
          paymentStatus: reservation.payment_status,
          createdAt: reservation.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Reservation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve user's reservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        final_price,
        discount_breakdown,
        payment_status,
        created_at,
        tee_times (
          id,
          tee_off_time,
          base_price,
          status,
          golf_clubs (
            name,
            location_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reservations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
