/**
 * SDD-03 V2: Pricing Engine Configuration
 *
 * This file contains all configurable rules and thresholds for the pricing engine V2.
 * Adjust these values to fine-tune discount logic without modifying core code.
 */

// =====================================================
// Block Layer Configuration
// =====================================================

export const BLOCK_CONFIG = {
  // Blocking thresholds (safety-first)
  RAINFALL_THRESHOLD: 15,     // >= 15mm rainfall
  POP_THRESHOLD: 70,          // >= 70% rain probability
  BLOCK_REASON: 'WEATHER_STORM'
} as const;

// =====================================================
// Step Layer Configuration (Fixed Discounts)
// =====================================================

export const STEP_CONFIG = {
  // Time thresholds (minutes before tee-off)
  START_TIME: 120,            // Discount starts at T-120 mins
  STEP_1_END: 90,             // Step 1: 120~90 mins
  STEP_2_END: 60,             // Step 2: 90~60 mins
  STEP_3_END: 30,             // Step 3: 60~30 mins

  // Step amounts (fixed deductions)
  PRICE_THRESHOLD: 100000,    // Price threshold for step amount
  HIGH_STEP_AMOUNT: 10000,    // >= 100k → -10k per step
  LOW_STEP_AMOUNT: 5000       // < 100k → -5k per step
} as const;

// =====================================================
// Weather Discount Rate (Percentage Layer)
// =====================================================

export const WEATHER_RATE_CONFIG = {
  // RN1-based tiers
  TIER_HEAVY: {
    minRainfall: 10,          // >= 10mm (but < 15mm to avoid block)
    rate: 0.15,
    description: 'Heavy Rain (15%)'
  },
  TIER_MODERATE: {
    minRainfall: 5,           // 5~10mm
    rate: 0.10,
    description: 'Moderate Rain (10%)'
  },
  TIER_LIGHT: {
    minRainfall: 1,           // 1~5mm
    rate: 0.05,
    description: 'Light Rain (5%)'
  },
  TIER_NONE: {
    minRainfall: 0,           // < 1mm
    rate: 0,
    description: 'No Rain Discount'
  }
} as const;

// =====================================================
// Sales Discount Rate (Percentage Layer)
// =====================================================

export const SALES_RATE_CONFIG = {
  // Occupancy thresholds
  HIGH_OCCUPANCY: 0.7,        // >= 70%
  MEDIUM_OCCUPANCY: 0.4,      // >= 40%

  // Discount rates
  HIGH_RATE: 0,               // No discount
  MEDIUM_RATE: 0.05,          // 5% discount
  LOW_RATE: 0.10,             // 10% discount

  // Descriptions
  HIGH_DESC: 'High Demand (0%)',
  MEDIUM_DESC: 'Medium Demand (5%)',
  LOW_DESC: 'Low Demand (10%)'
} as const;

// =====================================================
// LBS Discount Rate (Percentage Layer)
// =====================================================

export const LBS_RATE_CONFIG = {
  // Distance thresholds
  NEAR_DISTANCE: 5,           // <= 5km
  MEDIUM_DISTANCE: 20,        // <= 20km

  // Discount rates
  NEAR_RATE: 0.10,            // 10% for <= 5km
  MEDIUM_RATE: 0.05,          // 5% for <= 20km
  FAR_RATE: 0,                // 0% for > 20km

  // Descriptions
  NEAR_DESC: 'Nearby Resident (10%)',
  MEDIUM_DESC: 'Local Area (5%)',
  FAR_DESC: 'No LBS Discount'
} as const;

// =====================================================
// Segment Discount Rate (Percentage Layer)
// =====================================================

export const SEGMENT_RATE_CONFIG = {
  FUTURE: {
    rate: 0,
    description: 'FUTURE Member (0%)'
  },
  SMART: {
    rate: 0.03,
    description: 'SMART Member (3%)'
  },
  PRESTIGE: {
    rate: 0.05,
    description: 'PRESTIGE Member (5%)'
  },
  CHERRY: {
    rate: -0.03,              // Penalty for CHERRY users
    description: 'CHERRY Member (-3%)'
  }
} as const;

// =====================================================
// Cap & Floor Configuration
// =====================================================

export const CAP_FLOOR_CONFIG = {
  MAX_DISCOUNT_RATE: 0.40,    // 40% maximum discount
  MIN_DISCOUNT_RATE: -0.05,   // -5% minimum (allows 5% penalty)
  MAX_CAP_DESC: 'Maximum Discount Cap (40%)',
  MIN_FLOOR_DESC: 'Minimum Floor (-5%)'
} as const;

// =====================================================
// Rounding Configuration
// =====================================================

export const ROUNDING_CONFIG = {
  ROUND_TO: 100,              // Round to nearest 100 won
  DESCRIPTION: 'Rounded to nearest 100'
} as const;

// =====================================================
// Panic Configuration
// =====================================================

export const PANIC_V2_CONFIG = {
  // Panic conditions
  MAX_TIME: 60,               // time <= 60 mins
  MIN_TIME: 30,               // time > 30 mins
  MAX_SALES_RATE: 0.4,        // salesRate < 40%

  // Messages
  PANIC_MESSAGE: 'Panic candidate detected',
  NO_PANIC_MESSAGE: 'Not a panic candidate'
} as const;

// =====================================================
// Helper Types
// =====================================================

export type SegmentType = keyof typeof SEGMENT_RATE_CONFIG;

// =====================================================
// Utility Functions
// =====================================================

/**
 * Round to nearest N
 */
export function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
