export type UserSegment = 'VIP' | 'Smart' | 'Base' | 'Cherry';

export interface WeatherData {
  sky: string;        // '맑음', '구름', '비', '눈'
  temperature: number; // 섭씨
  rainProb: number;    // %
  windSpeed: number;   // m/s
}

export interface PricingContext {
  teeOff: Date;           // 티오프 시간
  bookingTime: Date;      // 예약 시점 (현재 시간)
  basePriceInput?: number; // DB에 설정된 기본가가 있다면 사용
  weather: WeatherData;
  segment?: UserSegment;
}

export interface PricingResult {
  finalPrice: number;
  basePrice: number;
  reasons: string[];
  appliedRules: {
    layer: string;
    factor: number;
    amount: number;
    description: string;
  }[];
}

// === Constants & Policies ===
const POLICY = {
  // L1: Base Price (비수기 기준)
  BASE_WEEKDAY: 120000,
  BASE_WEEKEND: 160000,
  
  // 성수기 (3~6월, 9~11월)
  PEAK_MONTHS: [2, 3, 4, 5, 8, 9, 10], 
  PEAK_MULTIPLIER: 1.25,

  // Premium Slot (토요일 2부: 11시~14시)
  PREMIUM_HOUR_START: 11,
  PREMIUM_HOUR_END: 14,
  PREMIUM_SURCHARGE: 20000,

  // L2: Time (임박 할인)
  LMD_THRESHOLD_HOURS: 24,
  LMD_DISCOUNT_WEEKDAY: 0.85, // -15%
  LMD_DISCOUNT_WEEKEND: 0.95, // -5%

  // L3: Weather
  WEATHER_RAIN_PROB_THRESHOLD: 30, // %
  WEATHER_WIND_THRESHOLD: 8,       // m/s
  WEATHER_TEMP_HIGH: 33,
  WEATHER_TEMP_LOW: 0,
  WEATHER_DISCOUNT_RATE: 0.05,     // 5% 할인

  // L4: Segment
  SEGMENT_VIP_DISCOUNT: 5000,
  SEGMENT_CHERRY_PANIC_BLOCK: true,

  // L5: Floor
  FLOOR_PRICE: 50000,
};

/**
 * 다이내믹 프라이싱 계산 엔진
 */
export function calculateDynamicPrice(ctx: PricingContext): PricingResult {
  const { teeOff, bookingTime, weather, segment = 'Base' } = ctx;
  const reasons: string[] = [];
  const appliedRules: PricingResult['appliedRules'] = [];

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isPeakSeason = (date: Date) => POLICY.PEAK_MONTHS.includes(date.getMonth());

  // --- L1: Base Price ---
  let basePrice = isWeekend(teeOff) ? POLICY.BASE_WEEKEND : POLICY.BASE_WEEKDAY;
  
  if (isPeakSeason(teeOff)) {
    const surcharge = basePrice * (POLICY.PEAK_MULTIPLIER - 1);
    basePrice += surcharge;
  }

  // Premium Slot
  if (teeOff.getDay() === 6) {
    const hour = teeOff.getHours();
    if (hour >= POLICY.PREMIUM_HOUR_START && hour < POLICY.PREMIUM_HOUR_END) {
      basePrice += POLICY.PREMIUM_SURCHARGE;
    }
  }

  let currentPrice = basePrice;

  // --- L2: Time ---
  const hoursUntilTeeOff = (teeOff.getTime() - bookingTime.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilTeeOff < POLICY.LMD_THRESHOLD_HOURS && hoursUntilTeeOff > 0) {
    const discountRate = isWeekend(teeOff) 
      ? POLICY.LMD_DISCOUNT_WEEKEND 
      : POLICY.LMD_DISCOUNT_WEEKDAY;
    
    if (segment !== 'Cherry' || !POLICY.SEGMENT_CHERRY_PANIC_BLOCK) {
      const discountAmount = currentPrice * (1 - discountRate);
      currentPrice = Math.floor(currentPrice * discountRate);
      reasons.push('⚡️임박티켓');
      appliedRules.push({
        layer: 'L2_Time',
        factor: discountRate,
        amount: -discountAmount,
        description: '임박 할인 적용'
      });
    }
  }

  // --- L3: Weather ---
  let weatherDiscountApply = false;
  if (weather.rainProb >= POLICY.WEATHER_RAIN_PROB_THRESHOLD) weatherDiscountApply = true;
  if (weather.temperature >= POLICY.WEATHER_TEMP_HIGH || weather.temperature <= POLICY.WEATHER_TEMP_LOW) weatherDiscountApply = true;
  if (weather.windSpeed >= POLICY.WEATHER_WIND_THRESHOLD) weatherDiscountApply = true;

  if (weatherDiscountApply) {
    const discountAmount = currentPrice * POLICY.WEATHER_DISCOUNT_RATE;
    currentPrice -= discountAmount;
    reasons.push('⛅️기상할인');
    appliedRules.push({
      layer: 'L3_Weather',
      factor: 1 - POLICY.WEATHER_DISCOUNT_RATE,
      amount: -discountAmount,
      description: '기상 악조건 위로금'
    });
  }

  // --- L4: Segment ---
  if (segment === 'VIP') {
    currentPrice -= POLICY.SEGMENT_VIP_DISCOUNT;
    reasons.push('👑VIP혜택');
    appliedRules.push({
      layer: 'L4_Segment',
      factor: 1,
      amount: -POLICY.SEGMENT_VIP_DISCOUNT,
      description: 'VIP 등급 할인'
    });
  }

  // --- L5: Floor ---
  if (currentPrice < POLICY.FLOOR_PRICE) {
    const diff = POLICY.FLOOR_PRICE - currentPrice;
    currentPrice = POLICY.FLOOR_PRICE;
    appliedRules.push({
      layer: 'L5_Floor',
      factor: 1,
      amount: diff,
      description: '최저가 보정'
    });
  }

  currentPrice = Math.floor(currentPrice / 1000) * 1000;

  return {
    basePrice,
    finalPrice: currentPrice,
    reasons,
    appliedRules
  };
}