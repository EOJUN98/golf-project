/**
 * SDD-03: Enhanced Pricing Engine V2
 *
 * STATUS: REFERENCE ONLY - Not used in production
 * Active version: pricingEngine.ts (V1)
 *
 * Features:
 * - Weather-based discounts and blocking
 * - Time-urgency step-down discounts
 * - Sales rate (slot occupancy) discounts
 * - Panic candidate detection
 * - Configurable discount rules
 * - 40% maximum discount cap
 */

import { Database, Json } from '../types/database';
import {
  WEATHER_CONFIG,
  TIME_CONFIG,
  SALES_CONFIG,
  PANIC_CONFIG,
  SEGMENT_CONFIG,
  LBS_CONFIG,
  GOVERNANCE_CONFIG
} from './pricingConfig';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type Weather = Database['public']['Tables']['weather_cache']['Row'];

// =====================================================
// Extended Context & Result Types
// =====================================================

export interface PricingContext {
  teeTime: TeeTime;
  user?: User;
  weather?: Weather | null;
  userDistanceKm?: number; // LBS

  // SDD-03: New fields
  timeUntilTeeOffMins?: number;  // Calculated or provided
  slotSalesRate?: number;         // 0~1 (booked slots / total slots)

  now?: Date; // For testing/time travel
}

export interface PricingResult {
  finalPrice: number;
  basePrice: number;
  discountRate: number;
  isBlocked: boolean;
  blockReason?: string;

  factors: {
    code: string;
    description: string;
    amount: number;      // Negative for discounts, positive for caps
    rate: number;        // Percentage (0.1 = 10%)
  }[];

  // SDD-03: New fields
  isPanicCandidate: boolean;  // Should create notification?
  panicReason?: string;

  stepStatus?: {
    currentStep: number; // 0, 1, 2, 3
    nextStepAt?: string;
  };

  // Deprecated: Use isPanicCandidate instead
  panicMode?: {
    active: boolean;
    minutesLeft: number;
    reason: string;
  };
}

// =====================================================
// Weather Layer
// =====================================================

function applyWeatherDiscount(
  ctx: PricingContext,
  currentPrice: number,
  factors: PricingResult['factors']
): { price: number; isBlocked: boolean; blockReason?: string } {
  const { weather } = ctx;

  if (!weather) {
    return { price: currentPrice, isBlocked: false };
  }

  const rn1 = weather.rn1 || 0;
  const pop = weather.pop || 0;

  // 1. Check blocking condition (safety first)
  if (rn1 >= WEATHER_CONFIG.BLOCK_RAINFALL_MM) {
    return {
      price: currentPrice,
      isBlocked: true,
      blockReason: 'WEATHER_STORM'
    };
  }

  // 2. Apply discount based on tiers (highest tier first)
  for (const tier of WEATHER_CONFIG.TIERS) {
    if (rn1 >= tier.minRainfall && pop >= tier.minPop) {
      const discountAmount = Math.floor(currentPrice * tier.discountRate);
      factors.push({
        code: 'WEATHER',
        description: tier.description,
        amount: -discountAmount,
        rate: tier.discountRate
      });
      return {
        price: currentPrice - discountAmount,
        isBlocked: false
      };
    }
  }

  return { price: currentPrice, isBlocked: false };
}

// =====================================================
// Time Layer (Urgency)
// =====================================================

function applyTimeDiscount(
  ctx: PricingContext,
  currentPrice: number,
  basePrice: number,
  factors: PricingResult['factors']
): { price: number; stepLevel: number } {
  const { teeTime, now = new Date() } = ctx;
  const teeOff = new Date(teeTime.tee_off);

  // Calculate or use provided timeUntilTeeOffMins
  const timeUntilTeeOffMins =
    ctx.timeUntilTeeOffMins !== undefined
      ? ctx.timeUntilTeeOffMins
      : (teeOff.getTime() - now.getTime()) / (1000 * 60);

  let stepLevel = 0;

  // Determine step level
  if (timeUntilTeeOffMins <= TIME_CONFIG.STEP_1_START) {
    if (timeUntilTeeOffMins > TIME_CONFIG.STEP_1_END) {
      stepLevel = 1;
    } else if (timeUntilTeeOffMins > TIME_CONFIG.STEP_2_END) {
      stepLevel = 2;
    } else if (timeUntilTeeOffMins > TIME_CONFIG.STEP_3_END) {
      stepLevel = 3;
    }
  }

  if (stepLevel > 0) {
    const stepAmount =
      basePrice >= TIME_CONFIG.HIGH_PRICE_THRESHOLD
        ? TIME_CONFIG.HIGH_PRICE_STEP_AMOUNT
        : TIME_CONFIG.LOW_PRICE_STEP_AMOUNT;

    const totalStepDiscount = stepLevel * stepAmount;

    factors.push({
      code: 'TIME_STEP',
      description: `Urgency Deal (Step ${stepLevel})`,
      amount: -totalStepDiscount,
      rate: Number((totalStepDiscount / basePrice).toFixed(3))
    });

    return {
      price: currentPrice - totalStepDiscount,
      stepLevel
    };
  }

  return { price: currentPrice, stepLevel: 0 };
}

