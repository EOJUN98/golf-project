/**
 * SDD-03 V2: Enhanced Pricing Engine V3
 *
 * STATUS: REFERENCE ONLY - Not used in production
 * Active version: pricingEngine.ts (V1)
 * Used by: pricingEngineSDD10.ts (future data-driven layer)
 *
 * Layer Order:
 * 1. Block Layer (Weather blocking)
 * 2. Step Discount (Fixed amount deductions)
 * 3. Percent Discount (Weather + Sales + LBS + Segment rates)
 * 4. Cap & Floor
 * 5. Final Rounding
 * 6. Panic Flag
 * 7. Breakdown JSON
 */

import { Database } from '../types/database';
import {
  BLOCK_CONFIG,
  STEP_CONFIG,
  WEATHER_RATE_CONFIG,
  SALES_RATE_CONFIG,
  LBS_RATE_CONFIG,
  SEGMENT_RATE_CONFIG,
  CAP_FLOOR_CONFIG,
  ROUNDING_CONFIG,
  PANIC_V2_CONFIG,
  SegmentType,
  roundToNearest,
  clamp
} from './pricingConfigV2';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type Weather = Database['public']['Tables']['weather_cache']['Row'];

// =====================================================
// Context & Result Types
// =====================================================

export interface PricingContextV2 {
  teeTime: TeeTime;
  user?: User;
  weather?: Weather | null;
  userDistanceKm?: number;      // For LBS calculation
  timeUntilTeeOffMins?: number; // Optional (calculated if not provided)
  slotSalesRate?: number;       // Booked / Total (0~1)
  now?: Date;                   // For testing/time travel
}

export interface DiscountBreakdown {
  totalDiscountRate: number;    // Final total rate (after cap/floor)
  totalDiscountAmount: number;  // Final total amount
  rawDiscountRate: number;      // Before cap/floor

  layers: {
    step: {
      stepLevel: number;        // 0, 1, 2, 3
      stepAmount: number;       // Fixed amount deducted
      description: string;
    };

    percentDiscounts: {
      weather: {
        rate: number;
        amount: number;
        description: string;
      };
      sales: {
        rate: number;
        amount: number;
        description: string;
      };
      lbs: {
        rate: number;
        amount: number;
        description: string;
      };
      segment: {
        rate: number;
        amount: number;
        description: string;
      };
    };

    capFloor: {
      applied: boolean;
      rawRate: number;
      cappedRate: number;
      description: string;
    };

    rounding: {
      beforeRounding: number;
      afterRounding: number;
      adjustment: number;
    };
  };
}

export interface PricingResultV2 {
  finalPrice: number;
  basePrice: number;

  isBlocked: boolean;
  blockReason?: string;

  isPanicCandidate: boolean;
  panicReason?: string;

  breakdown: DiscountBreakdown;
}

// =====================================================
// Layer 1: Block Layer
// =====================================================

/**
 * Check if tee time should be blocked due to weather
 */
function checkBlocking(weather?: Weather | null): {
  isBlocked: boolean;
  blockReason?: string;
} {
  if (!weather) {
    return { isBlocked: false };
  }

  const rn1 = weather.rn1 || 0;
  const pop = weather.pop || 0;

  // Block condition: RN1 >= 15mm AND POP >= 70%
  if (rn1 >= BLOCK_CONFIG.RAINFALL_THRESHOLD && pop >= BLOCK_CONFIG.POP_THRESHOLD) {
    return {
      isBlocked: true,
      blockReason: BLOCK_CONFIG.BLOCK_REASON
    };
  }

  return { isBlocked: false };
}

// =====================================================
// Layer 2: Step Discount (Fixed Amount)
// =====================================================

/**
 * Calculate step level and fixed discount amount
 */
