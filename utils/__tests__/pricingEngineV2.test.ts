/**
 * SDD-03: Pricing Engine V2 Test Scenarios
 *
 * Test cases for weather, time, and sales-based discount logic.
 * Run with: npm test (if Jest configured) or review as examples.
 */

import { calculatePricing, PricingContext, PricingResult } from '../pricingEngineV2';
import { Database } from '../../types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type Weather = Database['public']['Tables']['weather_cache']['Row'];

// =====================================================
// Mock Data Helpers
// =====================================================

function createMockTeeTime(overrides?: Partial<TeeTime>): TeeTime {
  return {
    id: 101,
    golf_club_id: 1,
    tee_off: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    base_price: 120000,
    status: 'OPEN',
    weather_condition: null,
    reserved_by: null,
    reserved_at: null,
    updated_by: null,
    updated_at: null,
    ...overrides
  };
}

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-001',
    email: 'test@example.com',
    name: 'Test User',
    phone: '010-1234-5678',
    segment: 'FUTURE',
    cherry_score: 50,
    terms_agreed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
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
    location_lat: 37.5665,
    location_lng: 126.9780,
    location_address: 'Seoul, Korea',
    distance_to_club_km: 10,
    visit_count: 3,
    avg_stay_minutes: 180,
    last_visited_at: new Date().toISOString(),
    segment_override_by: null,
    segment_override_at: null,
    marketing_agreed: true,
    push_agreed: true,
    is_admin: false,
    is_super_admin: false,
    ...overrides
  };
}

function createMockWeather(overrides?: Partial<Weather>): Weather {
  return {
    id: 1,
    target_date: new Date().toISOString().slice(0, 10),
    target_hour: 14,
    pop: 0,
    rn1: 0,
    wsd: 2,
    ...overrides
  };
}

// =====================================================
// Test Scenarios
// =====================================================

