// ==================================================================
// Reservations API Route (Secure)
// Updated for V2 Pricing Engine
// ==================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateDynamicPrice, PricingContext, WeatherData as EngineWeatherData } from '@/utils/pricingEngine';
import { getWeatherForDate } from '@/utils/supabase/queries';
import { UserSegment as DBUserSegment } from '@/types/database';

// Helper to map DB Weather to Engine Weather
function mapWeatherToEngine(dbWeather: any): EngineWeatherData {
  return {
    sky: dbWeather.sky || '맑음',
    temperature: dbWeather.temperature || 20,
    rainProb: dbWeather.rainProb || 0,
    windSpeed: dbWeather.windSpeed || 2, // Default wind speed
  };
}

// Helper to map DB Segment to Engine Segment
function mapSegmentToEngine(dbSegment: DBUserSegment): 'VIP' | 'Smart' | 'Base' | 'Cherry' {
  switch (dbSegment) {
    case 'PRESTIGE': return 'VIP';
    case 'SMART': return 'Smart';
    case 'CHERRY': return 'Cherry';
    default: return 'Base';
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, teeTimeId, finalPrice: clientProvidedPrice } = body;

    // 1. Validate Input
    if (!userId || !teeTimeId || !clientProvidedPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 2. Fetch Tee Time from DB
    const { data: teeTime, error: teeTimeError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', teeTimeId)
      .single();

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

    // 3. Security Check: Recalculate Price on Server (Prevent Tampering)
    const teeOffDate = new Date(teeTime.tee_off);
    const dbWeather = await getWeatherForDate(teeOffDate);
    
    // Map Context
    const engineWeather = mapWeatherToEngine(dbWeather);
    const dbUserSegment: DBUserSegment = 'PRESTIGE'; // Should fetch from User table in real app
    const engineSegment = mapSegmentToEngine(dbUserSegment);
    
    const context: PricingContext = {
      teeOff: teeOffDate,
      bookingTime: new Date(),
      basePriceInput: teeTime.base_price,
      weather: engineWeather,
      segment: engineSegment,
    };

    const serverPricing = calculateDynamicPrice(context);

    // Tolerance check
    if (serverPricing.finalPrice !== clientProvidedPrice) {
      console.warn(`Price Mismatch! Client: ${clientProvidedPrice}, Server: ${serverPricing.finalPrice}`);
      // For V2 transition, strict check might be annoying if client/server clock drifts slightly affecting LMD.
      // But adhering to strict security for now.
      return NextResponse.json(
        { error: 'Price validation failed. Please refresh and try again.', serverPrice: serverPricing.finalPrice },
        { status: 400 }
      );
    }

    // 4. Create Reservation
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: userId,
        tee_time_id: teeTimeId,
        final_price: serverPricing.finalPrice,
        discount_breakdown: serverPricing.appliedRules, // Save V2 breakdown
        payment_status: 'PENDING',
        agreed_penalty: true,
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
        reserved_by: userId,
        reserved_at: new Date().toISOString(),
      })
      .eq('id', teeTimeId);

    if (updateError) {
      // Rollback
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