// =====================================================
// Sales Layer (Slot Occupancy)
// =====================================================

function applySalesDiscount(
  ctx: PricingContext,
  currentPrice: number,
  factors: PricingResult['factors']
): { price: number; isPanicCandidate: boolean } {
  const { slotSalesRate } = ctx;

  // If no sales rate provided, skip
  if (slotSalesRate === undefined) {
    return { price: currentPrice, isPanicCandidate: false };
  }

  // High occupancy → no discount
  if (slotSalesRate >= SALES_CONFIG.HIGH_OCCUPANCY) {
    return { price: currentPrice, isPanicCandidate: false };
  }

  // Medium occupancy → 5% discount
  if (slotSalesRate >= SALES_CONFIG.MEDIUM_OCCUPANCY) {
    const discountAmount = Math.floor(currentPrice * SALES_CONFIG.MEDIUM_DISCOUNT_RATE);
    factors.push({
      code: 'SALES',
      description: SALES_CONFIG.MEDIUM_DISCOUNT_DESC,
      amount: -discountAmount,
      rate: SALES_CONFIG.MEDIUM_DISCOUNT_RATE
    });
    return {
      price: currentPrice - discountAmount,
      isPanicCandidate: false
    };
  }

  // Low occupancy → 10% discount + panic candidate
  const discountAmount = Math.floor(currentPrice * SALES_CONFIG.LOW_DISCOUNT_RATE);
  factors.push({
    code: 'SALES',
    description: SALES_CONFIG.LOW_DISCOUNT_DESC,
    amount: -discountAmount,
    rate: SALES_CONFIG.LOW_DISCOUNT_RATE
  });

  return {
    price: currentPrice - discountAmount,
    isPanicCandidate: true
  };
}

// =====================================================
// Segment Discount
// =====================================================

function applySegmentDiscount(
  ctx: PricingContext,
  currentPrice: number,
  factors: PricingResult['factors']
): number {
  const { user } = ctx;

  if (!user) return currentPrice;

  const segmentConfig = SEGMENT_CONFIG[user.segment as keyof typeof SEGMENT_CONFIG];
  if (!segmentConfig) return currentPrice;

  const discountAmount = Math.floor(currentPrice * segmentConfig.discountRate);
  factors.push({
    code: 'VIP_STATUS',
    description: segmentConfig.description,
    amount: -discountAmount,
    rate: segmentConfig.discountRate
  });

  return currentPrice - discountAmount;
}

// =====================================================
// LBS Discount
// =====================================================

function applyLBSDiscount(
  ctx: PricingContext,
  currentPrice: number,
  factors: PricingResult['factors']
): number {
  const { userDistanceKm } = ctx;

  if (userDistanceKm === undefined || userDistanceKm > LBS_CONFIG.MAX_DISTANCE_KM) {
    return currentPrice;
  }

  const discountAmount = Math.floor(currentPrice * LBS_CONFIG.DISCOUNT_RATE);
  factors.push({
    code: 'LBS_NEARBY',
    description: LBS_CONFIG.DESCRIPTION,
    amount: -discountAmount,
    rate: LBS_CONFIG.DISCOUNT_RATE
  });

  return currentPrice - discountAmount;
}

// =====================================================
// Discount Cap Enforcement
// =====================================================

function applyDiscountCap(
  currentPrice: number,
  basePrice: number,
  factors: PricingResult['factors']
): number {
  const maxDiscountAmount = Math.floor(basePrice * GOVERNANCE_CONFIG.MAX_DISCOUNT_RATE);
  const minPrice = basePrice - maxDiscountAmount;

  if (currentPrice < minPrice) {
    const adjustment = minPrice - currentPrice;
    factors.push({
      code: 'MAX_CAP',
      description: `Max Discount Cap (${GOVERNANCE_CONFIG.MAX_DISCOUNT_RATE * 100}%)`,
      amount: adjustment,
      rate: Number((adjustment / basePrice).toFixed(3))
    });
    return minPrice;
  }

  return currentPrice;
}

// =====================================================
// Panic Candidate Detection
// =====================================================

