// ==================================================================
// TUGOL 프로젝트 데이터베이스 타입 정의
// 기획서 03 기반 (Users, TeeTimes, Reservations)
// ==================================================================

// ------------------------------------------------------------------
// 1. ENUM 타입 정의
// ------------------------------------------------------------------

/**
 * 사용자 세그먼트
 * - FUTURE: 신규 가입자 (데이터 부족)
 * - PRESTIGE: VIP 고객 (충성도 높음)
 * - SMART: 합리적 소비자
 * - CHERRY: 체리피커 (할인만 노림)
 */
export type UserSegment = 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY';

/**
 * 티타임 상태
 * - OPEN: 예약 가능
 * - BOOKED: 예약 완료
 * - BLOCKED: 기상 방어 (예약 차단)
 */
export type TeeTimeStatus = 'OPEN' | 'BOOKED' | 'BLOCKED';

// ------------------------------------------------------------------
// 2. Users 테이블 타입
// ------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;

  /** 사용자 세그먼트 (FUTURE, PRESTIGE, SMART, CHERRY) */
  user_segment: UserSegment;

  /** 체리피킹 성향 점수 (0~100, 높을수록 할인만 노림) */
  cherry_score: number;

  /** 위치 정보 (LBS) */
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };

  /** 활동 이력 */
  visit_count: number;
  avg_stay_time: number; // 평균 체류 시간 (분)

  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// 3. TeeTimes 테이블 타입
// ------------------------------------------------------------------

export interface TeeTime {
  id: string;

  /** 티오프 시간 (ISO 8601 format) */
  tee_off_time: string;

  /** 기본 가격 (정가) */
  base_price: number;

  /** 현재 최종 가격 */
  current_price: number;

  /** 티타임 상태 (OPEN, BOOKED, BLOCKED) */
  status: TeeTimeStatus;

  /** 현재 할인 단계 (0~3) */
  current_step: number;

  /** 다음 단계로 넘어가는 시간 (ISO 8601) */
  next_step_at?: string;

  /** 할인 적용 이유 */
  discount_reasons: string[];

  /** 기상 데이터 스냅샷 */
  weather_snapshot?: {
    rainProb: number; // 강수확률 (%)
    rainfall?: number; // 강수량 (mm)
    isBlocked: boolean; // 기상 방어 여부
  };

  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// 4. Reservations 테이블 타입
// ------------------------------------------------------------------

export interface Reservation {
  id: string;

  /** 사용자 ID */
  user_id: string;

  /** 티타임 ID */
  tee_time_id: string;

  /** 예약 시점의 최종 가격 */
  final_price: number;

  /** 할인 로그 (예약 시점 스냅샷) */
  discount_log: {
    weather?: number; // 날씨 할인 (-5000)
    time?: number;    // 임박 할인 (-10000)
    lbs?: number;     // 지역주민 할인 (-10000)
    segment?: number; // 세그먼트 할인 (-5000)
  };

  /** 우천 시 위약금 동의 여부 */
  agreed_penalty: boolean;

  /** 예약 상태 */
  reservation_status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';

  /** 결제 정보 */
  payment_info?: {
    method: string; // 'card', 'kakao_pay' 등
    transaction_id?: string;
    paid_at?: string;
  };

  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// 5. 프라이싱 관련 타입 (계산용)
// ------------------------------------------------------------------

/**
 * 할인 계산 결과
 */
export interface DiscountResult {
  /** 최종 가격 */
  finalPrice: number;

  /** 총 할인율 (0~1) */
  totalDiscountRate: number;

  /** 할인 사유 목록 */
  reasons: string[];

  /** 세부 할인 내역 */
  breakdown: {
    weather?: number;
    time?: number;
    lbs?: number;
    segment?: number;
  };
}

/**
 * 기상 데이터
 */
export interface WeatherData {
  rainProb: number;    // 강수확률 (%)
  rainfall?: number;   // 강수량 (mm)
  temperature?: number; // 기온 (°C)
  status: 'success' | 'api_error' | 'network_error';
}

/**
 * 사용자 위치 정보 (LBS)
 */
export interface LocationInfo {
  lat: number;
  lng: number;
  /** 골프장과의 거리 (km) */
  distanceToClub?: number;
  /** 15km 이내 여부 */
  isNearby: boolean;
}
