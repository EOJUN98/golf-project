// ==================================================================
// TUGOL 프라이싱 엔진 (Pricing Engine)
// 기획서 01 기반: 3단계 계단식 인하 + 기상 방어 + 결정론적 랜덤
// ==================================================================

import { differenceInMinutes, subMinutes, addMinutes, isBefore, isAfter } from 'date-fns';
import type { DiscountResult, WeatherData, LocationInfo, UserSegment } from '@/types/database';

// ------------------------------------------------------------------
// 설정값 (CONFIG)
// ------------------------------------------------------------------

const CONFIG = {
  /** 최대 할인율 (40%) */
  MAX_DISCOUNT_RATE: 0.4,

  /** 날씨 할인 */
  RAIN_DISCOUNT: 0.2,      // 비 예보 20%
  CLOUDY_DISCOUNT: 0.1,    // 흐림 10%

  /** LBS 할인 */
  LBS_DISCOUNT: 0.1,       // 15km 이내 10%

  /** 세그먼트 할인 */
  PRESTIGE_DISCOUNT: 0.05, // VIP 5%

  /** 기상 방어 기준 */
  WEATHER_BLOCK_THRESHOLD: 10, // 강수량 10mm 이상 시 차단

  /** 임박 할인 단계별 금액 */
  STEP_AMOUNT_HIGH: 10000,  // 10만원 이상 시 1만원/단계
  STEP_AMOUNT_LOW: 5000,    // 10만원 미만 시 5천원/단계
  PRICE_THRESHOLD: 100000,  // 단계 금액 기준
};

// ------------------------------------------------------------------
// 1. 결정론적 랜덤 (Deterministic Random)
// ------------------------------------------------------------------

/**
 * [핵심] 시드 기반 랜덤 함수
 *
 * 티오프 시간이 같으면 항상 같은 결과를 반환
 * Math.random() 대신 시드를 사용하여 재현 가능한 랜덤 생성
 *
 * @param seed - 시드 값 (티오프 시간의 타임스탬프)
 * @returns 0~1 사이의 랜덤 값
 */
const getSeededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * [핵심] 랜덤 가격 인하 스케줄 생성기
 *
 * 티오프 시간을 기준으로 가격 인하 시점들을 미리 계산
 * 10분~30분 랜덤 간격으로 인하 시점 생성
 *
 * @param teeOffTime - 티오프 시간 (Date 객체)
 * @returns 가격 인하 시점 배열 (Date[])
 */
const getDropSchedule = (teeOffTime: Date): Date[] => {
  const schedule: Date[] = [];
  let pivotTime = subMinutes(teeOffTime, 120); // 2시간 전부터 시작
  let seedBase = teeOffTime.getTime(); // 타임스탬프를 시드로 사용

  while (isBefore(pivotTime, teeOffTime)) {
    const randomVal = getSeededRandom(seedBase);
    // 10분 ~ 30분 사이 랜덤 간격
    const interval = Math.floor(randomVal * (30 - 10 + 1) + 10);

    pivotTime = addMinutes(pivotTime, interval);
    seedBase += 1; // 다음 루프를 위해 시드 변경

    if (isBefore(pivotTime, teeOffTime)) {
      schedule.push(pivotTime);
    }
  }

  return schedule;
};

/**
 * 현재 시간 기준 현재 할인 단계 계산
 *
 * @param teeOffTime - 티오프 시간 (Date 객체)
 * @param now - 현재 시간 (Date 객체)
 * @returns 현재 단계 (0~3)
 */
const getCurrentStep = (teeOffTime: Date, now: Date): number => {
  const schedule = getDropSchedule(teeOffTime);

  // 현재 시간보다 이전 시점들만 카운트
  const passedSteps = schedule.filter(stepTime => isBefore(stepTime, now));

  // 최대 3단계
  return Math.min(passedSteps.length, 3);
};

/**
 * 다음 할인 단계로 넘어가는 시간 계산
 *
 * @param teeOffTime - 티오프 시간
 * @param now - 현재 시간
 * @returns 다음 단계 시간 (없으면 null)
 */
const getNextStepTime = (teeOffTime: Date, now: Date): Date | null => {
  const schedule = getDropSchedule(teeOffTime);

  // 현재 시간보다 이후 시점 중 가장 가까운 것
  const futureSteps = schedule.filter(stepTime => isAfter(stepTime, now));

  return futureSteps.length > 0 ? futureSteps[0] : null;
};

// ------------------------------------------------------------------
// 2. 기상 방어 (Weather Blocking)
// ------------------------------------------------------------------

/**
 * 기상 조건으로 티타임 차단 여부 판단
 *
 * 조건: 티오프 시간 기준 2시간 연속 강수량 10mm 이상
 *
 * @param weather - 기상 데이터
 * @returns true면 예약 차단
 */
export function shouldBlockTeeTime(weather: WeatherData): boolean {
  if (weather.status !== 'success') return false;

  // 강수량 10mm 이상 시 차단
  if (weather.rainfall && weather.rainfall >= CONFIG.WEATHER_BLOCK_THRESHOLD) {
    return true;
  }

  return false;
}

// ------------------------------------------------------------------
// 3. 단계별 할인 금액 계산
// ------------------------------------------------------------------

/**
 * 현재 단계에 따른 할인 금액 계산
 *
 * @param basePrice - 기본 가격
 * @param step - 현재 단계 (0~3)
 * @returns 할인 금액
 */
function calculateStepDiscount(basePrice: number, step: number): number {
  if (step === 0) return 0;

  const stepAmount = basePrice >= CONFIG.PRICE_THRESHOLD
    ? CONFIG.STEP_AMOUNT_HIGH
    : CONFIG.STEP_AMOUNT_LOW;

  return stepAmount * step;
}

