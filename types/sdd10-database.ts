/**
 * SDD-10: Extended Database Types
 *
 * New tables and fields for:
 * - No-Show Prevention
 * - Segment System
 * - Data-Driven Discounts
 * - Virtual Payment
 * - MY Page Enhanced UX
 */

import type { Json } from './database';

// ============================================================================
// SEGMENT SYSTEM
// ============================================================================

export type SegmentType = 'PRESTIGE' | 'SMART' | 'CHERRY' | 'FUTURE';

export interface UserSegmentHistory {
  id: number;
  user_id: string;
  old_segment: SegmentType | null;
  new_segment: SegmentType;
  segment_score: number;
  change_reason: string | null;
  changed_by: string | null;
  changed_at: string;
  calculation_details: SegmentCalculationDetails;
}

export interface SegmentCalculationDetails {
  value_score: number;
  frequency_score: number;
  recency_score: number;
  loyalty_score: number;
  cherry_penalty: number;
  total_score: number;
  cherry_score: number;
  calculated_at: string;
}

export interface CrmSegmentOverride {
  id: number;
  user_id: string;
  override_segment: SegmentType;
  reason: string;
  valid_from: string;
  valid_until: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

// ============================================================================
// NO-SHOW PREVENTION
// ============================================================================

export interface RiskFactors {
  [key: string]: number | undefined;
  segment_modifier: number;
  no_show_history: number;
  consecutive_penalty: number;
  cancellation_rate: number;
  imminent_booking_penalty?: number;
  time_slot_risk?: number;
  total_risk_score: number;
}

export interface UserRiskProfile {
  user_id: string;
  no_show_count: number;
  no_show_risk_score: number;
  consecutive_no_shows: number;
  last_no_show_at: string | null;
  total_cancellations: number;
  cancellation_rate: number;
}

export interface ReservationRiskAssessment {
  risk_score: number;
  risk_factors: RiskFactors;
  precheck_required: boolean;
  penalty_agreement_required: boolean;
  restrictions: {
    can_book: boolean;
    requires_precheck: boolean;
    requires_penalty_agreement: boolean;
    max_concurrent_bookings: number;
  };
}

// ============================================================================
// DATA-DRIVEN DISCOUNTS
// ============================================================================

export interface TeeTimeStats {
  id: number;
  tee_time_id: number;
  golf_club_id: number;

  // Time characteristics
  day_of_week: number; // 0=Sunday, 6=Saturday
  hour_of_day: number;
  is_weekend: boolean;
  is_holiday: boolean;

  // Statistics
  total_views: number;
  total_bookings: number;
  total_cancellations: number;
  total_no_shows: number;

  // Pricing
  avg_final_price: number;
  avg_discount_rate: number;
  base_price: number;

  // Performance
  booking_rate: number; // bookings / views
  vacancy_rate: number; // empty slots / total slots
  no_show_rate: number;

  // Metadata
  calculated_at: string;
  stats_period_start: string;
  stats_period_end: string;
}

export interface DataDrivenAdjustment {
  base_adjustment: number;
  vacancy_factor: number;
  booking_rate_factor: number;
  segment_factor: number;
  weather_factor: number;
  lbs_factor: number;
  final_adjustment: number;
  reasons: string[];
}

// ============================================================================
// VIRTUAL PAYMENT
// ============================================================================

export type PaymentMode = 'REAL' | 'VIRTUAL' | 'TEST';

export interface VirtualPaymentReference {
  transaction_id: string;
  timestamp: string;
  method: 'VIRTUAL_CARD' | 'VIRTUAL_TRANSFER' | 'TEST';
  status: 'AUTHORIZED' | 'CAPTURED' | 'CANCELLED';
}

export interface PaymentMetadata {
  payment_mode: PaymentMode;
  virtual_reference?: VirtualPaymentReference;
  toss_payment_key?: string;
  custom_data?: Record<string, Json>;
}

// ============================================================================
// MY PAGE: USER STATS
// ============================================================================

export type HandicapTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';
export type TeeBox = 'BLACK' | 'BLUE' | 'WHITE' | 'RED';
export type PreferredTimeSlot = 'MORNING' | 'AFTERNOON' | 'TWILIGHT';

export interface UserStats {
  id: number;
  user_id: string;