describe('SDD-03: Pricing Engine V2', () => {
  describe('Weather Layer', () => {
    test('Scenario 1: Heavy rain → Block tee time', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 12, pop: 80 });

      const ctx: PricingContext = { teeTime, weather };
      const result = calculatePricing(ctx);

      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toBe('WEATHER_STORM');
      expect(result.finalPrice).toBe(120000); // No discount when blocked
      expect(result.factors.length).toBe(0);
    });

    test('Scenario 2: Moderate rain (5~10mm) → 20% discount', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 7, pop: 65 });

      const ctx: PricingContext = { teeTime, weather };
      const result = calculatePricing(ctx);

      expect(result.isBlocked).toBe(false);
      expect(result.factors).toContainEqual(
        expect.objectContaining({
          code: 'WEATHER',
          rate: 0.20
        })
      );
      // 120,000 * 0.20 = 24,000 discount → 96,000 final (before other discounts)
    });

    test('Scenario 3: Light rain (1~5mm) → 10% discount', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 2, pop: 45 });

      const ctx: PricingContext = { teeTime, weather };
      const result = calculatePricing(ctx);

      expect(result.isBlocked).toBe(false);
      const weatherFactor = result.factors.find(f => f.code === 'WEATHER');
      expect(weatherFactor?.rate).toBe(0.10);
    });

    test('Scenario 4: Cloudy (no rain, POP 30~60%) → 5% discount', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 0, pop: 35 });

      const ctx: PricingContext = { teeTime, weather };
      const result = calculatePricing(ctx);

      expect(result.isBlocked).toBe(false);
      const weatherFactor = result.factors.find(f => f.code === 'WEATHER');
      expect(weatherFactor?.rate).toBe(0.05);
    });

    test('Scenario 5: Clear weather → No weather discount', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 0, pop: 10 });

      const ctx: PricingContext = { teeTime, weather };
      const result = calculatePricing(ctx);

      const weatherFactor = result.factors.find(f => f.code === 'WEATHER');
      expect(weatherFactor).toBeUndefined();
    });
  });

  describe('Time Layer (Urgency)', () => {
    test('Scenario 6: 100 mins before (Step 1) → 1 step discount', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 100 * 60 * 1000); // 100 mins
      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        base_price: 150000 // High price
      });

      const ctx: PricingContext = { teeTime, now };
      const result = calculatePricing(ctx);

      const timeFactor = result.factors.find(f => f.code === 'TIME_STEP');
      expect(timeFactor).toBeDefined();
      expect(timeFactor?.description).toContain('Step 1');
      expect(timeFactor?.amount).toBe(-10000); // >= 100k → 10k per step
    });

    test('Scenario 7: 70 mins before (Step 2) → 2 step discount', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 70 * 60 * 1000);
      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        base_price: 150000
      });

      const ctx: PricingContext = { teeTime, now };
      const result = calculatePricing(ctx);

      const timeFactor = result.factors.find(f => f.code === 'TIME_STEP');
      expect(timeFactor?.description).toContain('Step 2');
      expect(timeFactor?.amount).toBe(-20000); // 2 × 10k
    });

    test('Scenario 8: 40 mins before (Step 3) → 3 step discount', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 40 * 60 * 1000);
      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        base_price: 150000
      });

      const ctx: PricingContext = { teeTime, now };
      const result = calculatePricing(ctx);

      const timeFactor = result.factors.find(f => f.code === 'TIME_STEP');
      expect(timeFactor?.description).toContain('Step 3');
      expect(timeFactor?.amount).toBe(-30000); // 3 × 10k
    });

    test('Scenario 9: Low price (< 100k) → 5k per step', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 70 * 60 * 1000);
      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        base_price: 80000 // Low price
      });

      const ctx: PricingContext = { teeTime, now };
      const result = calculatePricing(ctx);

      const timeFactor = result.factors.find(f => f.code === 'TIME_STEP');
      expect(timeFactor?.amount).toBe(-10000); // 2 × 5k (Step 2)
    });
  });

  describe('Sales Layer (Slot Occupancy)', () => {
    test('Scenario 10: High occupancy (75%) → No sales discount', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContext = {
        teeTime,
        slotSalesRate: 0.75
      };

      const result = calculatePricing(ctx);

      const salesFactor = result.factors.find(f => f.code === 'SALES');
      expect(salesFactor).toBeUndefined();
      expect(result.isPanicCandidate).toBe(false);
    });

    test('Scenario 11: Medium occupancy (50%) → 5% discount', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContext = {
        teeTime,
        slotSalesRate: 0.50
      };

      const result = calculatePricing(ctx);

      const salesFactor = result.factors.find(f => f.code === 'SALES');
      expect(salesFactor?.rate).toBe(0.05);
      expect(result.isPanicCandidate).toBe(false);
    });

    test('Scenario 12: Low occupancy (30%) → 10% discount + panic', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContext = {
        teeTime,
        slotSalesRate: 0.30
      };

      const result = calculatePricing(ctx);

      const salesFactor = result.factors.find(f => f.code === 'SALES');
      expect(salesFactor?.rate).toBe(0.10);
      expect(result.isPanicCandidate).toBe(true); // Sales-based panic
    });
  });

  describe('Combined Scenarios', () => {
    test('Scenario 13: Perfect storm → Multiple discounts', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 70 * 60 * 1000); // 70 mins (Step 2)

      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        base_price: 150000
      });

      const weather = createMockWeather({ rn1: 3, pop: 50 }); // 10% weather discount
      const user = createMockUser({ segment: 'PRESTIGE' }); // 5% VIP

      const ctx: PricingContext = {
        teeTime,
        weather,
        user,
        userDistanceKm: 10, // 10% LBS
        slotSalesRate: 0.35, // 10% sales
        now
      };

      const result = calculatePricing(ctx);

      // Expected factors:
      // 1. TIME_STEP: -20,000 (Step 2, 2 × 10k)
      // 2. WEATHER: 10% of (150,000 - 20,000) = -13,000
      // 3. SALES: 10% of (130,000 - 13,000) = -11,700
      // 4. VIP_STATUS: 5% of (117,000 - 11,700) = -5,265
      // 5. LBS_NEARBY: 10% of (105,300 - 5,265) = -10,003
      // Total discount: ~60,000+ → Exceeds 40% cap
      // Max discount: 150,000 × 0.4 = 60,000
      // Final price: 90,000

      expect(result.discountRate).toBeLessThanOrEqual(0.40); // Cap enforced
      expect(result.finalPrice).toBeGreaterThanOrEqual(90000);
      expect(result.factors.find(f => f.code === 'MAX_CAP')).toBeDefined();
    });

    test('Scenario 14: Panic candidate detection', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 25 * 60 * 1000); // 25 mins

      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        status: 'OPEN'
      });

      const ctx: PricingContext = {
        teeTime,
        slotSalesRate: 0.35, // Low occupancy
        now
      };

      const result = calculatePricing(ctx);

      expect(result.isPanicCandidate).toBe(true);
      expect(result.panicReason).toBeDefined();
    });

    test('Scenario 15: Already booked → No panic', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 25 * 60 * 1000);

      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        status: 'BOOKED' // Not OPEN
      });

      const ctx: PricingContext = {
        teeTime,
        slotSalesRate: 0.35,
        now
      };

      const result = calculatePricing(ctx);

      expect(result.isPanicCandidate).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('Scenario 16: No context data → Base price only', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContext = { teeTime };

      const result = calculatePricing(ctx);

      expect(result.finalPrice).toBe(120000);
      expect(result.discountRate).toBe(0);
      expect(result.factors.length).toBe(0);
    });

    test('Scenario 17: Extreme discounts hit cap', () => {
      const now = new Date();
      const teeOff = new Date(now.getTime() + 40 * 60 * 1000);

      const teeTime = createMockTeeTime({
        tee_off: teeOff.toISOString(),
        base_price: 100000
      });

      const weather = createMockWeather({ rn1: 7, pop: 70 }); // 20%
      const user = createMockUser({ segment: 'PRESTIGE' }); // 5%

      const ctx: PricingContext = {
        teeTime,
        weather,
        user,
        userDistanceKm: 5, // 10%
        slotSalesRate: 0.20, // 10%
        now
      };

      const result = calculatePricing(ctx);

      // All discounts combined would exceed 40%
      expect(result.discountRate).toBe(0.40);
      expect(result.finalPrice).toBe(60000); // 100,000 × 0.6
      expect(result.factors.find(f => f.code === 'MAX_CAP')).toBeDefined();
    });
  });
});