// ------------------------------------------------------------------
// 4. 종합 할인 계산 (메인 함수)
// ------------------------------------------------------------------

/**
 * 모든 할인 요소를 종합하여 최종 가격 계산
 *
 * @param params - 계산 파라미터
 * @returns 할인 계산 결과
 */
export function calculatePrice(params: {
  basePrice: number;
  teeOffTime: string | Date;
  weather: WeatherData;
  location?: LocationInfo;
  userSegment?: UserSegment;
  now?: Date; // 현재 시간 (테스트용, 없으면 new Date() 사용)
}): DiscountResult & { currentStep: number; nextStepAt: string | null } {
  const { basePrice, weather, location, userSegment } = params;

  // teeOffTime을 Date 객체로 변환
  const teeOffTime = typeof params.teeOffTime === 'string'
    ? new Date(params.teeOffTime)
    : params.teeOffTime;

  const now = params.now || new Date();

  let totalDiscountRate = 0;
  const reasons: string[] = [];
  const breakdown: DiscountResult['breakdown'] = {};

  // (1) 날씨 할인
  if (weather.status === 'success') {
    if (weather.rainProb >= 60) {
      totalDiscountRate += CONFIG.RAIN_DISCOUNT;
      breakdown.weather = Math.round(basePrice * CONFIG.RAIN_DISCOUNT);
      reasons.push(`☔️ 비 예보(${weather.rainProb}%)`);
    } else if (weather.rainProb >= 30) {
      totalDiscountRate += CONFIG.CLOUDY_DISCOUNT;
      breakdown.weather = Math.round(basePrice * CONFIG.CLOUDY_DISCOUNT);
      reasons.push(`☁️ 흐림(${weather.rainProb}%)`);
    }
  }

  // (2) 임박 할인 (3단계 계단식 - 결정론적 랜덤)
  const currentStep = getCurrentStep(teeOffTime, now);
  const nextStepTime = getNextStepTime(teeOffTime, now);

  if (currentStep > 0) {
    const stepDiscount = calculateStepDiscount(basePrice, currentStep);
    breakdown.time = stepDiscount;
    reasons.push(`⏰ 임박 티 (${currentStep}단계)`);

    // 비율로 환산
    totalDiscountRate += stepDiscount / basePrice;
  }

  // (3) LBS 할인
  if (location?.isNearby) {
    totalDiscountRate += CONFIG.LBS_DISCOUNT;
    breakdown.lbs = Math.round(basePrice * CONFIG.LBS_DISCOUNT);
    reasons.push('📍 이웃 할인');
  }

  // (4) 세그먼트 할인 (PRESTIGE만)
  if (userSegment === 'PRESTIGE') {
    totalDiscountRate += CONFIG.PRESTIGE_DISCOUNT;
    breakdown.segment = Math.round(basePrice * CONFIG.PRESTIGE_DISCOUNT);
    reasons.push('👑 VIP 할인');
  }

  // (5) 최대 할인율 제한
  if (totalDiscountRate > CONFIG.MAX_DISCOUNT_RATE) {
    totalDiscountRate = CONFIG.MAX_DISCOUNT_RATE;
    reasons.push('🛡 최대 할인 한도 적용');
  }

  // 최종 가격 계산 (1,000원 단위로 반올림)
  const finalPrice = Math.round((basePrice * (1 - totalDiscountRate)) / 1000) * 1000;

  return {
    finalPrice,
    totalDiscountRate,
    reasons,
    breakdown,
    currentStep,
    nextStepAt: nextStepTime ? nextStepTime.toISOString() : null,
  };
}

// ------------------------------------------------------------------
// 5. 패닉 모드 판정
// ------------------------------------------------------------------

/**
 * 패닉 모드 조건 확인
 *
 * 조건:
 * 1. 티오프 1시간 전까지 미판매
 * 2. 사용자 위치가 반경 15km 이내
 *
 * @param teeOffTime - 티오프 시간 (string | Date)
 * @param isBooked - 예약 여부
 * @param location - 사용자 위치
 * @param now - 현재 시간 (선택, 테스트용)
 * @returns 패닉 모드 여부
 */
export function isPanicMode(
  teeOffTime: string | Date,
  isBooked: boolean,
  location?: LocationInfo,
  now?: Date
): boolean {
  if (isBooked) return false;
  if (!location?.isNearby) return false;

  const teeOff = typeof teeOffTime === 'string' ? new Date(teeOffTime) : teeOffTime;
  const currentTime = now || new Date();

  const minutesLeft = differenceInMinutes(teeOff, currentTime);

  return minutesLeft <= 60;
}

// ------------------------------------------------------------------
// 6. 유틸리티 함수
// ------------------------------------------------------------------

/**
 * 할인율을 퍼센트로 변환
 */
export function toPercentage(rate: number): number {
  return Math.round(rate * 100);
}

/**
 * 가격을 원화 포맷으로 변환
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

/**
 * 현재 할인 단계만 계산 (외부 사용용)
 */
export function calculateCurrentStep(teeOffTime: string | Date, now?: Date): {
  currentStep: number;
  nextStepAt: string | null;
} {
  const teeOff = typeof teeOffTime === 'string' ? new Date(teeOffTime) : teeOffTime;
  const currentTime = now || new Date();

  const step = getCurrentStep(teeOff, currentTime);
  const nextStep = getNextStepTime(teeOff, currentTime);

  return {
    currentStep: step,
    nextStepAt: nextStep ? nextStep.toISOString() : null,
  };
}
