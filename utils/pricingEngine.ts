import { Database, Json } from '../types/database';

type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type Weather = Database['public']['Tables']['weather_cache']['Row'];

export { type Json }; // Export Json to satisfy linter if imported but not used locally

export interface PricingContext {
  teeTime: TeeTime;
  user?: User;
  weather?: Weather;
  userDistanceKm?: number; // LBS (Optional)
  now?: Date; // For testing time travel
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
    amount: number;
    rate: number;
  }[];
  stepStatus?: {
    currentStep: number; // 0, 1, 2, 3
    nextStepAt?: string;
  };
  panicMode?: {
    active: boolean;
    minutesLeft: number;
    reason: string;
  };
}

// Deterministic Random (Seeded Linear Congruential Generator)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns float between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Returns integer between min and max (inclusive)
  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

export function calculatePricing(ctx: PricingContext): PricingResult {
  const { teeTime, user, weather, userDistanceKm } = ctx;
  const now = ctx.now || new Date();
  const teeOff = new Date(teeTime.tee_off);
  const basePrice = teeTime.base_price;
  
  const factors: PricingResult['factors'] = [];
  let currentPrice = basePrice;
  let isBlocked = false;
  let blockReason: string | undefined;

  // 1. Weather Blocking (Safety)
  // Policy: Rainfall >= 10mm -> Block
  if (weather && weather.rn1 >= 10) {
    isBlocked = true;
    blockReason = 'WEATHER_STORM';
    return {
      finalPrice: basePrice,
      basePrice,
      discountRate: 0,
      isBlocked,
      blockReason,
      factors: []
    };
  }

  // --- Step 1: Fixed Amount Discounts (Time/Step-down) ---
  
  // Policy: Starts 2 hours before tee-off. 3 Steps.
  // Intervals: 10-30 mins random.
  // Amount: >= 100k -> 10k/step, < 100k -> 5k/step.
  
  const timeUntilTeeOffMins = (teeOff.getTime() - now.getTime()) / (1000 * 60);
  const rng = new SeededRandom(teeTime.id);
  
  const step1Start = 120;
  const step1Duration = rng.range(10, 30);
  const step2Start = step1Start - step1Duration; 
  const step2Duration = rng.range(10, 30);
  const step3Start = step2Start - step2Duration; 

  const stepAmount = basePrice >= 100000 ? 10000 : 5000;
  let stepLevel = 0;

  if (timeUntilTeeOffMins <= step1Start) {
    if (timeUntilTeeOffMins > step2Start) stepLevel = 1;
    else if (timeUntilTeeOffMins > step3Start) stepLevel = 2;
    else stepLevel = 3;
  }

  if (stepLevel > 0) {
    const totalStepDiscount = stepLevel * stepAmount;
    currentPrice -= totalStepDiscount; // Apply Fixed Deduction
    factors.push({
      code: 'TIME_STEP',
      description: `Time Deal (Step ${stepLevel})`,
      amount: -totalStepDiscount,
      rate: Number((totalStepDiscount / basePrice).toFixed(3))
    });
  }

  // --- Step 2: Multiplicative Percentage Discounts ---
  // Formula: Price = PreviousPrice * (1 - Rate)
  
  // A. Weather Discount
  if (weather) {
    let weatherRate = 0;
    let weatherDesc = '';

    if (weather.rn1 >= 1 || weather.pop >= 60) {
      weatherRate = 0.20;
      weatherDesc = 'Rain Forecast (20%)';
    } else if (weather.pop >= 30) {
      weatherRate = 0.10;
      weatherDesc = 'Cloudy (10%)';
    }

    if (weatherRate > 0) {
      const discountAmount = Math.floor(currentPrice * weatherRate);
      currentPrice = currentPrice - discountAmount; // Multiplicative application
      factors.push({
        code: 'WEATHER',
        description: weatherDesc,
        amount: -discountAmount,
        rate: weatherRate
      });
    }
  }

  // B. User Segment Discount
  if (user && user.segment === 'PRESTIGE') {
    const rate = 0.05;
    const discountAmount = Math.floor(currentPrice * rate);
    currentPrice = currentPrice - discountAmount;
    factors.push({
      code: 'VIP_STATUS',
      description: 'PRESTIGE Member (5%)',
      amount: -discountAmount,
      rate
    });
  }

  // C. LBS Discount
  if (userDistanceKm !== undefined && userDistanceKm <= 15) {
    const rate = 0.10;
    const discountAmount = Math.floor(currentPrice * rate);
    currentPrice = currentPrice - discountAmount;
    factors.push({
      code: 'LBS_NEARBY',
      description: 'Local Resident (10%)',
      amount: -discountAmount,
      rate
    });
  }

  // --- Step 3: Governance (Max Cap & Floor) ---
  
  // Policy: Max 40% total discount from Base Price
  const maxDiscountAmount = Math.floor(basePrice * 0.40);
  const minPrice = basePrice - maxDiscountAmount;

  if (currentPrice < minPrice) {
    const adjustment = minPrice - currentPrice;
    currentPrice = minPrice;
    factors.push({
      code: 'MAX_CAP',
      description: 'Max Discount Cap (40%)',
      amount: adjustment, 
      rate: Number((adjustment / basePrice).toFixed(3))
    });
  }

  // Final Safety
  if (currentPrice < 0) currentPrice = 0;

  // --- Panic Mode Detection ---
  // Triggered when:
  // 1. Less than 30 minutes until tee-off
  // 2. Still OPEN (not booked)
  // 3. Randomly triggered (20% chance for drama)

  let panicMode: PricingResult['panicMode'] = {
    active: false,
    minutesLeft: Math.floor(timeUntilTeeOffMins),
    reason: ''
  };

  if (timeUntilTeeOffMins <= 30 && timeUntilTeeOffMins > 0) {
    // Deterministic "random" panic based on tee time ID
    const panicSeed = new SeededRandom(teeTime.id + 999);
    const shouldPanic = panicSeed.next() > 0.8; // 20% chance

    if (shouldPanic) {
      panicMode = {
        active: true,
        minutesLeft: Math.floor(timeUntilTeeOffMins),
        reason: timeUntilTeeOffMins <= 10
          ? '긴급! 곧 마감됩니다'
          : '공실 임박! 지금 예약하세요'
      };
    }
  }

  return {
    finalPrice: Math.floor(currentPrice), // Ensure integer
    basePrice,
    discountRate: Number(((basePrice - currentPrice) / basePrice).toFixed(2)),
    isBlocked: false,
    factors,
    stepStatus: {
      currentStep: stepLevel,
      nextStepAt: stepLevel < 3 ? new Date(teeOff.getTime() - (stepLevel === 0 ? step1Start : (stepLevel === 1 ? step2Start : step3Start)) * 60000).toISOString() : undefined
    },
    panicMode
  };
}