// =====================================================
// Manual Test Examples (Copy to console)
// =====================================================

/**
 * Example 1: Test weather blocking
 */
function exampleWeatherBlocking() {
  const teeTime = createMockTeeTime();
  const weather = createMockWeather({ rn1: 12, pop: 80 });

  const result = calculatePricing({ teeTime, weather });
  console.log('Example 1: Weather Blocking');
  console.log('Result:', result);
  console.log('Expected: isBlocked = true, blockReason = WEATHER_STORM');
}

/**
 * Example 2: Test time urgency discount
 */
function exampleTimeUrgency() {
  const now = new Date();
  const teeOff = new Date(now.getTime() + 70 * 60 * 1000);
  const teeTime = createMockTeeTime({ tee_off: teeOff.toISOString(), base_price: 150000 });

  const result = calculatePricing({ teeTime, now });
  console.log('Example 2: Time Urgency (70 mins, Step 2)');
  console.log('Result:', result);
  console.log('Expected: TIME_STEP factor with amount = -20000');
}

/**
 * Example 3: Test panic candidate
 */
function examplePanicCandidate() {
  const now = new Date();
  const teeOff = new Date(now.getTime() + 25 * 60 * 1000);
  const teeTime = createMockTeeTime({ tee_off: teeOff.toISOString(), status: 'OPEN' });

  const result = calculatePricing({ teeTime, slotSalesRate: 0.30, now });
  console.log('Example 3: Panic Candidate');
  console.log('Result:', result);
  console.log('Expected: isPanicCandidate = true');
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).pricingTests = {
    exampleWeatherBlocking,
    exampleTimeUrgency,
    examplePanicCandidate
  };
}
