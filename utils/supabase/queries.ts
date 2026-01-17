import { supabase } from '@/lib/supabase';
import { calculatePricing, PricingContext } from '@/utils/pricingEngine';
import { Database } from '@/types/database';

type TeeTimeStatus = Database['public']['Tables']['tee_times']['Row']['status'];
type UserSegment = Database['public']['Tables']['users']['Row']['segment'];

export interface TeeTimeWithPricing {
  id: number;
  tee_off: string;
  basePrice: number;
  finalPrice: number;
  price: number;
  currency: string;
  status: TeeTimeStatus;
  reasons: string[];
  weather: {
    sky: string;
    temperature: number;
    rainProb: number;
    windSpeed: number;
  };
  teeOffTime: Date;
  discountResult?: any;
}

export async function getTeeTimesByDate(
  date: Date,
  userSegment?: UserSegment,
  userDistanceKm?: number
): Promise<TeeTimeWithPricing[]> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date);
  const startISO = new Date(`${dateStr}T00:00:00+09:00`).toISOString();
  const endISO = new Date(`${dateStr}T23:59:59.999+09:00`).toISOString();

  // ===================================================================
  // NEW: Fetch actual logged-in user's segment from database
  // ===================================================================
  let actualUserSegment: UserSegment = 'FUTURE'; // Default for non-logged-in users
  let actualUser: Database['public']['Tables']['users']['Row'] | null = null;

  try {
    // 1. Get current session
    const { data: { user: sessionUser } } = await supabase.auth.getUser();

    // 2. If user is logged in, fetch their segment from database
    if (sessionUser?.id) {
      const { data: dbUser, error: userError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (!userError && dbUser) {
        actualUser = dbUser;
        actualUserSegment = dbUser.segment;
      }
    }
  } catch (error) {
    console.error('Error fetching user segment:', error);
    // Fall back to default 'FUTURE' if error occurs
  }

  // Override with parameter if provided (for testing/admin purposes)
  const finalUserSegment = userSegment || actualUserSegment;

  // ===================================================================
  // Fetch tee times from database
  // ===================================================================
  const { data: teeTimes, error } = await supabase
    .from('tee_times')
    .select('*')
    .gte('tee_off', startISO)
    .lte('tee_off', endISO)
    .order('tee_off', { ascending: true });

  if (error) {
    console.error('Error fetching tee times:', error);
    return [];
  }

  return teeTimes.map((teeTime: any) => {
    // Build pricing context
    const ctx: PricingContext = {
      teeTime,
      userDistanceKm,
    };

    // Create user object for pricing engine with actual DB data or mock
    if (actualUser) {
      // Use actual logged-in user data
      ctx.user = actualUser;
    } else if (finalUserSegment) {
      // Create mock user with the determined segment
      ctx.user = {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'mock@example.com',
        name: null,
        phone: null,
        segment: finalUserSegment,
        cherry_score: 0,
        terms_agreed_at: null,
        created_at: new Date().toISOString(),
        updated_at: null,
        blacklisted: false,
        blacklist_reason: null,
        blacklisted_at: null,
        blacklisted_by: null,
        no_show_count: 0,
        last_no_show_at: null,
        total_bookings: 0,
        total_spent: 0,
        avg_booking_value: 0,
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
        is_super_admin: false,
        // SDD-04: Suspension fields
        is_suspended: false,
        suspended_reason: null,
        suspended_at: null,
        suspension_expires_at: null,
      };
    }

    const result = calculatePricing(ctx);

    // Format reasons from factors
    const reasons = result.factors.map(f => f.description);
    if (result.isBlocked && result.blockReason) {
      reasons.unshift(`⚠️ ${result.blockReason}`);
    }

    // Extract weather display (from DB or default)
    const weather = teeTime.weather_condition || {
      sky: '맑음',
      temperature: 20,
      rainProb: 0,
      windSpeed: 0,
    };

    return {
      id: teeTime.id,
      tee_off: teeTime.tee_off,
      basePrice: result.basePrice,
      finalPrice: result.finalPrice,
      price: result.finalPrice,
      currency: 'KRW',
      status: teeTime.status,
      reasons,
      weather,
      teeOffTime: new Date(teeTime.tee_off),
      discountResult: result,
    };
  });
}