function detectPanicCandidate(
  ctx: PricingContext,
  salesPanic: boolean
): { isPanic: boolean; reason?: string } {
  const { teeTime, now = new Date(), slotSalesRate } = ctx;
  const teeOff = new Date(teeTime.tee_off);

  const timeUntilTeeOffMins =
    ctx.timeUntilTeeOffMins !== undefined
      ? ctx.timeUntilTeeOffMins
      : (teeOff.getTime() - now.getTime()) / (1000 * 60);

  // Check conditions
  const isWithinTimeWindow = timeUntilTeeOffMins <= PANIC_CONFIG.MAX_MINUTES_BEFORE_TEEOFF;
  const isLowOccupancy = slotSalesRate !== undefined && slotSalesRate < PANIC_CONFIG.MIN_SALES_RATE;
  const isOpen = teeTime.status === 'OPEN';

  if (!isWithinTimeWindow || !isOpen) {
    return { isPanic: false };
  }

  // Panic if sales-based panic OR low occupancy
  if (salesPanic || isLowOccupancy) {
    const reason =
      timeUntilTeeOffMins <= 10
        ? PANIC_CONFIG.URGENT_MESSAGE
        : PANIC_CONFIG.NORMAL_MESSAGE;

    return { isPanic: true, reason };
  }

  return { isPanic: false };
}

// =====================================================
// Main Pricing Engine
// =====================================================

export function calculatePricing(ctx: PricingContext): PricingResult {
  const { teeTime } = ctx;
  const basePrice = teeTime.base_price;

  const factors: PricingResult['factors'] = [];
  let currentPrice = basePrice;
  let isBlocked = false;
  let blockReason: string | undefined;
  let isPanicCandidate = false;
  let panicReason: string | undefined;

  // ===== LAYER 1: Weather (Blocking & Discount) =====
  const weatherResult = applyWeatherDiscount(ctx, currentPrice, factors);
  currentPrice = weatherResult.price;
  isBlocked = weatherResult.isBlocked;
  blockReason = weatherResult.blockReason;

  // If blocked, stop here
  if (isBlocked) {
    return {
      finalPrice: basePrice,
      basePrice,
      discountRate: 0,
      isBlocked,
      blockReason,
      factors: [],
      isPanicCandidate: false
    };
  }

  // ===== LAYER 2: Time (Fixed Discounts) =====
  const timeResult = applyTimeDiscount(ctx, currentPrice, basePrice, factors);
  currentPrice = timeResult.price;
  const stepLevel = timeResult.stepLevel;

  // ===== LAYER 3: Sales (Occupancy Discounts) =====
  const salesResult = applySalesDiscount(ctx, currentPrice, factors);
  currentPrice = salesResult.price;
  const salesPanic = salesResult.isPanicCandidate;

  // ===== LAYER 4: Segment Discount =====
  currentPrice = applySegmentDiscount(ctx, currentPrice, factors);

  // ===== LAYER 5: LBS Discount =====
  currentPrice = applyLBSDiscount(ctx, currentPrice, factors);

  // ===== LAYER 6: Discount Cap =====
  currentPrice = applyDiscountCap(currentPrice, basePrice, factors);

  // ===== LAYER 7: Panic Detection =====
  const panicResult = detectPanicCandidate(ctx, salesPanic);
  isPanicCandidate = panicResult.isPanic;
  panicReason = panicResult.reason;

  // Final safety
  if (currentPrice < GOVERNANCE_CONFIG.MIN_PRICE) {
    currentPrice = GOVERNANCE_CONFIG.MIN_PRICE;
  }

  // Calculate final discount rate
  const totalDiscount = basePrice - currentPrice;
  const discountRate = Number((totalDiscount / basePrice).toFixed(2));

  return {
    finalPrice: Math.floor(currentPrice),
    basePrice,
    discountRate,
    isBlocked: false,
    factors,
    isPanicCandidate,
    panicReason,
    stepStatus: {
      currentStep: stepLevel
    }
  };
}

// =====================================================
// Helper: Calculate Slot Sales Rate
// =====================================================

/**
 * Calculate sales rate for a specific golf club and time window
 * @param golfClubId - Golf club ID
 * @param date - Target date
 * @param supabase - Supabase client
 * @returns Sales rate (0~1) or undefined if error
 */
export async function calculateSlotSalesRate(
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
      console.error('[calculateSlotSalesRate] Error:', error);
      return undefined;
    }

    const totalSlots = teeTimes.length;
    const bookedSlots = teeTimes.filter((tt: any) => tt.status === 'BOOKED').length;

    if (totalSlots === 0) return 0;

    return bookedSlots / totalSlots;
  } catch (error) {
    console.error('[calculateSlotSalesRate] Exception:', error);
    return undefined;
  }
}