  // Playing statistics
  total_rounds: number;
  completed_rounds: number;
  avg_score: number | null;
  best_score: number | null;
  worst_score: number | null;

  // Skill metrics
  handicap: number | null;
  handicap_trend: HandicapTrend | null;
  driving_distance: number | null; // meters
  fairway_accuracy: number | null; // percentage
  gir_rate: number | null; // greens in regulation
  putting_avg: number | null; // putts per hole

  // Preferences
  preferred_tee_box: TeeBox | null;
  preferred_time_slot: PreferredTimeSlot | null;
  preferred_day_of_week: number[] | null;

  // Behavioral
  avg_booking_lead_time: number | null; // days
  favorite_club_ids: number[] | null;
  booking_frequency: number | null; // bookings per month

  updated_at: string;
}

// ============================================================================
// MY PAGE: ROUNDS
// ============================================================================

export interface Round {
  id: number;
  user_id: string;
  reservation_id: string | null;
  golf_club_id: number;
  course_id: number | null;

  // Round details
  played_at: string;
  tee_box: TeeBox | null;
  total_score: number;
  front_nine: number | null;
  back_nine: number | null;

  // Performance
  fairways_hit: number | null;
  greens_in_regulation: number | null;
  total_putts: number | null;
  penalties: number | null;

  // Conditions
  weather_condition: string | null;
  wind_speed: number | null; // km/h
  temperature: number | null; // celsius

  // Metadata
  playing_partners: string[] | null;
  notes: string | null;
  scorecard_image_url: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// MY PAGE: MEMBERSHIP & LOYALTY
// ============================================================================

export type MembershipType = 'GOLD' | 'SILVER' | 'BRONZE' | 'FREE';

export interface UserMembership {
  id: number;
  user_id: string;
  membership_type: MembershipType;
  tier_level: number;
  points_balance: number;
  points_lifetime: number;
  valid_from: string;
  valid_until: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MY PAGE: PAYMENT METHODS
// ============================================================================

export type PaymentMethodType = 'CARD' | 'BANK_TRANSFER' | 'TOSS_PAY';

export interface UserPaymentMethod {
  id: number;
  user_id: string;
  payment_type: PaymentMethodType;
  payment_provider: string | null;
  masked_number: string; // e.g., "**** **** **** 1234"
  nickname: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

// ============================================================================
// MY PAGE: GIFTS & VOUCHERS
// ============================================================================

export type GiftType = 'VOUCHER' | 'DISCOUNT_COUPON' | 'FREE_ROUND';

export interface UserGift {
  id: number;
  user_id: string;
  gift_type: GiftType;
  gift_name: string | null;
  gift_value: number | null;
  discount_rate: number | null;
  valid_from: string;
  valid_until: string | null;
  is_used: boolean;
  used_at: string | null;
  used_for_reservation_id: string | null;
  created_at: string;
}

// ============================================================================
// COURSE ENHANCEMENTS
// ============================================================================

export type GreenType = 'BENT' | 'BERMUDA' | 'MIXED';

export interface HoleDetail {
  hole_number: number;
  par: number;
  handicap: number;
  yardage: {
    black?: number;
    blue?: number;
    white?: number;
    red?: number;
  };
}

export interface GolfCourseEnhanced {
  id: number;
  golf_club_id: number;
  name: string;
  holes: number;