function calculateStepDiscount(
  timeUntilTeeOffMins: number,
  basePrice: number
): {
  stepLevel: number;
  stepAmount: number;
  description: string;
} {
  // Determine step level based on time
  let stepLevel = 0;

  if (timeUntilTeeOffMins <= STEP_CONFIG.START_TIME && timeUntilTeeOffMins > STEP_CONFIG.STEP_1_END) {
    stepLevel = 1; // 120~90 mins
  } else if (timeUntilTeeOffMins <= STEP_CONFIG.STEP_1_END && timeUntilTeeOffMins > STEP_CONFIG.STEP_2_END) {
    stepLevel = 2; // 90~60 mins
  } else if (timeUntilTeeOffMins <= STEP_CONFIG.STEP_2_END && timeUntilTeeOffMins > STEP_CONFIG.STEP_3_END) {
    stepLevel = 3; // 60~30 mins
  }

  // Calculate step amount
  if (stepLevel === 0) {
    return {
      stepLevel: 0,
      stepAmount: 0,
      description: 'No Step Discount'
    };
  }

  const unitStepAmount = basePrice >= STEP_CONFIG.PRICE_THRESHOLD
    ? STEP_CONFIG.HIGH_STEP_AMOUNT
    : STEP_CONFIG.LOW_STEP_AMOUNT;

  const stepAmount = stepLevel * unitStepAmount;

  return {
    stepLevel,
    stepAmount,
    description: `Step ${stepLevel} Urgency (${stepAmount.toLocaleString()}원)`
  };
}

// =====================================================
// Layer 3: Percent Discounts
// =====================================================

/**
 * Calculate weather discount rate
 */
function calculateWeatherRate(weather?: Weather | null): {
  rate: number;
  description: string;
} {
  if (!weather) {
    return { rate: 0, description: 'No Weather Data' };
  }

  const rn1 = weather.rn1 || 0;

  // Check tiers (order matters: highest to lowest)
  if (rn1 >= WEATHER_RATE_CONFIG.TIER_HEAVY.minRainfall) {
    return {
      rate: WEATHER_RATE_CONFIG.TIER_HEAVY.rate,
      description: WEATHER_RATE_CONFIG.TIER_HEAVY.description
    };
  } else if (rn1 >= WEATHER_RATE_CONFIG.TIER_MODERATE.minRainfall) {
    return {
      rate: WEATHER_RATE_CONFIG.TIER_MODERATE.rate,
      description: WEATHER_RATE_CONFIG.TIER_MODERATE.description
    };
  } else if (rn1 >= WEATHER_RATE_CONFIG.TIER_LIGHT.minRainfall) {
    return {
      rate: WEATHER_RATE_CONFIG.TIER_LIGHT.rate,
      description: WEATHER_RATE_CONFIG.TIER_LIGHT.description
    };
  }

  return {
    rate: WEATHER_RATE_CONFIG.TIER_NONE.rate,
    description: WEATHER_RATE_CONFIG.TIER_NONE.description
  };
}

/**
 * Calculate sales discount rate
 */
function calculateSalesRate(slotSalesRate?: number): {
  rate: number;
  description: string;
} {
  if (slotSalesRate === undefined) {
    return { rate: 0, description: 'No Sales Data' };
  }

  if (slotSalesRate >= SALES_RATE_CONFIG.HIGH_OCCUPANCY) {
    return {
      rate: SALES_RATE_CONFIG.HIGH_RATE,
      description: SALES_RATE_CONFIG.HIGH_DESC
    };
  } else if (slotSalesRate >= SALES_RATE_CONFIG.MEDIUM_OCCUPANCY) {
    return {
      rate: SALES_RATE_CONFIG.MEDIUM_RATE,
      description: SALES_RATE_CONFIG.MEDIUM_DESC
    };
  } else {
    return {
      rate: SALES_RATE_CONFIG.LOW_RATE,
      description: SALES_RATE_CONFIG.LOW_DESC
    };
  }
}

/**
 * Calculate LBS discount rate
 */
function calculateLbsRate(userDistanceKm?: number): {
  rate: number;
  description: string;
} {
  if (userDistanceKm === undefined) {
    return { rate: 0, description: 'No Location Data' };
  }

  if (userDistanceKm <= LBS_RATE_CONFIG.NEAR_DISTANCE) {
    return {
      rate: LBS_RATE_CONFIG.NEAR_RATE,
      description: LBS_RATE_CONFIG.NEAR_DESC
    };
  } else if (userDistanceKm <= LBS_RATE_CONFIG.MEDIUM_DISTANCE) {
    return {
      rate: LBS_RATE_CONFIG.MEDIUM_RATE,
      description: LBS_RATE_CONFIG.MEDIUM_DESC
    };
  } else {
    return {
      rate: LBS_RATE_CONFIG.FAR_RATE,
      description: LBS_RATE_CONFIG.FAR_DESC
    };
  }
}

