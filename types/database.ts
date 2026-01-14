// ==================================================================
// TUGOL 프로젝트 데이터베이스 타입 정의
// ==================================================================

// ------------------------------------------------------------------
// 1. ENUM 타입 정의
// ------------------------------------------------------------------

export type UserSegment = 'FUTURE' | 'PRESTIGE' | 'SMART' | 'CHERRY';

export type TeeTimeStatus = 'OPEN' | 'BOOKED' | 'BLOCKED';

// ------------------------------------------------------------------
// 2. Users 테이블 타입
// ------------------------------------------------------------------

export interface User {
  id: string; // UUID
  email: string;
  name: string;
  phone: string;
  user_segment: UserSegment;
  cherry_score: number;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  visit_count: number;
  avg_stay_time: number;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// 3. TeeTimes 테이블 타입
// ------------------------------------------------------------------

export interface TeeTime {
  id: number; // Integer based on usage
  tee_off: string; // ISO 8601 format
  base_price: number;
  status: TeeTimeStatus;
  
  // 예약 관련 (Reserved)
  reserved_by?: string | null; // User ID
  reserved_at?: string | null;

  // DB에 존재하는지 불확실하나 코드에서 사용될 수 있는 필드들 (Optional로 처리)
  current_price?: number;
  current_step?: number;
  next_step_at?: string;
  discount_reasons?: string[];
  weather_snapshot?: any;

  created_at?: string;
  updated_at?: string;
}

// ------------------------------------------------------------------
// 4. Reservations 테이블 타입
// ------------------------------------------------------------------

export interface Reservation {
  id: number; // Integer based on usage
  user_id: string;
  tee_time_id: number;
  final_price: number;
  discount_breakdown: any; // JSONB
  agreed_penalty: boolean;
  payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  created_at: string;
  updated_at?: string;
}

// ------------------------------------------------------------------
// 5. 프라이싱 관련 타입 (계산용)
// ------------------------------------------------------------------

export interface DiscountResult {
  finalPrice: number;
  totalDiscountRate: number;
  reasons: string[];
  breakdown: {
    weather?: number;
    time?: number;
    lbs?: number;
    segment?: number;
  };
}

export interface WeatherData {
  rainProb: number;
  rainfall?: number;
  temperature?: number;
  status: 'success' | 'api_error' | 'network_error';
  sky?: string; // Optional for UI
}

export interface LocationInfo {
  lat: number;
  lng: number;
  distanceToClub?: number;
  isNearby: boolean;
}

// ------------------------------------------------------------------
// 6. Supabase Database 타입
// ------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      tee_times: {
        Row: TeeTime;
        Insert: Omit<TeeTime, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TeeTime, 'id' | 'created_at' | 'updated_at'>>;
      };
      reservations: {
        Row: Reservation;
        Insert: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Reservation, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}