  // Enhanced fields from SDD-10
  total_length_meters: number | null;
  total_length_yards: number | null;
  slope_rating: number | null;
  course_rating: number | null;
  green_speed: number | null; // stimpmeter
  green_type: GreenType | null;
  course_map_url: string | null;
  course_overview: string | null;
  hole_details: HoleDetail[] | null;

  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// COURSE NOTICES
// ============================================================================

export type NoticeType = 'MAINTENANCE' | 'TOURNAMENT' | 'CLOSURE' | 'WEATHER' | 'OTHER';
export type NoticeSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CourseNotice {
  id: number;
  golf_club_id: number;
  course_id: number | null;
  notice_type: NoticeType;
  severity: NoticeSeverity;
  title: string;
  description: string | null;
  affected_holes: number[] | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// EXTENDED USER TYPE (includes SDD-10 fields)
// ============================================================================

export interface UserExtended {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;

  // Segment fields (SDD-10)
  segment_type: SegmentType;
  segment_score: number;
  segment_calculated_at: string;
  segment_override_by: string | null;
  segment_override_at: string | null;
  segment_override_reason: string | null;
  cherry_score: number;

  // Risk fields (SDD-10)
  no_show_count: number;
  no_show_risk_score: number;
  consecutive_no_shows: number;
  last_no_show_at: string | null;
  total_cancellations: number;
  cancellation_rate: number;

  // Existing fields
  total_bookings: number;
  total_spent: number;
  avg_booking_value: number;

  // Location
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  distance_to_club_km: number | null;

  // Admin
  is_admin: boolean;
  is_super_admin: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;

  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// EXTENDED RESERVATION TYPE (includes SDD-10 fields)
// ============================================================================

export interface ReservationExtended {
  id: string;
  tee_time_id: number;
  user_id: string;
  base_price: number;
  final_price: number;
  discount_breakdown: Json | null;

  // Payment fields (SDD-10)
  payment_mode: PaymentMode;
  payment_key: string | null;
  payment_reference: string | null;
  payment_status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  payment_metadata: PaymentMetadata | null;
  paid_amount: number;

  // Risk fields (SDD-10)
  risk_score: number;
  risk_factors: RiskFactors | null;
  precheck_required: boolean;
  precheck_completed_at: string | null;
  precheck_method: string | null;
  penalty_agreement_signed: boolean;
  penalty_agreement_signed_at: string | null;

  // Status
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'NO_SHOW' | 'COMPLETED';
  is_imminent_deal: boolean;

  // Cancellation
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_amount: number;
  no_show_marked_at: string | null;

  // Policy
  policy_version: string;
  settlement_id: string | null;

  created_at: string;
}

// ============================================================================
// PRICING ENGINE V2 TYPES
// ============================================================================

export interface PricingEngineV2Input {
  teeTime: {
    id: number;
    tee_off: string;
    base_price: number;
    golf_club_id: number;
  };
  user?: {
    segment_type: SegmentType;
    location_lat: number | null;
    location_lng: number | null;
  };
  weather?: {
    pop: number; // probability of precipitation
    rn1: number; // rainfall
    wsd: number; // wind speed
  };
  stats?: TeeTimeStats; // Historical data for this slot
}

export interface PricingEngineV2Output {
  final_price: number;
  base_price: number;
  total_discount_rate: number;
  breakdown: {
    weather_discount: number;
    time_discount: number;
    lbs_discount: number;
    segment_discount: number;
    data_driven_adjustment: number;
  };
  data_driven_details: DataDrivenAdjustment;
  reasons: string[];
  risk_assessment?: ReservationRiskAssessment;
}

// ============================================================================
// SERVER ACTION TYPES
// ============================================================================

export interface CreateVirtualReservationInput {
  tee_time_id: number;
  user_id: string;
  final_price: number;
  discount_breakdown: Json;
  is_imminent_deal: boolean;
  penalty_agreement_signed?: boolean;
}

export interface CreateVirtualReservationResult {
  success: boolean;
  reservation_id?: string;
  error?: string;
  risk_assessment?: ReservationRiskAssessment;
}

export interface CalculateRiskScoreInput {
  user_id: string;
  tee_time_id: number;
  is_imminent_deal: boolean;
}

export interface CalculateRiskScoreResult {
  user_risk_score: number;
  reservation_risk_score: number;
  risk_factors: RiskFactors;
  restrictions: {
    can_book: boolean;
    requires_precheck: boolean;
    requires_penalty_agreement: boolean;
    max_concurrent_bookings: number;
  };
}

// ============================================================================
// MY PAGE COMPOSITE TYPES
// ============================================================================

export interface UserProfile {
  user: UserExtended;
  stats: UserStats;
  membership: UserMembership | null;
  recent_rounds: Round[];
  active_gifts: UserGift[];
}

export interface ReservationDetail {
  reservation: ReservationExtended;
  tee_time: {
    id: number;
    tee_off: string;
    base_price: number;
    status: string;
  };
  golf_club: {
    id: number;
    name: string;
    location_name: string;
  };
  course: GolfCourseEnhanced | null;
  notices: CourseNotice[];
  weather_forecast: {
    pop: number;
    rn1: number;
    wsd: number;
    sky: number;
  } | null;
}