/**
 * Calculate segment discount rate
 */
function calculateSegmentRate(user?: User): {
  rate: number;
  description: string;
} {
  if (!user) {
    return { rate: 0, description: 'No User Segment' };
  }

  const segment = user.segment as SegmentType;
  const config = SEGMENT_RATE_CONFIG[segment];

  if (!config) {
    return { rate: 0, description: 'Unknown Segment' };
  }

  return {
    rate: config.rate,
    description: config.description
  };
}

// =====================================================
// Layer 6: Panic Flag
// =====================================================

/**
 * Determine if this is a panic candidate
 */
function calculatePanicFlag(
  timeUntilTeeOffMins: number,
  slotSalesRate: number | undefined,
  isBlocked: boolean
): {
  isPanic: boolean;
  panicReason?: string;
} {
  if (isBlocked) {
    return { isPanic: false };
  }

  // Panic condition: time <= 60 && time > 30 && salesRate < 0.4
  const timeCondition = timeUntilTeeOffMins <= PANIC_V2_CONFIG.MAX_TIME
    && timeUntilTeeOffMins > PANIC_V2_CONFIG.MIN_TIME;

  const salesCondition = slotSalesRate !== undefined
    && slotSalesRate < PANIC_V2_CONFIG.MAX_SALES_RATE;

  if (timeCondition && salesCondition) {
    return {
      isPanic: true,
      panicReason: PANIC_V2_CONFIG.PANIC_MESSAGE
    };
  }

  return { isPanic: false };
}

// =====================================================
// Main Pricing Engine
// =====================================================

