/**
 * SDD-10: Pricing Engine with Data-Driven Discounts
 *
 * STATUS: FUTURE - Not used in production. Requires tee_time_stats table with 30+ days of data.
 * Active version: pricingEngine.ts (V1)
 *
 * Extends V3 pricing engine with:
 * - Historical tee_time_stats integration
 * - Dynamic vacancy/booking rate adjustments
 * - Segment-specific pricing logic
 * - Maintains deterministic seeded random
 * - 40% revenue protection cap
 */

import type {
  PricingEngineV2Input,
  PricingEngineV2Output,
  DataDrivenAdjustment,
  TeeTimeStats,
  SegmentType,
} from '@/types/sdd10-database';
import type { Database } from '@/types/database';

// Re-export V3 types for compatibility
export type { PricingContextV2 as PricingContext } from './pricingEngineV3';
export type { PricingResultV2 as PricingResult } from './pricingEngineV3';

// Import existing V3 engine
import { calculatePricingV2 } from './pricingEngineV3';
import type { PricingContextV2 } from './pricingEngineV3';

// ============================================================================
// SDD-10 CONFIGURATION
// ============================================================================

const SDD10_CONFIG = {
  // Data-driven adjustment limits
  MAX_DATA_ADJUSTMENT: 0.15, // Max ±15% from data insights

  // Vacancy thresholds
  VACANCY_HIGH: 0.70, // 70%+ vacancy → discount
  VACANCY_LOW: 0.30, // <30% vacancy → premium

  // Booking rate thresholds
  BOOKING_RATE_LOW: 0.20, // <20% conversion → discount
  BOOKING_RATE_HIGH: 0.60, // 60%+ conversion → premium

  // Segment modifiers
  CHERRY_VACANCY_THRESHOLD: 0.60, // Trigger cherry-specific deals
  PRESTIGE_SCARCITY_THRESHOLD: 0.30, // Prestige premium trigger
} as const;

// ============================================================================
// SEEDED RANDOM (Deterministic)
// ============================================================================

function getSeededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ============================================================================
// DATA-DRIVEN ADJUSTMENT LAYER
// ============================================================================

/**
 * Calculate data-driven price adjustment based on historical stats
 * This layer runs AFTER the V3 pricing engine
 */
