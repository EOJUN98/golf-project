/**
 * SDD-05: Reservation Detail Types
 *
 * Types for reservation detail UI/UX including cancellation policy,
 * weather display, and status badges
 */

import { Database } from './database';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type TeeTime = Database['public']['Tables']['tee_times']['Row'];
type User = Database['public']['Tables']['users']['Row'];
type GolfClub = Database['public']['Tables']['golf_clubs']['Row'];

// Extended reservation with relations
export interface ReservationDetail {
  reservation: Reservation;
  teeTime: TeeTime;
  golfClub: GolfClub;
  user: User;
}

// Weather data from weather_condition JSONB
export interface WeatherData {
  rn1: number; // Rainfall in mm
  sky: 'SUNNY' | 'CLOUDY' | 'OVERCAST';
  pop: number; // Probability of precipitation (%)
  tmp: number; // Temperature
  fcstTime: string; // Forecast time
}

// Weather status for UI display
export type WeatherStatus = 'heavy-rain' | 'rain' | 'cloudy' | 'sunny' | 'unknown';

// Cancellation check result
export interface CancellationEligibility {
  canCancel: boolean;
  reason: string;
  hoursLeft: number;
  isImminentDeal: boolean;
  isUserSuspended: boolean;
  reservationStatus: Reservation['status'];
  cutoffHours: number;
}

// Status badge types
export type ReservationStatusBadge =
  | 'PAID'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'IMMINENT'
  | 'SUSPENDED'
  | 'REFUNDED'
  | 'COMPLETED';

export interface StatusBadgeConfig {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: string;
  description?: string;
}

// Policy display config
export interface PolicySection {
  title: string;
  content: string;
  variant: 'info' | 'warning' | 'danger';
  show: boolean;
}

// UI state for reservation detail
export interface ReservationDetailUIState {
  isLoading: boolean;
  showCancelModal: boolean;
  isCancelling: boolean;
  cancelError: string | null;
  weatherStatus: WeatherStatus;
  eligibility: CancellationEligibility | null;
}

// Props for components
export interface WeatherBadgeProps {
  weather: WeatherData | null;
  teeOff: string;
}

export interface StatusBadgesProps {
  reservation: Reservation;
  user: User;
  eligibility: CancellationEligibility | null;
}

export interface CancellationPolicyProps {
  reservation: Reservation;
  eligibility: CancellationEligibility | null;
  hoursLeft: number;
}

export interface CancellationButtonProps {
  reservation: Reservation;
  eligibility: CancellationEligibility | null;
  onCancel: () => void;
  isLoading: boolean;
}

// API response types
export interface GetReservationDetailResponse {
  success: boolean;
  data?: ReservationDetail & {
    weather: WeatherData | null;
    eligibility: CancellationEligibility;
  };
  error?: string;
}

export interface CancelReservationRequest {
  reservationId: string;
  userId: string;
  cancelReason?: string;
}

export interface CancelReservationResponse {
  success: boolean;
  message: string;
  refundAmount?: number;
  refundStatus?: 'pending' | 'completed' | 'failed';
  error?: string;
}
