/**
 * SDD-03: Pricing Engine Configuration
 *
 * This file contains all configurable rules and thresholds for the pricing engine.
 * Adjust these values to fine-tune discount logic without modifying core code.
 */

// =====================================================
// Weather Layer Configuration
// =====================================================

export const WEATHER_CONFIG = {
  // Blocking thresholds (safety-first)
  BLOCK_RAINFALL_MM: 10,      // >= 10mm rainfall → block tee time
  BLOCK_POP_PERCENT: 70,       // >= 70% rain probability with heavy rain → block

  // Discount tiers
  TIERS: [
    {
      minRainfall: 5,           // 5mm ~ 10mm
      minPop: 60,               // >= 60% probability
      discountRate: 0.20,       // 20% discount
      description: 'Heavy Rain Forecast (20%)'
    },
    {
      minRainfall: 1,           // 1mm ~ 5mm
      minPop: 40,               // >= 40% probability
      discountRate: 0.10,       // 10% discount
      description: 'Light Rain Forecast (10%)'
    },
    {
      minRainfall: 0,           // No rainfall but cloudy
      minPop: 30,               // >= 30% probability
      discountRate: 0.05,       // 5% discount
      description: 'Cloudy Skies (5%)'
    }
  ]
} as const;

// =====================================================
// Time Layer Configuration (Urgency Discounts)
// =====================================================

export const TIME_CONFIG = {
  // Step thresholds (minutes before tee-off)
  STEP_1_START: 120,          // Discount starts 2 hours before
  STEP_1_END: 90,             // Step 1: 120~90 mins
  STEP_2_END: 60,             // Step 2: 90~60 mins
  STEP_3_END: 30,             // Step 3: 60~30 mins

  // Step amounts (fixed deductions)
  HIGH_PRICE_THRESHOLD: 100000,
  HIGH_PRICE_STEP_AMOUNT: 10000,  // >= 100k → -10k per step
  LOW_PRICE_STEP_AMOUNT: 5000,    // < 100k → -5k per step
} as const;

// =====================================================
// Sales Layer Configuration (Slot Occupancy)
// =====================================================

export const SALES_CONFIG = {
  // Sales rate thresholds (booked slots / total slots)
  HIGH_OCCUPANCY: 0.7,        // >= 70% → no discount (high demand)
  MEDIUM_OCCUPANCY: 0.4,      // 40% ~ 70% → 5% discount
  LOW_OCCUPANCY: 0.0,         // < 40% → 10% discount + panic candidate

  // Discount rates
  MEDIUM_DISCOUNT_RATE: 0.05, // 5% for medium occupancy
  LOW_DISCOUNT_RATE: 0.10,    // 10% for low occupancy

  // Descriptions
  MEDIUM_DISCOUNT_DESC: 'Low Demand Deal (5%)',
  LOW_DISCOUNT_DESC: 'Super Low Demand (10%)'
} as const;

// =====================================================
// Panic Mode Configuration
// =====================================================

export const PANIC_CONFIG = {
  // Trigger thresholds
  MAX_MINUTES_BEFORE_TEEOFF: 30,  // Panic only if <= 30 mins left
  MIN_SALES_RATE: 0.4,             // Panic if occupancy < 40%

  // Additional conditions
  REQUIRE_OPEN_STATUS: true,       // Only trigger for OPEN slots

  // Notification settings
  NOTIFICATION_PRIORITY: 1,        // Highest priority (1-10 scale)
  NOTIFICATION_EXPIRY_MINS: 60,    // Auto-delete after 1 hour

  // Messages
  URGENT_MESSAGE: '긴급! 곧 마감됩니다',
  NORMAL_MESSAGE: '공실 임박! 지금 예약하세요'
} as const;

// =====================================================
// Segment Discounts Configuration
// =====================================================

export const SEGMENT_CONFIG = {
  PRESTIGE: {
    discountRate: 0.05,         // 5% for PRESTIGE members
    description: 'PRESTIGE Member (5%)'
  },
  SMART: {
    discountRate: 0.03,         // 3% for SMART members
    description: 'SMART Member (3%)'
  },
  // CHERRY and FUTURE get no segment discount
} as const;

// =====================================================
// LBS (Location-Based Service) Configuration
// =====================================================

export const LBS_CONFIG = {
  MAX_DISTANCE_KM: 15,          // Within 15km
  DISCOUNT_RATE: 0.10,          // 10% discount
  DESCRIPTION: 'Local Resident (10%)'
} as const;

// =====================================================
// Global Pricing Governance
// =====================================================

export const GOVERNANCE_CONFIG = {
  // Maximum total discount from base price
  MAX_DISCOUNT_RATE: 0.40,      // 40% cap

  // Minimum price floor (optional)
  MIN_PRICE: 0,                 // Cannot go below 0 (duh!)

  // Rounding
  ROUND_TO_NEAREST: 100,        // Round to nearest 100 won (optional)
} as const;

// =====================================================
// Helper Types
// =====================================================

export type WeatherTier = typeof WEATHER_CONFIG.TIERS[number];
export type SegmentType = keyof typeof SEGMENT_CONFIG;