export function calculateDataDrivenAdjustment(
  stats: TeeTimeStats | undefined,
  baseContext: {
    segment?: SegmentType;
    hasWeatherDiscount: boolean;
    hasLBSDiscount: boolean;
    currentDiscountRate: number;
  }
): DataDrivenAdjustment {
  const adjustment: DataDrivenAdjustment = {
    base_adjustment: 0,
    vacancy_factor: 0,
    booking_rate_factor: 0,
    segment_factor: 0,
    weather_factor: 0,
    lbs_factor: 0,
    final_adjustment: 0,
    reasons: [],
  };

  // No stats available → no data-driven adjustment
  if (!stats) {
    return adjustment;
  }

  // ===== 1. VACANCY RATE ADJUSTMENT =====
  // High vacancy → increase discount to fill slots
  if (stats.vacancy_rate >= SDD10_CONFIG.VACANCY_HIGH) {
    const vacancyDiscount = Math.min(
      (stats.vacancy_rate - 0.5) * 0.20, // Scale: 50% = 0%, 100% = 10%
      0.10
    );
    adjustment.vacancy_factor = vacancyDiscount;
    adjustment.reasons.push(
      `공실률 높음 (${(stats.vacancy_rate * 100).toFixed(0)}%) → ${(vacancyDiscount * 100).toFixed(0)}% 추가 할인`
    );
  }

  // Low vacancy → reduce discount (premium pricing)
  if (stats.vacancy_rate < SDD10_CONFIG.VACANCY_LOW) {
    const vacancyPremium = Math.min(
      (SDD10_CONFIG.VACANCY_LOW - stats.vacancy_rate) * 0.15,
      0.05
    );
    adjustment.vacancy_factor = -vacancyPremium;
    adjustment.reasons.push(
      `인기 시간대 (공실 ${(stats.vacancy_rate * 100).toFixed(0)}%) → 프리미엄 적용`
    );
  }

  // ===== 2. BOOKING RATE ADJUSTMENT =====
  // Low booking rate → increase discount to improve conversion
  if (stats.booking_rate < SDD10_CONFIG.BOOKING_RATE_LOW) {
    const bookingDiscount = Math.min(
      (SDD10_CONFIG.BOOKING_RATE_LOW - stats.booking_rate) * 0.25,
      0.08
    );
    adjustment.booking_rate_factor = bookingDiscount;
    adjustment.reasons.push(
      `예약 전환율 낮음 (${(stats.booking_rate * 100).toFixed(0)}%) → 전환 촉진 할인`
    );
  }

  // High booking rate → reduce discount (demand is strong)
  if (stats.booking_rate >= SDD10_CONFIG.BOOKING_RATE_HIGH) {
    const bookingPremium = Math.min(
      (stats.booking_rate - SDD10_CONFIG.BOOKING_RATE_HIGH) * 0.10,
      0.03
    );
    adjustment.booking_rate_factor = -bookingPremium;
    adjustment.reasons.push(
      `전환율 높음 (${(stats.booking_rate * 100).toFixed(0)}%) → 할인 축소`
    );
  }

  // ===== 3. SEGMENT SYNERGY =====
  // CHERRY segment + high vacancy → extra discount (clear inventory)
  if (
    baseContext.segment === 'CHERRY' &&
    stats.vacancy_rate >= SDD10_CONFIG.CHERRY_VACANCY_THRESHOLD
  ) {
    adjustment.segment_factor = 0.05;
    adjustment.reasons.push(
      `CHERRY 특별 딜 (재고 소진 프로모션)`
    );
  }

  // PRESTIGE segment + low vacancy → slight premium (exclusivity)
  if (
    baseContext.segment === 'PRESTIGE' &&
    stats.vacancy_rate < SDD10_CONFIG.PRESTIGE_SCARCITY_THRESHOLD
  ) {
    adjustment.segment_factor = -0.03;
    adjustment.reasons.push(
      `PRESTIGE 프리미엄 슬롯`
    );
  }

  // SMART segment + moderate vacancy → bonus loyalty discount
  if (
    baseContext.segment === 'SMART' &&
    stats.vacancy_rate >= 0.40 &&
    stats.vacancy_rate < 0.70
  ) {
    adjustment.segment_factor = 0.02;
    adjustment.reasons.push(
      `SMART 로열티 보너스`
    );
  }

  // ===== 4. WEATHER SYNERGY =====
  // Weather discount active + high historical no-show rate → reduce weather discount
  if (
    baseContext.hasWeatherDiscount &&
    stats.no_show_rate > 0.15
  ) {
    adjustment.weather_factor = -0.05;
    adjustment.reasons.push(
      `우천 노쇼 리스크 반영 (과거 노쇼율 ${(stats.no_show_rate * 100).toFixed(0)}%)`
    );
  }

  // ===== 5. LBS SYNERGY =====
  // User nearby + low booking rate → extra incentive for nearby users
  if (
    baseContext.hasLBSDiscount &&
    stats.booking_rate < 0.25
  ) {
    adjustment.lbs_factor = 0.03;
    adjustment.reasons.push(
      `근거리 고객 특별 혜택`
    );
  }

  // ===== 6. CALCULATE TOTAL ADJUSTMENT =====
  adjustment.base_adjustment =
    adjustment.vacancy_factor +
    adjustment.booking_rate_factor +
    adjustment.segment_factor +
    adjustment.weather_factor +
    adjustment.lbs_factor;

  // Cap at max adjustment limit
  adjustment.final_adjustment = Math.max(
    Math.min(adjustment.base_adjustment, SDD10_CONFIG.MAX_DATA_ADJUSTMENT),
    -SDD10_CONFIG.MAX_DATA_ADJUSTMENT
  );

  return adjustment;
}

// ============================================================================
// SDD-10 ENHANCED PRICING ENGINE
// ============================================================================

/**
 * Main pricing function that integrates V3 engine + SDD-10 data-driven layer
 */
