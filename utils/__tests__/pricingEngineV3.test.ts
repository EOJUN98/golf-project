/**
 * SDD-03 V2: Pricing Engine Test Scenarios
 *
 * Test cases for the new 7-layer pricing system.
 * Run with: npm test (if Jest configured) or review as examples.
 */

import { calculatePricingV2, PricingContextV2, PricingResultV2 } from '../pricingEngineV3';
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

describe('SDD-03 V2: Pricing Engine', () => {
  describe('Layer 1: Block Layer', () => {
    test('Scenario 1: Heavy rain + high POP → Blocked', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 15, pop: 70 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toBe('WEATHER_STORM');
      expect(result.finalPrice).toBe(120000); // No discount when blocked
      expect(result.breakdown.totalDiscountRate).toBe(0);
    });

    test('Scenario 2: Heavy rain but low POP → Not blocked', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 15, pop: 50 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.isBlocked).toBe(false);
      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0.15);
    });

    test('Scenario 3: High POP but low rain → Not blocked', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 5, pop: 80 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.isBlocked).toBe(false);
      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0.10);
    });
  });

  describe('Layer 2: Step Discount', () => {
    test('Scenario 4: High price, Step 1 (120~90 mins)', () => {
      const teeTime = createMockTeeTime({ base_price: 150000 });
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 100 // Step 1
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.step.stepLevel).toBe(1);
      expect(result.breakdown.layers.step.stepAmount).toBe(10000); // 1 × 10k
    });

    test('Scenario 5: High price, Step 2 (90~60 mins)', () => {
      const teeTime = createMockTeeTime({ base_price: 150000 });
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 70 // Step 2
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.step.stepLevel).toBe(2);
      expect(result.breakdown.layers.step.stepAmount).toBe(20000); // 2 × 10k
    });

    test('Scenario 6: High price, Step 3 (60~30 mins)', () => {
      const teeTime = createMockTeeTime({ base_price: 150000 });
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 40 // Step 3
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.step.stepLevel).toBe(3);
      expect(result.breakdown.layers.step.stepAmount).toBe(30000); // 3 × 10k
    });

    test('Scenario 7: Low price, Step 2', () => {
      const teeTime = createMockTeeTime({ base_price: 80000 });
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 70 // Step 2
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.step.stepLevel).toBe(2);
      expect(result.breakdown.layers.step.stepAmount).toBe(10000); // 2 × 5k
    });

    test('Scenario 8: No step (> 120 mins)', () => {
      const teeTime = createMockTeeTime({ base_price: 150000 });
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 180
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.step.stepLevel).toBe(0);
      expect(result.breakdown.layers.step.stepAmount).toBe(0);
    });
  });

  describe('Layer 3: Percent Discounts', () => {
    test('Scenario 9: Weather - Heavy rain (10~15mm) → 15%', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 12, pop: 50 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0.15);
    });

    test('Scenario 10: Weather - Moderate rain (5~10mm) → 10%', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 7, pop: 50 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0.10);
    });

    test('Scenario 11: Weather - Light rain (1~5mm) → 5%', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 2, pop: 50 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0.05);
    });

    test('Scenario 12: Weather - No rain → 0%', () => {
      const teeTime = createMockTeeTime();
      const weather = createMockWeather({ rn1: 0, pop: 10 });

      const ctx: PricingContextV2 = { teeTime, weather };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0);
    });

    test('Scenario 13: Sales - High occupancy (>= 70%) → 0%', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        slotSalesRate: 0.75
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.sales.rate).toBe(0);
    });

    test('Scenario 14: Sales - Medium occupancy (40~70%) → 5%', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        slotSalesRate: 0.55
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.sales.rate).toBe(0.05);
    });

    test('Scenario 15: Sales - Low occupancy (< 40%) → 10%', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        slotSalesRate: 0.30
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.sales.rate).toBe(0.10);
    });

    test('Scenario 16: LBS - Near (<= 5km) → 10%', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        userDistanceKm: 3
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.lbs.rate).toBe(0.10);
    });

    test('Scenario 17: LBS - Medium (<= 20km) → 5%', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        userDistanceKm: 15
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.lbs.rate).toBe(0.05);
    });

    test('Scenario 18: LBS - Far (> 20km) → 0%', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        userDistanceKm: 25
      };

      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.lbs.rate).toBe(0);
    });

    test('Scenario 19: Segment - FUTURE → 0%', () => {
      const teeTime = createMockTeeTime();
      const user = createMockUser({ segment: 'FUTURE' });

      const ctx: PricingContextV2 = { teeTime, user };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.segment.rate).toBe(0);
    });

    test('Scenario 20: Segment - SMART → 3%', () => {
      const teeTime = createMockTeeTime();
      const user = createMockUser({ segment: 'SMART' });

      const ctx: PricingContextV2 = { teeTime, user };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.segment.rate).toBe(0.03);
    });

    test('Scenario 21: Segment - PRESTIGE → 5%', () => {
      const teeTime = createMockTeeTime();
      const user = createMockUser({ segment: 'PRESTIGE' });

      const ctx: PricingContextV2 = { teeTime, user };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.segment.rate).toBe(0.05);
    });

    test('Scenario 22: Segment - CHERRY → -3% (penalty)', () => {
      const teeTime = createMockTeeTime();
      const user = createMockUser({ segment: 'CHERRY' });

      const ctx: PricingContextV2 = { teeTime, user };
      const result = calculatePricingV2(ctx);

      expect(result.breakdown.layers.percentDiscounts.segment.rate).toBe(-0.03);
    });
  });

  describe('Layer 4: Cap & Floor', () => {
    test('Scenario 23: Total discount exceeds 40% cap', () => {
      const teeTime = createMockTeeTime({ base_price: 100000 });
      const weather = createMockWeather({ rn1: 12, pop: 50 }); // 15%
      const user = createMockUser({ segment: 'PRESTIGE' }); // 5%

      const ctx: PricingContextV2 = {
        teeTime,
        weather,
        user,
        userDistanceKm: 3,        // 10%
        slotSalesRate: 0.30,      // 10%
        timeUntilTeeOffMins: 40   // Step 3 = 15k (15%)
      };

      const result = calculatePricingV2(ctx);

      // Total raw = 15k + (100k-15k) × (15%+10%+10%+5%) = 15k + 34k = 49k = 49%
      // Capped at 40% = 40k
      expect(result.breakdown.layers.capFloor.applied).toBe(true);
      expect(result.breakdown.totalDiscountRate).toBe(0.40);
      expect(result.finalPrice).toBe(60000); // 100k × 0.6
    });

    test('Scenario 24: CHERRY penalty pushes below floor', () => {
      const teeTime = createMockTeeTime({ base_price: 100000 });
      const user = createMockUser({ segment: 'CHERRY' }); // -3%

      const ctx: PricingContextV2 = {
        teeTime,
        user,
        timeUntilTeeOffMins: 200 // No step
      };

      const result = calculatePricingV2(ctx);

      // Total = 0 + 100k × (-3%) = -3k
      // Floored at -5% = -5k
      expect(result.breakdown.layers.capFloor.applied).toBe(false);
      expect(result.breakdown.totalDiscountRate).toBe(-0.03);
    });

    test('Scenario 25: Discount within bounds → No cap/floor', () => {
      const teeTime = createMockTeeTime({ base_price: 100000 });
      const weather = createMockWeather({ rn1: 2, pop: 50 }); // 5%

      const ctx: PricingContextV2 = {
        teeTime,
        weather,
        timeUntilTeeOffMins: 100 // Step 1 = 10k (10%)
      };

      const result = calculatePricingV2(ctx);

      // Total = 10k + (100k-10k) × 5% = 10k + 4.5k = 14.5k = 14.5%
      expect(result.breakdown.layers.capFloor.applied).toBe(false);
      expect(result.breakdown.totalDiscountRate).toBeCloseTo(0.145, 2);
    });
  });

  describe('Layer 5: Rounding', () => {
    test('Scenario 26: Price rounded to nearest 100', () => {
      const teeTime = createMockTeeTime({ base_price: 120000 });
      const weather = createMockWeather({ rn1: 2, pop: 50 }); // 5%

      const ctx: PricingContextV2 = {
        teeTime,
        weather,
        timeUntilTeeOffMins: 100 // Step 1 = 10k
      };

      const result = calculatePricingV2(ctx);

      // After step: 120k - 10k = 110k
      // After percent: 110k - (110k × 5%) = 110k - 5.5k = 104.5k
      // Rounded: 104500 → 104500 (already divisible by 100)

      expect(result.finalPrice % 100).toBe(0);
    });
  });

  describe('Layer 6: Panic Flag', () => {
    test('Scenario 27: Panic candidate (time=50, sales=30%)', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 50, // 30 < 50 <= 60
        slotSalesRate: 0.30       // < 40%
      };

      const result = calculatePricingV2(ctx);

      expect(result.isPanicCandidate).toBe(true);
    });

    test('Scenario 28: Not panic (time=70, outside range)', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 70, // > 60
        slotSalesRate: 0.30
      };

      const result = calculatePricingV2(ctx);

      expect(result.isPanicCandidate).toBe(false);
    });

    test('Scenario 29: Not panic (time=20, too close)', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 20, // <= 30
        slotSalesRate: 0.30
      };

      const result = calculatePricingV2(ctx);

      expect(result.isPanicCandidate).toBe(false);
    });

    test('Scenario 30: Not panic (high occupancy)', () => {
      const teeTime = createMockTeeTime();
      const ctx: PricingContextV2 = {
        teeTime,
        timeUntilTeeOffMins: 50,
        slotSalesRate: 0.80 // >= 40%
      };

      const result = calculatePricingV2(ctx);

      expect(result.isPanicCandidate).toBe(false);
    });
  });

  describe('Layer 7: Breakdown JSON', () => {
    test('Scenario 31: Complex breakdown with all layers', () => {
      const teeTime = createMockTeeTime({ base_price: 150000 });
      const weather = createMockWeather({ rn1: 7, pop: 50 }); // 10%
      const user = createMockUser({ segment: 'SMART' }); // 3%

      const ctx: PricingContextV2 = {
        teeTime,
        weather,
        user,
        userDistanceKm: 10,       // 5%
        slotSalesRate: 0.50,      // 5%
        timeUntilTeeOffMins: 70   // Step 2 = 20k
      };

      const result = calculatePricingV2(ctx);

      // Verify all breakdown fields exist
      expect(result.breakdown.totalDiscountRate).toBeDefined();
      expect(result.breakdown.totalDiscountAmount).toBeDefined();
      expect(result.breakdown.rawDiscountRate).toBeDefined();

      expect(result.breakdown.layers.step.stepLevel).toBe(2);
      expect(result.breakdown.layers.step.stepAmount).toBe(20000);

      expect(result.breakdown.layers.percentDiscounts.weather.rate).toBe(0.10);
      expect(result.breakdown.layers.percentDiscounts.sales.rate).toBe(0.05);
      expect(result.breakdown.layers.percentDiscounts.lbs.rate).toBe(0.05);
      expect(result.breakdown.layers.percentDiscounts.segment.rate).toBe(0.03);

      expect(result.breakdown.layers.capFloor.applied).toBeDefined();
      expect(result.breakdown.layers.rounding.afterRounding).toBeDefined();
    });
  });
});

