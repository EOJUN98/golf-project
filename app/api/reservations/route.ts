// ==================================================================
// Reservations API Route (Secure)
// Updated for V2 Pricing Engine
// ==================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { calculatePricing, PricingContext, PricingResult } from '@/utils/pricingEngine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teeTimeId, finalPrice: clientProvidedPrice } = body;
    const teeTimeIdNum = Number(teeTimeId);
    const clientFinalPrice = Number(clientProvidedPrice);

    // 1. Validate Input
    if (!teeTimeIdNum || !clientFinalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 2. Fetch Tee Time from DB
    const { data: teeTimeData, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', teeTimeIdNum)
      .single();

    const teeTime = teeTimeData;

    if (teeTimeError || !teeTime) {
      return NextResponse.json(
        { error: 'Tee time not found' },
        { status: 404 }
      );
    }

    if (teeTime.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Tee time is no longer available', status: teeTime.status },
        { status: 409 }
      );
    }

    // 3. Security Check: Recalculate Price on Server
    const teeOffDate = new Date(teeTime.tee_off);
    
    // Fetch Weather (Assuming getWeatherForDate returns matching shape or we map it)
    // Note: In a real scenario, ensure getWeatherForDate returns the correct Weather Cache row.
    // For now, we'll fetch from 'weather_cache' directly or use the helper if it exists.
    const { data: weatherData } = await supabase
      .from('weather_cache')
      .select('*')
      .eq('target_date', teeOffDate.toISOString().split('T')[0])
      .order('target_hour', { ascending: true }) // closest hour logic needed?
      .limit(1)
      .single();

    // Fetch User for Segment
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    const context: PricingContext = {
      teeTime: teeTime,
      user: user || undefined, // If user fetch fails, treat as anonymous/default?
      weather: weatherData || undefined,
      now: new Date()
    };

    const serverPricing: PricingResult = calculatePricing(context);

    // Tolerance check
    if (serverPricing.finalPrice !== clientFinalPrice) {
      console.warn(`Price Mismatch! Client: ${clientFinalPrice}, Server: ${serverPricing.finalPrice}`);
      return NextResponse.json(
        { error: 'Price validation failed. Please refresh and try again.', serverPrice: serverPricing.finalPrice },
        { status: 400 }
      );
    }

    // 4. Create Reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: authUser.id,
        tee_time_id: teeTimeIdNum,
        base_price: serverPricing.basePrice,
        final_price: serverPricing.finalPrice,
        discount_breakdown: serverPricing.factors,
        payment_status: 'PENDING'
      })
      .select()
      .single();

    if (reservationError) {
      throw reservationError;
    }

    // 5. Update Tee Time Status
    const { error: updateError } = await supabase
      .from('tee_times')
      .update({
        status: 'BOOKED',
        reserved_by: authUser.id,
        reserved_at: new Date().toISOString()
      })
      .eq('id', teeTimeIdNum);

    if (updateError) {
      // Rollback (simplified)
      await supabase.from('reservations').delete().eq('id', reservation.id);
      throw updateError;
    }

    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: reservation.id,
          finalPrice: reservation.final_price,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Reservation Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