export function calculatePricingV2(ctx: PricingContextV2): PricingResultV2 {
  const { teeTime, user, weather, userDistanceKm, slotSalesRate, now = new Date() } = ctx;
  const basePrice = teeTime.base_price;

  // Calculate time until tee-off
  const teeOff = new Date(teeTime.tee_off);
  const timeUntilTeeOffMins = ctx.timeUntilTeeOffMins !== undefined
    ? ctx.timeUntilTeeOffMins
    : (teeOff.getTime() - now.getTime()) / (1000 * 60);

  // ===== LAYER 1: Block Layer =====
  const blockResult = checkBlocking(weather);

  if (blockResult.isBlocked) {
    // If blocked, return immediately with no discounts
    return {
      finalPrice: basePrice,
      basePrice,
      isBlocked: true,
      blockReason: blockResult.blockReason,
      isPanicCandidate: false,
      breakdown: {
        totalDiscountRate: 0,
        totalDiscountAmount: 0,
        rawDiscountRate: 0,
        layers: {
          step: { stepLevel: 0, stepAmount: 0, description: 'Blocked' },
          percentDiscounts: {
            weather: { rate: 0, amount: 0, description: 'Blocked' },
            sales: { rate: 0, amount: 0, description: 'Blocked' },
            lbs: { rate: 0, amount: 0, description: 'Blocked' },
            segment: { rate: 0, amount: 0, description: 'Blocked' }
          },
          capFloor: {
            applied: false,
            rawRate: 0,
            cappedRate: 0,
            description: 'Blocked'
          },
          rounding: {
            beforeRounding: basePrice,
            afterRounding: basePrice,
            adjustment: 0
          }
        }
      }
    };
  }

  // ===== LAYER 2: Step Discount (Fixed) =====
  const stepResult = calculateStepDiscount(timeUntilTeeOffMins, basePrice);
  const priceAfterStep = basePrice - stepResult.stepAmount;

  // ===== LAYER 3: Percent Discounts =====
  const weatherRateResult = calculateWeatherRate(weather);
  const salesRateResult = calculateSalesRate(slotSalesRate);
  const lbsRateResult = calculateLbsRate(userDistanceKm);
  const segmentRateResult = calculateSegmentRate(user);

  // Sum all percent rates
  const totalPercentRate =
    weatherRateResult.rate +
    salesRateResult.rate +
    lbsRateResult.rate +
    segmentRateResult.rate;

  // Calculate percent discount amount (applied to price after step)
  const percentDiscountAmount = Math.floor(priceAfterStep * totalPercentRate);
  const priceAfterPercent = priceAfterStep - percentDiscountAmount;

  // Calculate total raw discount rate
  const totalRawDiscountAmount = stepResult.stepAmount + percentDiscountAmount;
  const rawDiscountRate = totalRawDiscountAmount / basePrice;

  // ===== LAYER 4: Cap & Floor =====
  const cappedRate = clamp(
    rawDiscountRate,
    CAP_FLOOR_CONFIG.MIN_DISCOUNT_RATE,
    CAP_FLOOR_CONFIG.MAX_DISCOUNT_RATE
  );

  const capApplied = cappedRate !== rawDiscountRate;
  const cappedDiscountAmount = Math.floor(basePrice * cappedRate);
  const priceAfterCap = basePrice - cappedDiscountAmount;

  // ===== LAYER 5: Final Rounding =====
  const roundedPrice = roundToNearest(priceAfterCap, ROUNDING_CONFIG.ROUND_TO);
  const roundingAdjustment = roundedPrice - priceAfterCap;

  // ===== LAYER 6: Panic Flag =====
  const panicResult = calculatePanicFlag(timeUntilTeeOffMins, slotSalesRate, false);

  // ===== LAYER 7: Build Breakdown =====
  const weatherAmount = Math.floor(priceAfterStep * weatherRateResult.rate);
  const salesAmount = Math.floor(priceAfterStep * salesRateResult.rate);
  const lbsAmount = Math.floor(priceAfterStep * lbsRateResult.rate);
  const segmentAmount = Math.floor(priceAfterStep * segmentRateResult.rate);

  const breakdown: DiscountBreakdown = {
    totalDiscountRate: cappedRate,
    totalDiscountAmount: cappedDiscountAmount,
    rawDiscountRate,

    layers: {
      step: {
        stepLevel: stepResult.stepLevel,
        stepAmount: stepResult.stepAmount,
        description: stepResult.description
      },

      percentDiscounts: {
        weather: {
          rate: weatherRateResult.rate,
          amount: weatherAmount,
          description: weatherRateResult.description
        },
        sales: {
          rate: salesRateResult.rate,
          amount: salesAmount,
          description: salesRateResult.description
        },
        lbs: {
          rate: lbsRateResult.rate,
          amount: lbsAmount,
          description: lbsRateResult.description
        },
        segment: {
          rate: segmentRateResult.rate,
          amount: segmentAmount,
          description: segmentRateResult.description
        }
      },

      capFloor: {
        applied: capApplied,
        rawRate: rawDiscountRate,
        cappedRate: cappedRate,
        description: capApplied
          ? (cappedRate >= rawDiscountRate
              ? CAP_FLOOR_CONFIG.MAX_CAP_DESC
              : CAP_FLOOR_CONFIG.MIN_FLOOR_DESC)
          : 'No Cap/Floor Applied'
      },

      rounding: {
        beforeRounding: priceAfterCap,
        afterRounding: roundedPrice,
        adjustment: roundingAdjustment
      }
    }
  };

  return {
    finalPrice: roundedPrice,
    basePrice,
    isBlocked: false,
    isPanicCandidate: panicResult.isPanic,
    panicReason: panicResult.panicReason,
    breakdown
  };
}

// =====================================================
// Helper: Calculate Slot Sales Rate
// =====================================================

/**
 * Calculate sales rate for a specific golf club and date
 * @param golfClubId - Golf club ID
 * @param date - Target date
 * @param supabase - Supabase client
 * @returns Sales rate (0~1) or undefined if error
 */
export async function calculateSlotSalesRateV2(
  golfClubId: number,
  date: Date,
  supabase: any
): Promise<number | undefined> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all tee times for this club on this date
    const { data: teeTimes, error } = await supabase
      .from('tee_times')
      .select('id, status')
      .eq('golf_club_id', golfClubId)
      .gte('tee_off', startOfDay.toISOString())
      .lte('tee_off', endOfDay.toISOString());

    if (error || !teeTimes) {
      console.error('[calculateSlotSalesRateV2] Error:', error);
      return undefined;
    }

    const totalSlots = teeTimes.length;
    const bookedSlots = teeTimes.filter((tt: any) => tt.status === 'BOOKED').length;

    if (totalSlots === 0) return 0;

    return bookedSlots / totalSlots;
  } catch (error) {
    console.error('[calculateSlotSalesRateV2] Exception:', error);
    return undefined;
  }
}