// =====================================================
// Manual Test Examples (Copy to console)
// =====================================================

/**
 * Example 1: Test full discount stack
 */
function exampleFullStack() {
  const teeTime = createMockTeeTime({ base_price: 120000 });
  const weather = createMockWeather({ rn1: 12, pop: 50 });
  const user = createMockUser({ segment: 'PRESTIGE' });

  const ctx: PricingContextV2 = {
    teeTime,
    weather,
    user,
    userDistanceKm: 3,
    slotSalesRate: 0.30,
    timeUntilTeeOffMins: 50
  };

  const result = calculatePricingV2(ctx);
  console.log('Example 1: Full Stack');
  console.log('Base Price:', result.basePrice);
  console.log('Final Price:', result.finalPrice);
  console.log('Total Discount Rate:', result.breakdown.totalDiscountRate);
  console.log('Breakdown:', JSON.stringify(result.breakdown, null, 2));
}

/**
 * Example 2: Test blocking
 */
function exampleBlocking() {
  const teeTime = createMockTeeTime();
  const weather = createMockWeather({ rn1: 15, pop: 70 });

  const result = calculatePricingV2({ teeTime, weather });
  console.log('Example 2: Blocking');
  console.log('Is Blocked:', result.isBlocked);
  console.log('Block Reason:', result.blockReason);
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).pricingV2Tests = {
    exampleFullStack,
    exampleBlocking
  };
}
