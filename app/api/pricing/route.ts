import { NextResponse } from 'next/server';
import { calculatePricing, PricingContext, PricingResult } from '@/utils/pricingEngine';
import { Database } from '@/types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type Weather = Database['public']['Tables']['weather_cache']['Row'];
type User = Database['public']['Tables']['users']['Row'];

// ==================================================================
// 1. [Mock Data] Since we don't have a live DB yet
// ==================================================================
function getMockData() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Mock Weather
  const weather: Weather = {
    id: 1,
    target_date: tomorrow.toISOString().split('T')[0],
    target_hour: 12,
    pop: 70, // Rain probability
    rn1: 2,  // Rainfall 2mm
    wsd: 3
  };

  // Mock User
  const user: User = {
    id: 'mock-user-id',
    email: 'test@tugol.com',
    name: null,
    phone: null,
    segment: 'PRESTIGE',
    cherry_score: 10,
    terms_agreed_at: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: null,
    blacklisted: false,
    blacklist_reason: null,
    blacklisted_at: null,
    blacklisted_by: null,
    no_show_count: 0,
    last_no_show_at: null,
    total_bookings: 5,
    total_spent: 500000,
    avg_booking_value: 100000,
    location_lat: null,
    location_lng: null,
    location_address: null,
    distance_to_club_km: null,
    visit_count: 0,
    avg_stay_minutes: null,
    last_visited_at: null,
    segment_override_by: null,
    segment_override_at: null,
    marketing_agreed: false,
    push_agreed: false,
    is_admin: false,
    is_super_admin: false
  };

  // Mock Tee Times
  const teeTimes: TeeTime[] = [
    {
      id: 101,
      golf_club_id: 1,
      tee_off: new Date(now.getTime() + 90 * 60000).toISOString(),
      base_price: 250000,
      status: 'OPEN',
      weather_condition: null,
      updated_by: null,
      updated_at: null,
      reserved_by: null,
      reserved_at: null
    },
    {
      id: 102,
      golf_club_id: 1,
      tee_off: new Date(now.getTime() + 180 * 60000).toISOString(),
      base_price: 200000,
      status: 'OPEN',
      weather_condition: null,
      updated_by: null,
      updated_at: null,
      reserved_by: null,
      reserved_at: null
    },
    {
      id: 103,
      golf_club_id: 1,
      tee_off: new Date(now.getTime() + 45 * 60000).toISOString(),
      base_price: 150000,
      status: 'OPEN',
      weather_condition: null,
      updated_by: null,
      updated_at: null,
      reserved_by: null,
      reserved_at: null
    }
  ];

  return { weather, user, teeTimes };
}

// ==================================================================
// 2. [API Handler]
// ==================================================================
export async function GET() {
  const { weather, user, teeTimes } = getMockData();
  const now = new Date();

  // Calculate Price for each Tee Time using the Engine
  const results = teeTimes.map(teeTime => {
    const context: PricingContext = {
      teeTime,
      user, // Simulate logged-in user
      weather,
      userDistanceKm: 10, // Mock LBS: 10km away
      now
    };

    const result = calculatePricing(context);
    
    // Map to Frontend expected format (if needed, or return raw result)
    // Here we return a structure compatible with the frontend components
    return {
      ...teeTime,
      finalPrice: result.finalPrice,
      originalPrice: result.basePrice,
      discountRate: Math.round(result.discountRate * 100),
      isBlocked: result.isBlocked,
      blockReason: result.blockReason,
      factors: result.factors,
      stepStatus: result.stepStatus
    };
  });

  return NextResponse.json({
    status: 'success',
    data: results,
    user: {
      segment: user.segment,
      isNearby: true
    },
    weather: {
      rainProb: weather.pop,
      status: weather.pop >= 60 ? 'Rain' : (weather.pop >= 30 ? 'Cloudy' : 'Sunny')
    },
    meta: {
      engine: 'v2-step-down',
      generatedAt: now.toISOString()
    }
  });
}