export function calculatePricingSDD10(input: PricingEngineV2Input): PricingEngineV2Output {
  const { teeTime, user, weather, stats } = input;

  // ===== STEP 1: Run V3 Pricing Engine =====
  const normalizedTeeTime: Database['public']['Tables']['tee_times']['Row'] = {
    id: teeTime.id,
    golf_club_id: teeTime.golf_club_id,
    tee_off: teeTime.tee_off,
    base_price: teeTime.base_price,
    status: 'OPEN',
    weather_condition: null,
    reserved_by: null,
    reserved_at: null,
    updated_by: null,
    updated_at: null,
  };

  const normalizedUser = user
    ? ({ segment: user.segment_type } as unknown as Database['public']['Tables']['users']['Row'])
    : undefined;

  const normalizedWeather = weather
    ? ({
      id: 1,
      target_date: teeTime.tee_off.split('T')[0],
      target_hour: new Date(teeTime.tee_off).getHours(),
      pop: weather.pop,
      rn1: weather.rn1,
      wsd: weather.wsd,
    } as Database['public']['Tables']['weather_cache']['Row'])
    : undefined;

  const v3Context: PricingContextV2 = {
    teeTime: normalizedTeeTime,
    user: normalizedUser,
    weather: normalizedWeather,
    userDistanceKm: user?.location_lat && user?.location_lng ?
      calculateDistanceFromClub(user.location_lat, user.location_lng) : undefined,
  };

  const v3Result = calculatePricingV2(v3Context);

  // ===== STEP 2: Apply Data-Driven Adjustment =====
  const dataDrivenContext = {
    segment: user?.segment_type,
    hasWeatherDiscount: v3Result.breakdown.layers.percentDiscounts.weather.rate > 0,
    hasLBSDiscount: v3Result.breakdown.layers.percentDiscounts.lbs.rate > 0,
    currentDiscountRate: v3Result.breakdown.totalDiscountRate,
  };

  const dataAdjustment = calculateDataDrivenAdjustment(stats, dataDrivenContext);

  // ===== STEP 3: Calculate Final Price with Data Adjustment =====
  const basePrice = teeTime.base_price;
  const v3DiscountAmount = basePrice - v3Result.finalPrice;
  const dataAdjustmentAmount = Math.round(basePrice * dataAdjustment.final_adjustment);
  const totalDiscountAmount = v3DiscountAmount + dataAdjustmentAmount;

  // Apply 40% revenue protection cap
  const MAX_DISCOUNT = 0.40;
  const cappedDiscountAmount = Math.min(totalDiscountAmount, basePrice * MAX_DISCOUNT);
  const finalPrice = Math.max(basePrice - cappedDiscountAmount, basePrice * 0.60);

  const totalDiscountRate = cappedDiscountAmount / basePrice;

  // ===== STEP 4: Build Enhanced Breakdown =====
  const reasons: string[] = [];

  // Add V3 reasons (extract from description fields)
  if (v3Result.breakdown.layers.percentDiscounts.weather.rate > 0) {
    reasons.push(v3Result.breakdown.layers.percentDiscounts.weather.description);
  }
  if (v3Result.breakdown.layers.step.stepLevel > 0) {
    reasons.push(v3Result.breakdown.layers.step.description);
  }
  if (v3Result.breakdown.layers.percentDiscounts.lbs.rate > 0) {
    reasons.push(v3Result.breakdown.layers.percentDiscounts.lbs.description);
  }
  if (v3Result.breakdown.layers.percentDiscounts.segment.rate > 0) {
    reasons.push(v3Result.breakdown.layers.percentDiscounts.segment.description);
  }

  // Add data-driven reasons
  reasons.push(...dataAdjustment.reasons);

  if (totalDiscountAmount > cappedDiscountAmount) {
    reasons.push(`최대 할인 적용 (${MAX_DISCOUNT * 100}%)`);
  }

  return {
    final_price: Math.round(finalPrice),
    base_price: basePrice,
    total_discount_rate: totalDiscountRate,
    breakdown: {
      weather_discount: v3Result.breakdown.layers.percentDiscounts.weather.rate,
      time_discount: v3Result.breakdown.layers.step.stepAmount / basePrice,
      lbs_discount: v3Result.breakdown.layers.percentDiscounts.lbs.rate,
      segment_discount: v3Result.breakdown.layers.percentDiscounts.segment.rate,
      data_driven_adjustment: dataAdjustment.final_adjustment,
    },
    data_driven_details: dataAdjustment,
    reasons,
  };
}

// ============================================================================
// HELPER: Distance Calculation
// ============================================================================

function calculateDistanceFromClub(userLat: number, userLng: number): number {
  // Club 72 coordinates (Incheon)
  const clubLat = 37.4563;
  const clubLng = 126.7052;

  const R = 6371; // Earth radius in km
  const dLat = ((clubLat - userLat) * Math.PI) / 180;
  const dLng = ((clubLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((clubLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// MOCK STATS GENERATOR (for development)
// ============================================================================

/**
 * Generate mock tee time stats for development/testing
 * Uses deterministic seeded random
 */
export function generateMockStats(teeTimeId: number): TeeTimeStats {
  const seed = teeTimeId;
  const random1 = getSeededRandom(seed);
  const random2 = getSeededRandom(seed * 2);
  const random3 = getSeededRandom(seed * 3);

  return {
    id: teeTimeId,
    tee_time_id: teeTimeId,
    golf_club_id: 1,
    day_of_week: Math.floor(random1 * 7),
    hour_of_day: 10 + Math.floor(random1 * 8), // 10-17
    is_weekend: random1 > 0.7,
    is_holiday: false,
    total_views: Math.floor(random1 * 100) + 50,
    total_bookings: Math.floor(random2 * 50) + 10,
    total_cancellations: Math.floor(random1 * 5),
    total_no_shows: Math.floor(random1 * 3),
    avg_final_price: 80000 + Math.floor(random2 * 20000),
    avg_discount_rate: random1 * 0.3,
    base_price: 100000,
    booking_rate: random2 * 0.5, // 0-50%
    vacancy_rate: random3 * 0.8, // 0-80%
    no_show_rate: random1 * 0.1, // 0-10%
    calculated_at: new Date().toISOString(),
    stats_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    stats_period_end: new Date().toISOString(),
  };
}
